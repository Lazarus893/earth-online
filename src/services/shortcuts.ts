/**
 * OpenClaw Agent 快捷调用 — Earth Online 各维度能力捷径
 *
 * 分两层：
 * 1. 通用发现引擎（任何维度都适用，Agent 动态组合搜索策略）
 * 2. 维度专属捷径（特定场景的快速调用）
 *
 * 核心能力来源：OpenClaw Gateway → brave-search, web-fetch, Twitter, GitHub, cron, flomo
 */

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''
const MODEL = import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex'

// ─── 通用调用 ───
async function call(prompt: string, maxTokens = 1200): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  })
  if (!res.ok) throw new Error(`Agent error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── 捷径类型 ───
export interface Shortcut {
  id: string
  label: string
  icon: string
  description: string
  dimension: string
  execute: (context: ShortcutContext) => Promise<string>
}

export interface ShortcutContext {
  skills: { name: string; level: number; maxLevel: number }[]
  score: number
  level: number
  weakestSkill: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 通用发现引擎 — 任何维度都可用，Agent 动态组合搜索
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function universalShortcuts(dimension: string): Shortcut[] {
  return [
    {
      id: `${dimension}-discover`,
      label: '智能发现',
      icon: '🌐',
      description: '联网搜索 + Twitter + GitHub 综合推荐',
      dimension,
      execute: async (ctx) => call(`你是 Earth Online 的能力发现引擎。用户正在提升「${dimension}」维度，最薄弱技能是「${ctx.weakestSkill}」(Lv.${ctx.skills.find(s => s.name === ctx.weakestSkill)?.level})。

执行以下搜索组合：
1. 联网搜索该技能领域最新的免费学习资源/训练方案（2个，附链接）
2. 搜索 Twitter/X 上该领域的热门讨论或 KOL 推荐（1-2个，附 handle 和链接）
3. 搜索 GitHub 上相关的开源工具或项目（1-2个，附链接和 Star 数）

整合后给出推荐，每个包含：名称、链接、为什么适合当前阶段。`),
    },
    {
      id: `${dimension}-weekly-plan`,
      label: '生成周计划',
      icon: '📋',
      description: '基于当前状态制定 7 天提升计划',
      dimension,
      execute: async (ctx) => call(`基于「${dimension}」维度：${ctx.skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join(', ')}

制定7天提升计划：
- 每天一个具体行动（15-30分钟）
- 优先攻克「${ctx.weakestSkill}」
- 搜索具体免费资源（视频/文章/App）并附链接
- 标注休息日`),
    },
    {
      id: `${dimension}-kol`,
      label: '领域KOL',
      icon: '👤',
      description: '搜索该领域值得关注的 KOL 和社区',
      dimension,
      execute: async (ctx) => call(`搜索和「${dimension}」维度中「${ctx.weakestSkill}」相关的 KOL/社区：
1. Twitter/X 上活跃的 KOL（2-3个，附 @handle 和链接）
2. 中文社区/公众号/论坛（1-2个）
3. 值得订阅的 Newsletter（1个）
每个附链接，说明关注价值。`),
    },
    {
      id: `${dimension}-github`,
      label: '开源工具',
      icon: '⭐',
      description: '搜索 GitHub 上相关开源项目',
      dimension,
      execute: async (ctx) => call(`搜索 GitHub 上和「${ctx.weakestSkill}」提升相关的开源项目：
- 3-5个推荐
- 每个：项目名、链接、Star数、一句话说明
- 优先中文友好项目
- 标注类型（App/Library/Dataset）`),
    },
    {
      id: `${dimension}-reminder`,
      label: '设置提醒',
      icon: '⏰',
      description: '创建每日定时提醒',
      dimension,
      execute: async (ctx) => call(`用 cron 工具创建每天早上 8:00 的提醒：内容是提醒用户完成「${ctx.weakestSkill}」训练，加一句鼓励。创建完告诉我结果。`),
    },
  ]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 维度专属附加捷径（补充通用引擎不覆盖的特殊场景）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const dimensionExtras: Record<string, Shortcut[]> = {
  physical: [
    {
      id: 'physical-weather',
      label: '运动天气',
      icon: '🌤',
      description: '判断今天是否适合户外运动',
      dimension: 'physical',
      execute: async () => call(`查看今天的天气，判断是否适合户外运动，建议什么类型的运动。`),
    },
  ],
  energy: [
    {
      id: 'energy-music',
      label: '专注音乐',
      icon: '🎵',
      description: '推荐深度工作音乐资源',
      dimension: 'energy',
      execute: async () => call(`推荐3个免费专注力白噪音/Lo-Fi资源（网站或App），给名称、链接、特点。`),
    },
  ],
  career: [
    {
      id: 'career-trending',
      label: '技术趋势',
      icon: '📊',
      description: '搜索行业最新动态',
      dimension: 'career',
      execute: async () => call(`搜索2025-2026年科技/AI行业最新趋势，5条要点，每条附信息源链接。`),
    },
    {
      id: 'career-flomo',
      label: '记录到Flomo',
      icon: '📝',
      description: '把学习收获保存到 flomo',
      dimension: 'career',
      execute: async () => call(`用 flomo 保存一条笔记："Earth Online 学习记录 - 今日完成技能训练"，标签 #学习 #Earth_Online。告诉我结果。`),
    },
  ],
  finance: [
    {
      id: 'finance-market',
      label: '市场速报',
      icon: '📈',
      description: '获取今日市场动态',
      dimension: 'finance',
      execute: async () => call(`搜索今天A股/美股概况和重要财经新闻，3条要点速报，标注信息源。`),
    },
  ],
  social: [],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 导出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getShortcutsForDimension(dimension: string): Shortcut[] {
  return [
    ...universalShortcuts(dimension),
    ...(dimensionExtras[dimension] || []),
  ]
}
