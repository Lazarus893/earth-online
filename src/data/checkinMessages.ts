/**
 * 主动 Check-in 消息模板
 *
 * 当系统检测到用户状态达到临界阈值时，
 * Oracle 会主动发出温暖的 check-in 消息。
 *
 * 设计原则（来自 v4.0）：
 * - 不评判、不施压
 * - 温暖但不空洞
 * - 给用户选择权（可以忽略）
 * - 具体但不指令化
 */

import type { DimensionKey } from '../App'

export type CheckinTriggerType =
  | 'score-decay'          // 维度分数跌破 30（衰减阈值）
  | 'streak-break'         // 连续打卡中断（之前 ≥7 天）
  | 'quests-incomplete'    // 连续 2 天完成率 < 50%
  | 'dimension-stagnant'   // 某维度 7 天无 EXP 增长

export interface CheckinTrigger {
  type: CheckinTriggerType
  dimensionKey?: DimensionKey
  message: string
  severity: 'gentle' | 'concerned'
  triggeredAt: number
}

/**
 * 维度中文名映射
 */
const DIM_NAMES: Record<DimensionKey, string> = {
  physical: '体力',
  energy: '精力',
  career: '职业',
  social: '社交',
  finance: '金钱',
}

/**
 * 每种触发类型的消息模板池（随机选取，避免重复感）
 * {dimension} 会被替换为具体维度名
 * {days} 会被替换为具体天数
 */
const MESSAGE_TEMPLATES: Record<CheckinTriggerType, string[]> = {
  'score-decay': [
    '我注意到你最近在{dimension}上好像有点吃力。不着急，想聊聊吗？',
    '{dimension}那边的状态有点往下走。什么在消耗你？',
    '你的{dimension}维度最近有点疲惫的迹象。有什么我能帮到的吗？',
  ],
  'streak-break': [
    '好久不见。之前连续{days}天的势头挺好的，最近怎么样？',
    '中断了也没关系。之前坚持了{days}天呢。想聊聊最近的状态吗？',
    '嘿，{days}天的连续记录断了——不用有压力，只是想看看你还好吗。',
  ],
  'quests-incomplete': [
    '最近两天的记录都没怎么填。是太忙了，还是那些事情本身不太对？',
    '我看到最近的记录有点空。没关系——要不要调整一下今天的安排？',
    '连着两天没怎么记录了。是我安排的内容不太合适，还是这两天本身比较难？',
  ],
  'dimension-stagnant': [
    '{dimension}已经在原地待了一阵子了。你自己有感觉吗？',
    '{dimension}维度最近没什么动静。是暂时搁置了，还是卡在什么地方？',
    '你的{dimension}好像进入了平台期。想一起看看可以怎么调整吗？',
  ],
}

/**
 * 根据触发类型和上下文生成 check-in 消息
 */
export function generateCheckinMessage(
  type: CheckinTriggerType,
  context: { dimensionKey?: DimensionKey; days?: number }
): string {
  const templates = MESSAGE_TEMPLATES[type]
  const template = templates[Math.floor(Math.random() * templates.length)]

  let message = template
  if (context.dimensionKey) {
    message = message.replace(/{dimension}/g, DIM_NAMES[context.dimensionKey])
  }
  if (context.days !== undefined) {
    message = message.replace(/{days}/g, String(context.days))
  }

  return message
}

/**
 * 判断触发严重度
 * - gentle: 首次触发，温和提醒
 * - concerned: 同一条件 48h 内再次触发，加深关注
 */
export function determineSeverity(
  type: CheckinTriggerType,
  lastTriggerTime: number | null
): 'gentle' | 'concerned' {
  if (!lastTriggerTime) return 'gentle'
  const hoursSinceLast = (Date.now() - lastTriggerTime) / (1000 * 60 * 60)
  return hoursSinceLast < 48 ? 'concerned' : 'gentle'
}
