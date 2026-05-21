/**
 * HierarchyEditDialog — AI 修改对话框
 *
 * 用户选中节点后点击"发送给 Oracle 修改"唤起此对话框。
 * 对话框内展示：选中的节点标签 + AI 流式响应（markdown 格式）
 * 修改完成后可应用到层级树。
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { DimensionKey } from '../../App'
import type { HierarchyGoal } from '../../core/hierarchy'
import type { SelectedItem, EditResult } from '../../services/hierarchyEditor'
import { colors, easing } from '../../design-system'
import OracleOrb from './ui/OracleOrb'
import MarkdownContent from './ui/MarkdownContent'

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''

interface HierarchyEditDialogProps {
  open: boolean
  onClose: () => void
  selectedItems: SelectedItem[]
  fullGoal: HierarchyGoal | null
  dimensionKey: DimensionKey
  dimensionColor: string
  /** 修改成功后回调 */
  onApplyEdit: (result: EditResult) => void
  /** 注入消息到主对话框 */
  onInjectChat?: (msg: { role: 'user' | 'system'; content: string }) => void
}

type DialogPhase = 'input' | 'loading' | 'result' | 'error'

const SYSTEM_PROMPT = `你是 Oracle，Earth Online 系统的 AI 内核。你的角色类似一位温暖的心理咨询师——真正关心宿主，善于倾听，懂得共情。

现在宿主选中了规划树中的节点，希望你帮忙优化调整。

## 你的风格
- 先共情：理解宿主为什么想调整这些节点（可能太难了、不够具体、方向变了……）
- 说话自然、温柔但真诚。像朋友帮忙出主意，不是冷冰冰地输出修改
- 简短说明修改思路（2-4句，带一点鼓励），然后再给出修改结果
- 如果是降低难度的修改，让宿主知道「调整节奏完全没问题」
- 如果是升级/增加任务，温和肯定宿主的状态

## 修改规则
1. 修改选中节点，同时联动调整上下游节点使其逻辑一致
2. 保持游戏化语言风格，简洁有力
3. 保留未被影响的节点原样不动
4. ACTION 的 EXP 值保持在 8-25 之间
5. 保持所有节点的 id 字段不变（除非是新增节点）
6. 新增节点使用 "new-" 前缀的 id

## 输出格式
先用 markdown 说明你的修改思路（温柔、有共情感），然后在末尾输出 JSON 代码块：

\`\`\`json
{
  "goal": { ... 完整的修改后 Goal 结构 ... },
  "modifiedIds": ["被修改的节点id列表"]
}
\`\`\``

export default function HierarchyEditDialog({
  open,
  onClose,
  selectedItems,
  fullGoal,
  dimensionKey,
  dimensionColor,
  onApplyEdit,
  onInjectChat,
}: HierarchyEditDialogProps) {
  const [phase, setPhase] = useState<DialogPhase>('input')
  const [userInstruction, setUserInstruction] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [finalContent, setFinalContent] = useState('')
  const [editResult, setEditResult] = useState<EditResult | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [streamingContent, finalContent])

  // Focus input when opened
  useEffect(() => {
    if (open && phase === 'input') {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, phase])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase('input')
        setUserInstruction('')
        setStreamingContent('')
        setFinalContent('')
        setEditResult(null)
        setError('')
      }, 300)
    }
  }, [open])

  const handleSend = useCallback(async () => {
    if (!fullGoal || selectedItems.length === 0) return

    setPhase('loading')
    setStreamingContent('')
    setFinalContent('')
    setError('')

    const controller = new AbortController()
    abortRef.current = controller

    // 去重: 同一 task 下的多个 actions 合并为 task 级别
    const deduped = deduplicateSelection(selectedItems, fullGoal)

    const selectedDesc = deduped
      .map(item => `- [${item.type.toUpperCase()}] "${item.text}" (id: ${item.id})`)
      .join('\n')

    const goalJson = JSON.stringify(fullGoal, null, 2)
    const userPrompt = `用户选中了以下节点希望 AI 优化修改：
${selectedDesc}

${userInstruction.trim() ? `用户修改指令：${userInstruction.trim()}\n` : ''}当前 Goal 完整结构如下：
\`\`\`json
${goalJson}
\`\`\`

请对选中节点进行优化修改，并联动调整上下游使其逻辑一致。未受影响的节点保持原样。`

    try {
      const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 4096,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Gateway ${response.status}`)

      const contentType = response.headers.get('content-type') || ''
      let fullContent = ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
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
            } catch { /* skip malformed */ }
          }
        }
      } else {
        const data = await response.json()
        fullContent = data.choices?.[0]?.message?.content ?? ''
        setStreamingContent(fullContent)
      }

      // 解析结果
      setFinalContent(fullContent)
      setStreamingContent('')

      const result = parseEditResult(fullContent, fullGoal)
      if (result) {
        setEditResult(result)
        setPhase('result')
      } else {
        // AI 返回了内容但没有有效 JSON — 仍展示内容
        setPhase('result')
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message || '修改请求失败')
      setPhase('error')
    }
  }, [fullGoal, selectedItems, userInstruction])

  const handleApply = useCallback(() => {
    if (editResult) {
      onApplyEdit(editResult)
      // 将 AI 修改说明注入主聊天记录
      if (onInjectChat && finalContent) {
        const markdown = extractMarkdownExplanation(finalContent)
        if (markdown) {
          onInjectChat({ role: 'system', content: markdown })
        }
      }
      onClose()
    }
  }, [editResult, onApplyEdit, onClose, onInjectChat, finalContent])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    onClose()
  }, [onClose])

  // 提取 markdown 文本部分（去掉末尾的 JSON 代码块）
  const displayContent = phase === 'loading' ? streamingContent : finalContent
  const markdownOnly = extractMarkdownExplanation(displayContent)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="hierarchy-edit-dialog__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            className="hierarchy-edit-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="hierarchy-edit-dialog__header">
              <div className="hierarchy-edit-dialog__title">
                <OracleOrb size={22} />
                <span>Oracle 路径共创</span>
              </div>
              <button className="hierarchy-edit-dialog__close" onClick={handleCancel}>✕</button>
            </div>

            {/* Selected items chips — deduplicated */}
            <div className="hierarchy-edit-dialog__chips">
              <span className="hierarchy-edit-dialog__chips-label">选中节点:</span>
              {Array.from(new Map(selectedItems.map(item => [item.id, item])).values()).map(item => (
                <span key={item.id} className="hierarchy-edit-dialog__chip">
                  <span className="hierarchy-edit-dialog__chip-type">{item.type.toUpperCase()}</span>
                  <span className="hierarchy-edit-dialog__chip-text">
                    {item.text.slice(0, 30)}{item.text.length > 30 ? '...' : ''}
                  </span>
                </span>
              ))}
            </div>

            {/* Content area */}
            <div className="hierarchy-edit-dialog__content" ref={contentRef}>
              {/* Input phase */}
              {phase === 'input' && (
                <div className="hierarchy-edit-dialog__input-hint">
                  <p>告诉 Oracle 你的想法（留空则由 Oracle 自主优化）：</p>
                </div>
              )}

              {/* Loading / streaming */}
              {phase === 'loading' && (
                <div className="hierarchy-edit-dialog__response">
                  {streamingContent ? (
                    <MarkdownContent content={extractMarkdownExplanation(streamingContent)} />
                  ) : (
                    <div className="hierarchy-edit-dialog__loading">
                      <OracleOrb size={28} />
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Oracle 正在分析修改方案...
                      </motion.span>
                    </div>
                  )}
                  <span className="hierarchy-edit-dialog__cursor" />
                </div>
              )}

              {/* Result */}
              {phase === 'result' && (
                <div className="hierarchy-edit-dialog__response">
                  <MarkdownContent content={markdownOnly} />
                  {editResult && (
                    <ModifiedNodesList
                      editResult={editResult}
                      originalGoal={fullGoal!}
                      dimensionColor={dimensionColor}
                    />
                  )}
                </div>
              )}

              {/* Error */}
              {phase === 'error' && (
                <div className="hierarchy-edit-dialog__error">
                  <span>⚠ {error}</span>
                  <p>Oracle 暂时失联，请稍后再试。</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="hierarchy-edit-dialog__footer">
              {phase === 'input' && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    className="hierarchy-edit-dialog__input"
                    placeholder="你的想法（如：让任务更具体、降低难度...）"
                    value={userInstruction}
                    onChange={e => setUserInstruction(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSend() }
                      if (e.key === 'Escape') handleCancel()
                    }}
                  />
                  <button
                    className="hierarchy-edit-dialog__send-btn"
                    style={{ borderColor: `${dimensionColor}66`, color: dimensionColor }}
                    onClick={handleSend}
                  >
                    <span>✦</span> 交给 Oracle
                  </button>
                </>
              )}

              {phase === 'result' && editResult && (
                <>
                  <button className="hierarchy-edit-dialog__cancel-btn" onClick={handleCancel}>
                    取消
                  </button>
                  <button
                    className="hierarchy-edit-dialog__apply-btn"
                    style={{ background: `${dimensionColor}20`, borderColor: `${dimensionColor}55`, color: dimensionColor }}
                    onClick={handleApply}
                  >
                    ✓ 确认方向
                  </button>
                </>
              )}

              {phase === 'result' && !editResult && (
                <button className="hierarchy-edit-dialog__cancel-btn" onClick={handleCancel}>
                  关闭
                </button>
              )}

              {phase === 'error' && (
                <>
                  <button className="hierarchy-edit-dialog__cancel-btn" onClick={handleCancel}>
                    关闭
                  </button>
                  <button
                    className="hierarchy-edit-dialog__send-btn"
                    style={{ borderColor: `${dimensionColor}66`, color: dimensionColor }}
                    onClick={() => { setPhase('input'); setError('') }}
                  >
                    重试
                  </button>
                </>
              )}

              {phase === 'loading' && (
                <button className="hierarchy-edit-dialog__cancel-btn" onClick={handleCancel}>
                  取消
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── 修改详情展开列表 ───

interface ModifiedNodesListProps {
  editResult: EditResult
  originalGoal: HierarchyGoal
  dimensionColor: string
}

interface ModifiedNodeInfo {
  id: string
  type: 'goal' | 'plan' | 'task' | 'action'
  oldText: string
  newText: string
  isNew: boolean
}

function ModifiedNodesList({ editResult, originalGoal, dimensionColor }: ModifiedNodesListProps) {
  const [expanded, setExpanded] = useState(false)

  // 收集所有被修改的节点信息（对比前后）
  const modifiedNodes: ModifiedNodeInfo[] = []

  for (const modId of editResult.modifiedIds) {
    // 在原始 goal 中查找
    const origNode = findNodeById(originalGoal, modId)
    // 在新 goal 中查找
    const newNode = findNodeById(editResult.updatedGoal, modId)

    if (newNode) {
      modifiedNodes.push({
        id: modId,
        type: newNode.type,
        oldText: origNode?.text || '',
        newText: newNode.text,
        isNew: !origNode,
      })
    }
  }

  return (
    <div className="hierarchy-edit-dialog__modified">
      {/* Header — clickable to expand */}
      <button
        className="hierarchy-edit-dialog__modified-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="hierarchy-edit-dialog__modified-badge" style={{ color: dimensionColor }}>
          ✓ 已生成修改方案 · {modifiedNodes.length} 个节点将被更新
        </span>
        <motion.span
          className="hierarchy-edit-dialog__modified-chevron"
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▸
        </motion.span>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="hierarchy-edit-dialog__modified-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
          >
            {modifiedNodes.map(node => (
              <div key={node.id} className="hierarchy-edit-dialog__modified-item">
                <div className="hierarchy-edit-dialog__modified-item-header">
                  <span className="hierarchy-edit-dialog__modified-item-type" style={{ color: dimensionColor }}>
                    {node.type.toUpperCase()}
                  </span>
                  {node.isNew && (
                    <span className="hierarchy-edit-dialog__modified-item-new">NEW</span>
                  )}
                </div>
                {!node.isNew && node.oldText !== node.newText && (
                  <div className="hierarchy-edit-dialog__modified-diff">
                    <div className="hierarchy-edit-dialog__modified-old">
                      <span className="hierarchy-edit-dialog__diff-marker">-</span>
                      {node.oldText}
                    </div>
                    <div className="hierarchy-edit-dialog__modified-new">
                      <span className="hierarchy-edit-dialog__diff-marker">+</span>
                      {node.newText}
                    </div>
                  </div>
                )}
                {node.isNew && (
                  <div className="hierarchy-edit-dialog__modified-diff">
                    <div className="hierarchy-edit-dialog__modified-new">
                      <span className="hierarchy-edit-dialog__diff-marker">+</span>
                      {node.newText}
                    </div>
                  </div>
                )}
                {!node.isNew && node.oldText === node.newText && (
                  <div className="hierarchy-edit-dialog__modified-diff">
                    <div className="hierarchy-edit-dialog__modified-meta">子节点已调整</div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 在 Goal 树中查找指定 id 的节点 */
function findNodeById(goal: HierarchyGoal, id: string): { type: 'goal' | 'plan' | 'task' | 'action'; text: string } | null {
  if (goal.id === id) return { type: 'goal', text: goal.text }
  for (const plan of goal.plans) {
    if (plan.id === id) return { type: 'plan', text: plan.text }
    for (const task of plan.tasks) {
      if (task.id === id) return { type: 'task', text: task.text }
      for (const action of task.actions) {
        if (action.id === id) return { type: 'action', text: action.text }
      }
    }
  }
  return null
}

// ─── 去重逻辑 ───
// 同一个 task 下选了多个 actions → 合并为 task 级别
// 同一个 plan 下选了多个 tasks → 合并为 plan 级别
function deduplicateSelection(items: SelectedItem[], goal: HierarchyGoal): SelectedItem[] {
  const itemMap = new Map<string, SelectedItem>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }

  // 找到每个 action 的 parent task
  const actionToTask = new Map<string, string>()
  const taskToPlan = new Map<string, string>()
  const planToGoal = new Map<string, string>()

  for (const plan of goal.plans) {
    planToGoal.set(plan.id, goal.id)
    for (const task of plan.tasks) {
      taskToPlan.set(task.id, plan.id)
      for (const action of task.actions) {
        actionToTask.set(action.id, task.id)
      }
    }
  }

  // 统计：同一 task 下选中了多少 actions
  const taskActionCount = new Map<string, number>()
  const taskTotalActions = new Map<string, number>()
  for (const plan of goal.plans) {
    for (const task of plan.tasks) {
      taskTotalActions.set(task.id, task.actions.length)
    }
  }
  for (const item of items) {
    if (item.type === 'action') {
      const taskId = actionToTask.get(item.id)
      if (taskId) {
        taskActionCount.set(taskId, (taskActionCount.get(taskId) || 0) + 1)
      }
    }
  }

  // 如果同一 task 下超过一半的 actions 被选中 → 提升为 task 级别
  const promotedTaskIds = new Set<string>()
  for (const [taskId, count] of taskActionCount) {
    const total = taskTotalActions.get(taskId) || 1
    if (count >= Math.ceil(total / 2) || count >= 2) {
      promotedTaskIds.add(taskId)
    }
  }

  // 同样检查 plan 级别提升
  const planTaskCount = new Map<string, number>()
  const planTotalTasks = new Map<string, number>()
  for (const plan of goal.plans) {
    planTotalTasks.set(plan.id, plan.tasks.length)
  }
  for (const item of items) {
    if (item.type === 'task') {
      const planId = taskToPlan.get(item.id)
      if (planId) planTaskCount.set(planId, (planTaskCount.get(planId) || 0) + 1)
    }
  }
  for (const taskId of promotedTaskIds) {
    const planId = taskToPlan.get(taskId)
    if (planId) planTaskCount.set(planId, (planTaskCount.get(planId) || 0) + 1)
  }

  // 构建去重后的列表
  const result: SelectedItem[] = []
  const included = new Set<string>()

  // 先加入 goal 和 plan 级别选中项
  for (const item of items) {
    if (item.type === 'goal' || item.type === 'plan') {
      if (!included.has(item.id)) {
        result.push(item)
        included.add(item.id)
      }
    }
  }

  // 处理 promoted tasks
  for (const taskId of promotedTaskIds) {
    if (!included.has(taskId)) {
      const task = goal.plans.flatMap(p => p.tasks).find(t => t.id === taskId)
      if (task) {
        result.push({ id: taskId, type: 'task', text: task.text })
        included.add(taskId)
      }
    }
  }

  // 加入未提升的 tasks
  for (const item of items) {
    if (item.type === 'task' && !included.has(item.id)) {
      result.push(item)
      included.add(item.id)
    }
  }

  // 加入未被 task 提升覆盖的 actions
  for (const item of items) {
    if (item.type === 'action') {
      const parentTaskId = actionToTask.get(item.id)
      if (parentTaskId && promotedTaskIds.has(parentTaskId)) continue // 已提升
      if (!included.has(item.id)) {
        result.push(item)
        included.add(item.id)
      }
    }
  }

  return result
}

// ─── 从 AI 响应中提取 markdown 解释（去掉末尾 JSON 块） ───
function extractMarkdownExplanation(content: string): string {
  if (!content) return ''
  // 找到最后一个 ```json 块的开始位置
  const jsonBlockStart = content.lastIndexOf('```json')
  if (jsonBlockStart > 0) {
    return content.slice(0, jsonBlockStart).trim()
  }
  // 也可能是 ``` 开头的代码块
  const genericBlockStart = content.lastIndexOf('```\n{')
  if (genericBlockStart > 0) {
    return content.slice(0, genericBlockStart).trim()
  }
  return content
}

// ─── 从 AI 响应中解析 EditResult ───
function parseEditResult(content: string, originalGoal: HierarchyGoal): EditResult | null {
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (!codeBlockMatch) return null
    const jsonStr = codeBlockMatch[1]
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.goal) return null

    // 简单的 normalize（复用 hierarchyEditor 的逻辑思路）
    const updatedGoal: HierarchyGoal = {
      id: parsed.goal.id || originalGoal.id,
      text: parsed.goal.text || originalGoal.text,
      dimension: parsed.goal.dimension || originalGoal.dimension,
      icon: parsed.goal.icon || originalGoal.icon,
      progress: typeof parsed.goal.progress === 'number' ? parsed.goal.progress : originalGoal.progress,
      plans: (parsed.goal.plans || []).map((p: any) => ({
        id: p.id || `new-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: p.text || '',
        timeframe: p.timeframe || '每周',
        progress: typeof p.progress === 'number' ? p.progress : 0,
        tasks: (p.tasks || []).map((t: any) => ({
          id: t.id || `new-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: t.text || '',
          frequency: t.frequency || 'daily',
          completed: !!t.completed,
          actions: (t.actions || []).map((a: any) => ({
            id: a.id || `new-action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: a.text || '',
            exp: typeof a.exp === 'number' ? a.exp : 12,
            dimension: a.dimension || originalGoal.dimension,
            completed: !!a.completed,
            source: a.source || 'ai',
          })),
        })),
      })),
    }

    return {
      updatedGoal,
      modifiedIds: Array.isArray(parsed.modifiedIds) ? parsed.modifiedIds : [],
    }
  } catch {
    return null
  }
}
