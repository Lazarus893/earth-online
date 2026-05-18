/**
 * journalReflection — AI 每日反思生成
 *
 * 在一天结束时（21:00后）或所有条目都 logged 时，
 * AI 生成一段 2-3 句的非评判性反思。
 */

import type { DimensionData } from '../App'
import type { JournalEntry } from './journalGenerator'
import { getStatusLabel } from '../data/dimensionStatus'

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const REFLECTION_KEY = 'earth-online-daily-reflection'

export interface DailyReflection {
  content: string
  generatedAt: number
  date: string
}

/**
 * 获取今日反思（带缓存）
 */
export async function getDailyReflection(
  entries: JournalEntry[],
  dimensions: DimensionData[]
): Promise<DailyReflection | null> {
  const today = new Date().toISOString().slice(0, 10)

  // 检查缓存
  try {
    const cached = localStorage.getItem(REFLECTION_KEY)
    if (cached) {
      const reflection = JSON.parse(cached) as DailyReflection
      if (reflection.date === today) return reflection
    }
  } catch { /* ignore */ }

  // 判断是否应该生成
  const hour = new Date().getHours()
  const allLogged = entries.length > 0 && entries.every(e => e.logged)
  if (hour < 21 && !allLogged) return null

  // 生成反思
  try {
    const reflection = await generateReflection(entries, dimensions)
    const result: DailyReflection = {
      content: reflection,
      generatedAt: Date.now(),
      date: today,
    }
    localStorage.setItem(REFLECTION_KEY, JSON.stringify(result))
    return result
  } catch {
    return null
  }
}

async function generateReflection(
  entries: JournalEntry[],
  dimensions: DimensionData[]
): Promise<string> {
  const logged = entries.filter(e => e.logged)
  const unlogged = entries.filter(e => !e.logged)

  const dimState = dimensions
    .filter(d => !d.locked)
    .map(d => `${d.label}: ${getStatusLabel(d.key, d.score)}`)
    .join(', ')

  const systemPrompt = `你是 Oracle，一个温暖的 AI 陪伴。为用户写一段今日反思（2-3句话）。

要求：
- 非评判性：不批评未做的事
- 温暖但真诚：不空洞鼓励
- 关注模式而非结果
- 未做的事情换个角度看："也许明天可以换个方式试试"
- 做了的事情温和肯定
- 整体 50-100 字

直接输出反思文字，不要加标题或前缀。`

  const loggedText = logged.length > 0
    ? `今天做了: ${logged.map(e => e.text).join('、')}`
    : '今天没有记录任何条目'

  const unloggedText = unlogged.length > 0
    ? `没做: ${unlogged.map(e => e.text).join('、')}`
    : ''

  const userPrompt = `${loggedText}
${unloggedText}
当前状态: ${dimState}

请写一段简短的今日反思。`

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
      temperature: 0.7,
      max_tokens: 200,
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`Gateway ${response.status}`)

  const data = await response.json()
  return data.choices?.[0]?.message?.content || '今天辛苦了。明天继续。'
}
