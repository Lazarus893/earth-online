/**
 * 交互摘要 — 短期对话记忆
 *
 * 记录今日对话中的关键信息：
 * - 讨论的话题
 * - 用户做出的承诺
 * - 检测到的情绪状态
 *
 * 由 AI 每 5 条消息后自动更新，供下次对话时注入上下文。
 * 每日重置（新的一天重新开始积累）。
 */

export interface InteractionSummary {
  /** 今天讨论过的主题 (e.g. ["聊了运动习惯", "提到工作压力大"]) */
  topics: string[]
  /** 用户承诺要做的事 (e.g. ["今晚11点前睡觉", "明天跑步"]) */
  commitments: string[]
  /** 当前情绪状态描述 (e.g. "疲惫但有动力") */
  emotionalState: string
  /** 最后更新时间戳 */
  lastUpdated: number
}

const STORAGE_KEY = 'earth-online-interaction-summary'

/**
 * 加载交互摘要（仅返回今天的，过期自动清除）
 */
export function loadSummary(): InteractionSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const summary = JSON.parse(raw) as InteractionSummary

    // 检查是否是今天的摘要
    const today = new Date().toISOString().slice(0, 10)
    const summaryDate = new Date(summary.lastUpdated).toISOString().slice(0, 10)
    if (summaryDate !== today) {
      // 过期 — 清除并返回 null
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return summary
  } catch {
    return null
  }
}

/**
 * 保存交互摘要
 */
export function saveSummary(summary: InteractionSummary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summary))
  } catch {
    // quota exceeded
  }
}

/**
 * 创建空白摘要
 */
export function createEmptySummary(): InteractionSummary {
  return {
    topics: [],
    commitments: [],
    emotionalState: '',
    lastUpdated: Date.now(),
  }
}

/**
 * 将摘要格式化为可注入 prompt 的文本
 */
export function formatSummaryForPrompt(summary: InteractionSummary | null): string {
  if (!summary) return ''
  const parts: string[] = []

  if (summary.topics.length > 0) {
    parts.push(`今天聊过: ${summary.topics.slice(-5).join('、')}`)
  }
  if (summary.commitments.length > 0) {
    parts.push(`宿主承诺: ${summary.commitments.slice(-3).join('、')}`)
  }
  if (summary.emotionalState) {
    parts.push(`当前情绪: ${summary.emotionalState}`)
  }

  if (parts.length === 0) return ''
  return `## 今日对话记忆\n${parts.join('\n')}`
}

/**
 * 构建 AI 摘要提取的 prompt
 * 传入最近的消息，让 AI 提取 topics/commitments/emotionalState
 */
export function buildSummaryExtractionPrompt(recentMessages: { role: string; content: string }[]): string {
  const conversation = recentMessages
    .map(m => `${m.role === 'user' ? '宿主' : 'Oracle'}: ${m.content}`)
    .join('\n')

  return `分析以下对话，提取关键信息。请用 JSON 格式返回：

${conversation}

返回格式（严格 JSON，不要其他内容）：
{
  "topics": ["讨论主题1", "讨论主题2"],
  "commitments": ["宿主承诺做的事1"],
  "emotionalState": "一句话描述当前情绪"
}

规则：
- topics: 最多 3 条，简短描述讨论了什么
- commitments: 只记录宿主明确说要做的事
- emotionalState: 5-10 个字，描述宿主的情绪基调
- 如果信息不足，对应字段返回空数组或空字符串`
}
