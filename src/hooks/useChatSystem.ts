/**
 * useChatSystem — 系统终端对话 Hook
 *
 * 与 OpenClaw Gateway 对话，系统口吻回复宿主
 * 支持动态上下文注入（场景感知 + 记忆种子 + 交互摘要）
 */

import { useState, useCallback, useRef } from 'react'
import type { DimensionData } from '../App'
import type { Quest } from './useGameState'
import type { SceneContext } from '../core/contextEngine'
import { buildDynamicContext } from '../core/contextEngine'
import { loadMemorySeeds } from '../core/memorySeeds'
import { loadSummary, saveSummary, buildSummaryExtractionPrompt } from '../core/interactionSummary'
import type { InteractionSummary } from '../core/interactionSummary'

export interface ChatMessage {
  id: string
  role: 'system' | 'user'
  content: string
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
}

interface GameContext {
  dimensions: DimensionData[]
  quests: Quest[]
  streak: number
  playerLevel: number
  scene: SceneContext
}

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const STORAGE_KEY = 'earth-online-chat-history'
const MAX_HISTORY = 30

function buildSystemPrompt(ctx: GameContext): string {
  return buildDynamicContext({
    scene: ctx.scene,
    summary: loadSummary(),
    memorySeeds: loadMemorySeeds(),
    dimensions: ctx.dimensions,
    quests: ctx.quests,
    streak: ctx.streak,
    playerLevel: ctx.playerLevel,
  })
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const msgs = JSON.parse(raw) as ChatMessage[]
    // Only keep today's messages
    const today = new Date().toISOString().slice(0, 10)
    return msgs.filter(m => new Date(m.timestamp).toISOString().slice(0, 10) === today)
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
  } catch { /* quota */ }
}

export function useChatSystem(gameContext: GameContext) {
  const [state, setState] = useState<ChatState>({
    messages: loadHistory(),
    loading: false,
    error: null,
  })
  const [streamingContent, setStreamingContent] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const messageCountRef = useRef(0)
  const summarizingRef = useRef(false)

  // ─── 消息注入（带去重） ───
  const injectMessage = useCallback((msg: { role: 'user' | 'system'; content: string }) => {
    setState(prev => {
      // 去重：如果最后一条消息内容完全相同则跳过
      const last = prev.messages[prev.messages.length - 1]
      if (last && last.content === msg.content && last.role === msg.role) {
        return prev
      }
      const chatMsg: ChatMessage = {
        id: `msg-${Date.now()}-${msg.role === 'user' ? 'user' : 'sys'}-${Math.random().toString(36).slice(2, 6)}`,
        role: msg.role,
        content: msg.content,
        timestamp: Date.now(),
      }
      return {
        ...prev,
        messages: [...prev.messages, chatMsg],
      }
    })
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      loading: true,
      error: null,
    }))
    setStreamingContent('')

    // Abort previous request if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Build conversation history for context (last 10 messages)
      const recentHistory = [...state.messages.slice(-10), userMsg]
      const apiMessages = [
        { role: 'system' as const, content: buildSystemPrompt(gameContext) },
        ...recentHistory.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
      ]

      const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Gateway ${response.status}`)

      // 尝试流式解析
      const contentType = response.headers.get('content-type') || ''
      let fullContent = ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // SSE streaming
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                setStreamingContent(fullContent)
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await response.json()
        fullContent = data.choices?.[0]?.message?.content ?? '信号中断，请重试。'
        setStreamingContent(fullContent)
      }

      // 流结束，写入最终消息
      setStreamingContent('')
      const sysMsg: ChatMessage = {
        id: `msg-${Date.now()}-sys`,
        role: 'system',
        content: fullContent || '信号中断，请重试。',
        timestamp: Date.now(),
      }

      setState(prev => {
        const newMessages = [...prev.messages, sysMsg]
        saveHistory(newMessages)

        // 每 5 条消息触发一次交互摘要更新（后台，不阻塞）
        messageCountRef.current++
        if (messageCountRef.current >= 5 && !summarizingRef.current) {
          messageCountRef.current = 0
          updateInteractionSummary(newMessages)
        }

        return { messages: newMessages, loading: false, error: null }
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return

      setStreamingContent('')
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-sys`,
        role: 'system',
        content: '通信链路不稳定，请稍后重试。',
        timestamp: Date.now(),
      }

      setState(prev => {
        const newMessages = [...prev.messages, fallbackMsg]
        saveHistory(newMessages)
        return { messages: newMessages, loading: false, error: (err as Error).message }
      })
    }
  }, [state.messages, gameContext])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ messages: [], loading: false, error: null })
  }, [])

  // ─── 交互摘要自动更新（后台 AI 调用，不阻塞聊天） ───
  const updateInteractionSummary = useCallback(async (messages: ChatMessage[]) => {
    if (summarizingRef.current) return
    summarizingRef.current = true

    try {
      const recent = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const prompt = buildSummaryExtractionPrompt(recent)

      const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex',
          messages: [
            { role: 'system', content: '你是一个对话分析助手。分析对话并严格按要求的 JSON 格式返回结果。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 256,
          stream: false,
        }),
      })

      if (!response.ok) return

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''

      // 尝试解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<InteractionSummary>
        const summary: InteractionSummary = {
          topics: parsed.topics || [],
          commitments: parsed.commitments || [],
          emotionalState: parsed.emotionalState || '',
          lastUpdated: Date.now(),
        }
        saveSummary(summary)
      }
    } catch {
      // 摘要更新失败不影响主流程
    } finally {
      summarizingRef.current = false
    }
  }, [])

  return {
    messages: state.messages,
    loading: state.loading,
    streamingContent,
    error: state.error,
    sendMessage,
    clearHistory,
    injectMessage,
  }
}
