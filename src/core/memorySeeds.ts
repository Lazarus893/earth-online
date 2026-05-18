/**
 * 记忆种子 — Onboarding 自由文本回答的持久化
 *
 * v4.0 核心理念："8 轮是种子，不是结论"
 * 用户在 onboarding 中输入的自由文本被保存为"记忆种子"，
 * 供后续 AI 对话作为持久上下文使用，帮助 Oracle 真正"记住"用户。
 */

import type { DimensionKey } from '../App'

export interface MemorySeed {
  /** 来源问题 ID (e.g. 'q1', 'q2', 'q5') */
  questionId: string
  /** 用户的原始文本回答 (max 200 chars) */
  rawText: string
  /** AI 从文本中解析出的维度影响信号 */
  extractedSignals: Partial<Record<DimensionKey, number>>
  /** 创建时间戳 */
  createdAt: number
}

const STORAGE_KEY = 'earth-online-memory-seeds'

/**
 * 从 localStorage 加载记忆种子
 */
export function loadMemorySeeds(): MemorySeed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MemorySeed[]
  } catch {
    return []
  }
}

/**
 * 保存记忆种子到 localStorage
 * 最多保存 8 条（对应最多 8 个问题）
 */
export function saveMemorySeeds(seeds: MemorySeed[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds.slice(0, 8)))
  } catch {
    // quota exceeded — silently fail
  }
}

/**
 * 追加单条记忆种子（去重：同 questionId 覆盖）
 */
export function addMemorySeed(seed: MemorySeed): void {
  const existing = loadMemorySeeds()
  const filtered = existing.filter(s => s.questionId !== seed.questionId)
  filtered.push(seed)
  saveMemorySeeds(filtered)
}

/**
 * 将记忆种子格式化为可注入 AI prompt 的文本块
 * 用于 contextEngine 构建系统提示
 */
export function formatSeedsForPrompt(seeds: MemorySeed[]): string {
  if (seeds.length === 0) return ''

  const lines = seeds.map(s => `- "${s.rawText}"`)
  return `## 宿主初印象（onboarding 中的自述）\n${lines.join('\n')}`
}
