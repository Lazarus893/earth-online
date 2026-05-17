/**
 * 维度顾问 — Prompt 工程 + AI 调用逻辑
 * 以 Physical 维度为试点，其他维度复用相同框架
 */

import { chat } from './glm'
import type { DimensionKey } from '../App'

// ─── 数据类型 ───
export interface Goal {
  id: string
  text: string
  source: 'ai' | 'user'
  completed: boolean
}

export interface Action {
  id: string
  text: string
  goalId: string
  exp: number
  dimension: DimensionKey
  skill: string
  completed: boolean
  source: 'ai' | 'user'
}

export interface Opportunity {
  id: string
  title: string
  description: string
  type: 'course' | 'app' | 'method' | 'community' | 'tool'
  link?: string
  expectedGain: string  // e.g. "有氧耐力 +2~3级"
}

interface SkillState {
  name: string
  level: number
  maxLevel: number
}

// ─── System Prompt ───
const SYSTEM_PROMPT = `你是 Earth Online 系统的维度顾问AI。你的任务是帮助玩家分析当前维度状态、设定目标和拆解行动。

规则：
- 回复用中文
- 保持简短、具体、可执行
- 不要说空话，每条建议必须是可量化的行动
- 输出严格遵循要求的 JSON 格式
- 根据技能等级给出匹配难度的建议（低等级=基础动作，高等级=进阶挑战）`

// ─── 现状分析 ───
export async function generateAnalysis(
  dimensionKey: DimensionKey,
  dimensionLabel: string,
  score: number,
  level: number,
  skills: SkillState[]
): Promise<string> {
  const skillSummary = skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join(', ')

  const userPrompt = `分析这个维度的现状，给出2-3句简短评估：

维度：${dimensionLabel} (${dimensionKey})
等级：Lv.${level}
综合分：${score}/100
技能：${skillSummary}

直接返回分析文字，不要JSON包装。要求：
1. 第一句概括整体水平
2. 第二句指出强项或弱项
3. 第三句给出提升方向`

  return chat(SYSTEM_PROMPT, userPrompt, { temperature: 0.8, maxTokens: 1024 })
}

// ─── 目标推荐 ───
export async function generateGoals(
  dimensionKey: DimensionKey,
  dimensionLabel: string,
  skills: SkillState[]
): Promise<Goal[]> {
  const skillSummary = skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join('\n')

  const userPrompt = `基于以下技能状态，推荐3个本周可完成的具体目标：

维度：${dimensionLabel}
技能状态：
${skillSummary}

严格返回JSON数组格式：
[{"text": "目标描述", "skill": "关联技能名"}]

要求：
- 每个目标关联一个具体技能
- 目标要具体可量化（包含次数/时间/数量）
- 难度匹配当前等级`

  const raw = await chat(SYSTEM_PROMPT, userPrompt, { temperature: 0.8, maxTokens: 1024 })

  try {
    // 尝试提取 JSON 数组
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return fallbackGoals(dimensionKey, skills)
    const parsed = JSON.parse(match[0]) as { text: string; skill: string }[]
    return parsed.slice(0, 3).map((g, i) => ({
      id: `goal-${Date.now()}-${i}`,
      text: g.text,
      source: 'ai' as const,
      completed: false,
    }))
  } catch {
    return fallbackGoals(dimensionKey, skills)
  }
}

// ─── 行动拆解 ───
export async function generateActions(
  dimensionKey: DimensionKey,
  goals: Goal[],
  skills: SkillState[]
): Promise<Action[]> {
  const activeGoals = goals.filter(g => !g.completed).slice(0, 2)
  if (activeGoals.length === 0) return []

  const goalText = activeGoals.map(g => g.text).join('\n')
  const skillNames = skills.map(s => s.name)

  const userPrompt = `基于以下目标，拆解出今天可以完成的具体行动（每个目标1-2个行动）：

目标：
${goalText}

可关联的技能：${skillNames.join(', ')}

严格返回JSON数组格式：
[{"text": "行动描述", "skill": "关联技能名", "exp": 经验值数字}]

要求：
- 每个行动耗时10-30分钟
- exp 范围 5-25（简单5-10，中等10-15，困难15-25）
- 行动描述包含具体数量`

  const raw = await chat(SYSTEM_PROMPT, userPrompt, { temperature: 0.7, maxTokens: 1024 })

  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return fallbackActions(dimensionKey, activeGoals, skills)
    const parsed = JSON.parse(match[0]) as { text: string; skill: string; exp: number }[]
    return parsed.slice(0, 4).map((a, i) => ({
      id: `action-${Date.now()}-${i}`,
      text: a.text,
      goalId: activeGoals[i % activeGoals.length]?.id ?? '',
      exp: Math.min(25, Math.max(5, a.exp || 10)),
      dimension: dimensionKey,
      skill: skillNames.includes(a.skill) ? a.skill : skillNames[0],
      completed: false,
      source: 'ai' as const,
    }))
  } catch {
    return fallbackActions(dimensionKey, activeGoals, skills)
  }
}

// ─── 大机缘：推荐外部资源 ───
export async function generateOpportunities(
  dimensionKey: DimensionKey,
  dimensionLabel: string,
  skills: SkillState[]
): Promise<Opportunity[]> {
  const weakestSkill = [...skills].sort((a, b) => a.level - b.level)[0]
  const skillSummary = skills.map(s => `${s.name} Lv.${s.level}/${s.maxLevel}`).join(', ')

  const userPrompt = `作为维度顾问，为用户推荐2个能显著加速成长的外部资源/工具/方法。

维度：${dimensionLabel}
技能状态：${skillSummary}
最薄弱技能：${weakestSkill?.name} (Lv.${weakestSkill?.level})

要求推荐真实存在的、可立即使用的资源。每个推荐必须包含：
- 具体的 App/课程/方法/社区名称
- 一句话说明为什么适合当前阶段
- 预期收益（对哪个技能、预计能提升多少）

严格返回JSON数组：
[{"title": "资源名称", "description": "一句话推荐理由", "type": "app|course|method|community|tool", "link": "链接(可选)", "expectedGain": "xx技能 +2~3级"}]

注意：
- type 只能是 course/app/method/community/tool 之一
- 推荐要针对性强，不要泛泛而谈
- 优先推荐免费或低成本资源
- 中文回复`

  try {
    const raw = await chat(SYSTEM_PROMPT, userPrompt, { temperature: 0.8, maxTokens: 1024 })
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return fallbackOpportunities(dimensionKey)
    const parsed = JSON.parse(match[0]) as Opportunity[]
    return parsed.slice(0, 2).map((o, i) => ({
      ...o,
      id: `opp-${Date.now()}-${i}`,
    }))
  } catch {
    return fallbackOpportunities(dimensionKey)
  }
}

function fallbackOpportunities(dimensionKey: DimensionKey): Opportunity[] {
  const templates: Record<DimensionKey, Opportunity[]> = {
    physical: [
      { id: 'opp-f-1', title: 'Keep · HIIT燃脂训练', description: '针对有氧耐力薄弱，4周系统提升心肺能力', type: 'app', link: 'https://www.gotokeep.com', expectedGain: '有氧耐力 +2~3级' },
      { id: 'opp-f-2', title: '《囚徒健身》渐进式训练法', description: '零器械力量训练体系，适合从零开始系统增强', type: 'method', expectedGain: '力量训练 +2级' },
    ],
    energy: [
      { id: 'opp-f-1', title: '潮汐 · 专注与冥想', description: '白噪音+番茄钟+冥想引导三合一', type: 'app', link: 'https://tide.fm', expectedGain: '专注力 +2级 / 冥想 +1级' },
      { id: 'opp-f-2', title: '《为什么我们会睡不着》', description: 'CBT-I认知行为疗法实操指南', type: 'method', expectedGain: '深度睡眠 +2~3级' },
    ],
    career: [
      { id: 'opp-f-1', title: 'LeetCode 每日一题', description: '算法思维训练，30天建立解题直觉', type: 'tool', link: 'https://leetcode.cn', expectedGain: '核心技能 +2级' },
      { id: 'opp-f-2', title: '极客时间 · 项目管理实战', description: '从零搭建项目管理框架', type: 'course', expectedGain: '项目管理 +2~3级' },
    ],
    social: [
      { id: 'opp-f-1', title: '即兴戏剧工作坊', description: '通过表演游戏突破社交舒适区', type: 'community', expectedGain: '主动社交 +2级 / 表达能力 +1级' },
      { id: 'opp-f-2', title: '《非暴力沟通》实践小组', description: '21天线上共读+真实场景练习', type: 'method', expectedGain: '同理心 +2级' },
    ],
    finance: [
      { id: 'opp-f-1', title: '且慢 · 基金定投计划', description: '零基础理财入门，自动化投资策略', type: 'app', link: 'https://qieman.com', expectedGain: '投资认知 +2级' },
      { id: 'opp-f-2', title: '记账本 · 随手记', description: '养成记账习惯是储蓄纪律的第一步', type: 'tool', expectedGain: '储蓄纪律 +2~3级' },
    ],
  }
  return templates[dimensionKey] || templates.physical
}

// ─── Fallback (API 失败时) ───
function fallbackGoals(dimensionKey: DimensionKey, skills: SkillState[]): Goal[] {
  const templates: Record<DimensionKey, string[]> = {
    physical: ['完成3次力量训练', '跑步累计5公里', '每天拉伸15分钟'],
    energy: ['连续7天22:30前入睡', '完成5次25分钟番茄钟', '每天冥想10分钟'],
    career: ['完成1个技术文章', '学习2个新技能点', '输出1份项目总结'],
    social: ['主动联系3个朋友', '参加1次线下活动', '给同事正向反馈2次'],
    finance: ['记录本周所有支出', '学习1个理财概念', '设定月储蓄目标'],
  }
  return (templates[dimensionKey] || templates.physical).map((text, i) => ({
    id: `goal-fallback-${i}`,
    text,
    source: 'ai' as const,
    completed: false,
  }))
}

function fallbackActions(dimensionKey: DimensionKey, goals: Goal[], skills: SkillState[]): Action[] {
  const templates: Record<DimensionKey, { text: string; exp: number }[]> = {
    physical: [
      { text: '完成50个深蹲', exp: 12 },
      { text: '跑步2公里', exp: 15 },
      { text: '拉伸10分钟', exp: 8 },
    ],
    energy: [
      { text: '冥想10分钟', exp: 10 },
      { text: '完成3个番茄钟', exp: 15 },
      { text: '23:00前关灯', exp: 8 },
    ],
    career: [
      { text: '写500字技术笔记', exp: 15 },
      { text: '完成1个代码PR', exp: 20 },
      { text: '阅读技术文章30分钟', exp: 10 },
    ],
    social: [
      { text: '给朋友发一条问候', exp: 8 },
      { text: '午餐和同事一起', exp: 10 },
      { text: '回复所有未读消息', exp: 5 },
    ],
    finance: [
      { text: '记录今天所有支出', exp: 8 },
      { text: '学习一个理财概念', exp: 12 },
      { text: '检查订阅服务支出', exp: 10 },
    ],
  }
  return (templates[dimensionKey] || templates.physical).map((t, i) => ({
    id: `action-fallback-${i}`,
    text: t.text,
    goalId: goals[0]?.id ?? '',
    exp: t.exp,
    dimension: dimensionKey,
    skill: skills[i % skills.length]?.name ?? '',
    completed: false,
    source: 'ai' as const,
  }))
}
