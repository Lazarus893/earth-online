/**
 * World Patch 系统 — 模拟 MMO 游戏补丁日志
 *
 * 每日调用 OpenClaw Agent 搜索真实天气/新闻，
 * 以"游戏世界更新"形式展示，影响玩家经验增益。
 */

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const MODEL = import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex'
const STORAGE_KEY = 'earth-online-world-patch'

// ─── Types ───────────────────────────────────────────

export interface WorldPatch {
  version: string           // "v2026.05.14"
  date: string              // "2026-05-14"
  weather: {
    city: string
    temp: string
    condition: string
    outdoor_bonus: number   // percentage modifier for physical/energy
  }
  economy: {
    summary: string
    trend: 'up' | 'down' | 'flat'
    finance_modifier: number
  }
  career: {
    headline: string
    career_modifier: number
  }
  generated_at: string
}

// ─── Fallback Patch ──────────────────────────────────

function createFallbackPatch(): WorldPatch {
  const today = new Date().toISOString().slice(0, 10)
  return {
    version: `v${today.replace(/-/g, '.')}`,
    date: today,
    weather: {
      city: 'Shanghai',
      temp: '25°C',
      condition: '晴',
      outdoor_bonus: 10,
    },
    economy: {
      summary: '市场平稳运行',
      trend: 'flat',
      finance_modifier: 0,
    },
    career: {
      headline: 'AI行业持续发展',
      career_modifier: 10,
    },
    generated_at: new Date().toISOString(),
  }
}

// ─── Cache ───────────────────────────────────────────

function getCachedPatch(): WorldPatch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const patch: WorldPatch = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (patch.date === today) return patch
    return null
  } catch {
    return null
  }
}

function cachePatch(patch: WorldPatch): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patch))
  } catch { /* silently fail */ }
}

// ─── Agent Call ──────────────────────────────────────

function buildPatchPrompt(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `搜索今天(${today})上海的天气和科技行业新闻、股市概况。

请严格按以下JSON格式返回，不要添加任何其他文字或markdown代码块标记：
{
  "weather": {
    "city": "Shanghai",
    "temp": "温度，如28°C",
    "condition": "天气状况，如晴/多云/雨",
    "outdoor_bonus": 数字(晴天20,多云10,雨天-10)
  },
  "economy": {
    "summary": "一句话股市/经济摘要",
    "trend": "up或down或flat",
    "finance_modifier": 数字(涨15,跌-10,平0)
  },
  "career": {
    "headline": "一句话科技行业新闻",
    "career_modifier": 数字(正面消息10-20,负面-10)
  }
}`
}

function parseAgentResponse(content: string): Partial<WorldPatch> | null {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }
    // Try to find JSON object in the string
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return parsed
  } catch {
    return null
  }
}

// ─── Main Generator ─────────────────────────────────

export async function generateWorldPatch(): Promise<WorldPatch> {
  // Check cache first
  const cached = getCachedPatch()
  if (cached) return cached

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: '你是Earth Online世界数据引擎。搜索真实数据并以JSON格式返回。只返回JSON，不要其他内容。',
          },
          {
            role: 'user',
            content: buildPatchPrompt(),
          },
        ],
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Agent error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const parsed = parseAgentResponse(content)

    if (!parsed?.weather || !parsed?.economy || !parsed?.career) {
      throw new Error('Invalid agent response structure')
    }

    const today = new Date().toISOString().slice(0, 10)
    const patch: WorldPatch = {
      version: `v${today.replace(/-/g, '.')}`,
      date: today,
      weather: {
        city: parsed.weather.city || 'Shanghai',
        temp: parsed.weather.temp || '25°C',
        condition: parsed.weather.condition || '晴',
        outdoor_bonus: Number(parsed.weather.outdoor_bonus) || 10,
      },
      economy: {
        summary: parsed.economy.summary || '市场平稳',
        trend: (['up', 'down', 'flat'].includes(parsed.economy.trend!) ? parsed.economy.trend : 'flat') as 'up' | 'down' | 'flat',
        finance_modifier: Number(parsed.economy.finance_modifier) || 0,
      },
      career: {
        headline: parsed.career.headline || 'AI行业持续发展',
        career_modifier: Number(parsed.career.career_modifier) || 10,
      },
      generated_at: new Date().toISOString(),
    }

    cachePatch(patch)
    return patch
  } catch (err) {
    console.warn('[WorldPatch] Agent unavailable, using fallback:', err)
    const fallback = createFallbackPatch()
    cachePatch(fallback)
    return fallback
  }
}

/**
 * Force regenerate (clears cache)
 */
export async function refreshWorldPatch(): Promise<WorldPatch> {
  localStorage.removeItem(STORAGE_KEY)
  return generateWorldPatch()
}

/**
 * Get current patch modifiers for EXP calculations
 */
export function getPatchModifiers(patch: WorldPatch): Record<string, number> {
  return {
    physical: patch.weather.outdoor_bonus,
    energy: patch.weather.outdoor_bonus,
    career: patch.career.career_modifier,
    finance: patch.economy.finance_modifier,
    social: 0,
  }
}
