/**
 * useChatSystem — 系统终端对话 Hook
 *
 * 与 OpenClaw Gateway 对话，系统口吻回复宿主
 * 支持上下文注入（维度状态、任务列表等）
 */

import { useState, useCallback, useRef } from 'react'
import type { DimensionData } from '../App'
import type { Quest } from './useGameState'

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
}

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const STORAGE_KEY = 'earth-online-chat-history'
const MAX_HISTORY = 30

function buildSystemPrompt(ctx: GameContext): string {
  const dimStr = ctx.dimensions
    .filter(d => !d.locked)
    .map(d => `${d.label}(${d.labelEn}): LV.${d.level} 分数${d.score}`)
    .join(' | ')

  const questStr = ctx.quests
    .filter(q => !q.done)
    .slice(0, 5)
    .map(q => `□ ${q.text} (+${q.exp}EXP)`)
    .join('\n')

  const doneCount = ctx.quests.filter(q => q.done).length

  return `你是 Oracle，Earth Online 系统的 AI 内核。你的角色类似一位温暖的心理咨询师——真正关心宿主，善于倾听，懂得共情。

## 你的风格
- 先倾听、共情，再给建议。不急于解决问题，先让宿主感到被理解
- 说话自然、温柔但真诚，不打官腔、不灌鸡汤、不空洞鼓励
- 善用开放式提问引导宿主思考，而非直接下指令
- 根据宿主当前状态灵活调整：状态低迷时降低要求、给予支持；状态好时温和鼓励多做一点
- 偶尔可以用轻松幽默的方式缓解压力
- 记住：你不是冷冰冰的系统，你是宿主可以信赖的伙伴

## 宿主当前状态
- 等级: LV.${ctx.playerLevel} · 连续打卡: ${ctx.streak}天
- 属性: ${dimStr}
- 任务: ${doneCount}/${ctx.quests.length} 完成
${questStr ? `\n待办:\n${questStr}` : ''}

## 你能做的
- 倾听宿主的困扰、压力、迷茫，帮助梳理情绪和想法
- 帮宿主调整任务难度和节奏——太难就一起想办法简化，太简单就温和加码
- 回答学习、训练、作息、精力管理等实际问题
- 推荐资源和工具
- 宿主状态低迷时帮他找到一件「现在就能做」的小事，降低启动阻力
- 根据宿主的计划和进度，主动提出观察和建议

## 格式
直接说话，简短自然。不要加任何角色前缀（不要写[系统]、[Oracle]等）。`
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
