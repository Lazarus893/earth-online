/**
 * 维度状态文案映射 — 将数值分数转为人类可读的状态描述
 *
 * 5 档文字标签（来自 v4.0 设计文档）：
 * - 不展示精确分数给用户，用文字+模糊视觉
 * - 内部仍然计算 0-100，但展示层用 5 档文案
 */

import type { DimensionKey } from '../App'

export type StatusTier = 1 | 2 | 3 | 4 | 5

/**
 * 每个维度在每个档位的状态描述
 */
export const DIMENSION_STATUS_LABELS: Record<DimensionKey, Record<StatusTier, string>> = {
  physical: { 5: '充沛', 4: '够用', 3: '有点紧', 2: '比较透支', 1: '撑不住了' },
  energy:   { 5: '方向清晰', 4: '大致清楚', 3: '偶尔模糊', 2: '经常迷茫', 1: '拧巴困住' },
  career:   { 5: '在升值', 4: '稳定', 3: '有点停滞', 2: '在退', 1: '完全停了' },
  social:   { 5: '有依靠', 4: '有几个', 3: '有但浅', 2: '几乎没有', 1: '一个人扛' },
  finance:  { 5: '很有底气', 4: '算够用', 3: '有点紧', 2: '压力大', 1: '很难撑' },
}

/**
 * 档位对应的情感色 — 用于 UI 着色
 */
export const STATUS_TIER_COLORS: Record<StatusTier, string> = {
  5: '#10B981', // green — 充沛/清晰
  4: '#06B6D4', // cyan — 够用/稳定
  3: '#F59E0B', // amber — 有点紧
  2: '#F97316', // orange — 透支/迷茫
  1: '#EF4444', // red — 撑不住/困住
}

/**
 * 分数 → 档位
 * 81-100 → 5, 61-80 → 4, 41-60 → 3, 21-40 → 2, 0-20 → 1
 */
export function scoreToTier(score: number): StatusTier {
  if (score >= 81) return 5
  if (score >= 61) return 4
  if (score >= 41) return 3
  if (score >= 21) return 2
  return 1
}

/**
 * 获取维度的状态描述文案
 */
export function getStatusLabel(dimension: DimensionKey, score: number): string {
  return DIMENSION_STATUS_LABELS[dimension][scoreToTier(score)]
}

/**
 * 获取档位对应的颜色
 */
export function getStatusColor(score: number): string {
  return STATUS_TIER_COLORS[scoreToTier(score)]
}
