/**
 * journalGenerator — AI 驱动的每日日志条目生成
 *
 * 基于用户的 Hierarchy 树（Goals → Plans → Tasks → Actions），
 * 让 AI 挑选当天最适合做的 3-5 个 action 作为日志条目。
 *
 * 回退机制：AI 不可用时从 hierarchy actions 中随机抽取。
 */

import type { DimensionKey, DimensionData } from '../App'
import type { HierarchyGoal, HierarchyAction } from '../core/hierarchy'
import { loadSelectedScheme, getTodayActions } from '../core/hierarchy'
import { getStatusLabel } from '../data/dimensionStatus'

export interface JournalEntry {
  id: string
  text: string
  dimension: DimensionKey
  exp: number
  logged: boolean
  loggedAt?: number
  note?: string
  sourceActionId?: string
}

interface JournalGenerateRequest {
  goals: HierarchyGoal[]
  dimensions: DimensionData[]
  recentLogs?: JournalEntry[]
}

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const CACHE_PREFIX = 'earth-online-daily-journal-'

/**
 * 获取今日日志条目（带缓存）
 * 如果今天已经生成过则读缓存，否则调用 AI 生成
 */
export async function getDailyJournal(
  dimensions: DimensionData[],
  recentLogs?: JournalEntry[]
): Promise<JournalEntry[]> {
  const today = new Date().toISOString().slice(0, 10)
  const cacheKey = `${CACHE_PREFIX}${today}`

  // 尝试读缓存
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      return JSON.parse(cached) as JournalEntry[]
    }
  } catch { /* ignore */ }

  // 加载 hierarchy
  const scheme = loadSelectedScheme()
  if (!scheme || scheme.goals.length === 0) {
    // 无 hierarchy → fallback 到空日志
    return generateFallbackJournal(dimensions)
  }

  // 尝试 AI 生成
  try {
    const entries = await generateWithAI({
      goals: scheme.goals,
      dimensions,
      recentLogs,
    })

    // 缓存
    localStorage.setItem(cacheKey, JSON.stringify(entries))
    return entries
  } catch {
    // AI 失败 → fallback
    const entries = generateFallbackJournal(dimensions, scheme.goals)
    localStorage.setItem(cacheKey, JSON.stringify(entries))
    return entries
  }
}

/**
 * AI 生成日志条目
 */
async function generateWithAI(req: JournalGenerateRequest): Promise<JournalEntry[]> {
  const { goals, dimensions, recentLogs } = req

  // 构建 hierarchy 摘要
  const hierarchySummary = goals.map(g => {
    const plans = g.plans.map(p => {
      const tasks = p.tasks
        .filter(t => !t.completed)
        .map(t => {
          const actions = t.actions.filter(a => !a.completed).map(a => `    - ${a.text} (${a.dimension}, ${a.exp}exp, id:${a.id})`)
          return `  · ${t.text}\n${actions.join('\n')}`
        })
      return `  ${p.text}\n${tasks.join('\n')}`
    })
    return `[${g.dimension}] ${g.text}\n${plans.join('\n')}`
  }).join('\n\n')

  // 维度状态
  const dimState = dimensions
    .filter(d => !d.locked)
    .map(d => `${d.label}: LV.${d.level} · ${getStatusLabel(d.key, d.score)}`)
    .join(', ')

  // 昨天做了什么（避免重复）
  const recentTexts = recentLogs?.filter(l => l.logged).map(l => l.text).join(', ') || '无'

  const systemPrompt = `你是一个个人发展规划助手。基于用户的目标体系，为他挑选今天最适合执行的 3-5 个具体行动。

要求：
1. 从用户的 Actions 列表中挑选（优先选未完成的）
2. 考虑维度平衡 — 状态较低的维度多安排一些
3. 避免和昨天重复
4. 每个行动要具体、可执行、10分钟内可完成
5. EXP 根据难度估算 (8-24)

返回严格 JSON 数组格式：
[{"text": "行动描述", "dimension": "physical|energy|career|social|finance", "exp": 数字, "sourceActionId": "原始action的id或null"}]

不要返回任何其他内容。`

  const userPrompt = `用户目标体系:
${hierarchySummary}

维度状态: ${dimState}
昨天已做: ${recentTexts}

请为今天挑选 3-5 个最适合的行动。`

  const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 512,
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`Gateway ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // 解析 JSON
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    text: string
    dimension: DimensionKey
    exp: number
    sourceActionId?: string
  }>

  return parsed.slice(0, 5).map((item, i) => ({
    id: `journal-${Date.now()}-${i}`,
    text: item.text,
    dimension: item.dimension || 'career',
    exp: Math.min(24, Math.max(8, item.exp || 12)),
    logged: false,
    sourceActionId: item.sourceActionId || undefined,
  }))
}

/**
 * Fallback：从 hierarchy actions 中随机抽取
 */
function generateFallbackJournal(
  dimensions: DimensionData[],
  goals?: HierarchyGoal[]
): JournalEntry[] {
  // 如果有 hierarchy，从 actions 中抽取
  if (goals && goals.length > 0) {
    const allActions: HierarchyAction[] = []
    for (const goal of goals) {
      for (const plan of goal.plans) {
        for (const task of plan.tasks) {
          if (task.completed) continue
          for (const action of task.actions) {
            if (!action.completed) {
              allActions.push(action)
            }
          }
        }
      }
    }

    if (allActions.length > 0) {
      // Fisher-Yates shuffle
      const shuffled = [...allActions]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }

      return shuffled.slice(0, 5).map((action, i) => ({
        id: `journal-${Date.now()}-${i}`,
        text: action.text,
        dimension: action.dimension,
        exp: action.exp,
        logged: false,
        sourceActionId: action.id,
      }))
    }
  }

  // 最终 fallback — 通用条目
  const fallbackPool = [
    { text: '30分钟有氧运动', dimension: 'physical' as DimensionKey, exp: 15 },
    { text: '冥想10分钟', dimension: 'energy' as DimensionKey, exp: 10 },
    { text: '阅读30页', dimension: 'career' as DimensionKey, exp: 12 },
    { text: '完成一个番茄钟', dimension: 'energy' as DimensionKey, exp: 8 },
    { text: '写500字笔记', dimension: 'career' as DimensionKey, exp: 15 },
  ]

  return fallbackPool.map((item, i) => ({
    id: `journal-${Date.now()}-${i}`,
    text: item.text,
    dimension: item.dimension,
    exp: item.exp,
    logged: false,
  }))
}

/**
 * 清除今日缓存（用于强制重新生成）
 */
export function clearTodayJournalCache(): void {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.removeItem(`${CACHE_PREFIX}${today}`)
}
