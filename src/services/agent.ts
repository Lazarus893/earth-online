/**
 * Agent 服务 — 通过 OpenClaw Gateway 调用真实 Agent
 *
 * OpenClaw Gateway 暴露 OpenAI 兼容接口:
 *   POST http://localhost:18789/v1/chat/completions
 *
 * Agent 可以执行 skills: brave-search, web-access, opencli 等
 * 获取真实互联网信息并返回给用户
 */

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const MODEL = import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex'

export async function isAgentAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    return data.ok === true
  } catch {
    return false
  }
}

interface AgentRequest {
  dimension: string
  skills: { name: string; level: number; maxLevel: number }[]
  request: string
}

export async function callAgent(req: AgentRequest): Promise<string> {
  const systemPrompt = `你是 Earth Online 的维度顾问 Agent。用户正在提升「${req.dimension}」维度。
技能状态：${req.skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join(', ')}

你可以搜索互联网来找到真实的资源。请：
1. 搜索真实存在的课程、App、训练方案、社区等
2. 返回具体名称和链接
3. 说明为什么适合用户当前等级
4. 中文回复，格式清晰`

  const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.request },
      ],
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(90000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Agent error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * 预设的 Agent 请求模板
 */
export function buildSkillSearchRequest(
  dimensionLabel: string,
  weakestSkill: string,
  level: number
): string {
  return `帮我搜索适合「${weakestSkill}」(当前Lv.${level})提升的外部资源。
要求：
- 搜索真实存在的免费课程、App、训练方案
- 给出具体名称和可访问的链接
- 说明为什么适合当前等级
- 返回2-3个最优推荐`
}

export function buildTrainingPlanRequest(
  dimensionLabel: string,
  skills: { name: string; level: number; maxLevel: number }[]
): string {
  const skillDesc = skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join(', ')
  return `基于我的${dimensionLabel}维度技能状态(${skillDesc})，生成一份本周训练计划。
要求：
- 每天一个具体任务，耗时15-30分钟
- 优先攻克最薄弱技能
- 搜索推荐具体的免费在线资源（视频/文章/App）
- 包含具体链接`
}
