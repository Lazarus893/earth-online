import type { DimensionKey } from '../App'
import type { QuestionOption, Difficulty } from '../data/questions'
import { PRIORITY_MAP, DIFFICULTY_MAP } from '../data/questions'

const DIMENSION_KEYS: DimensionKey[] = ['physical', 'energy', 'career', 'social', 'finance']
const BASE_SCORE = 50
const SCORE_MULTIPLIER = 5
const MIN_SCORE = 10
const MAX_SCORE = 90

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export interface OnboardingResult {
  scores: Record<DimensionKey, number>
  priority: DimensionKey
  difficulty: Difficulty
  lowestDimension: DimensionKey
  highestDimension: DimensionKey
}

export function calculateScores(selectedOptions: QuestionOption[]): Record<DimensionKey, number> {
  const scores: Record<DimensionKey, number> = {
    physical: BASE_SCORE,
    energy: BASE_SCORE,
    career: BASE_SCORE,
    social: BASE_SCORE,
    finance: BASE_SCORE,
  }

  for (const option of selectedOptions) {
    for (const [dim, delta] of Object.entries(option.impacts)) {
      const key = dim as DimensionKey
      if (DIMENSION_KEYS.includes(key)) {
        scores[key] += (delta as number) * SCORE_MULTIPLIER
      }
    }
  }

  // Clamp all scores
  for (const key of DIMENSION_KEYS) {
    scores[key] = clamp(scores[key], MIN_SCORE, MAX_SCORE)
  }

  return scores
}

export function getLowestDimension(scores: Record<DimensionKey, number>): DimensionKey {
  const unlocked: DimensionKey[] = ['physical', 'energy', 'career']
  let lowest: DimensionKey = unlocked[0]
  for (const key of unlocked) {
    if (scores[key] < scores[lowest]) {
      lowest = key
    }
  }
  return lowest
}

export function getHighestDimension(scores: Record<DimensionKey, number>): DimensionKey {
  const unlocked: DimensionKey[] = ['physical', 'energy', 'career']
  let highest: DimensionKey = unlocked[0]
  for (const key of unlocked) {
    if (scores[key] > scores[highest]) {
      highest = key
    }
  }
  return highest
}

export function computeOnboardingResult(selectedOptions: QuestionOption[]): OnboardingResult {
  const scores = calculateScores(selectedOptions)

  // 从 Q5 获取用户选择的优先级
  const q5Option = selectedOptions.find(opt => opt.id.startsWith('q5'))
  const priority = q5Option ? (PRIORITY_MAP[q5Option.id] || 'energy') : 'energy'

  // 从 Q6 获取难度偏好
  const q6Option = selectedOptions.find(opt => opt.id.startsWith('q6'))
  const difficulty = q6Option ? (DIFFICULTY_MAP[q6Option.id] || 'medium') : 'medium'

  return {
    scores,
    priority,
    difficulty,
    lowestDimension: getLowestDimension(scores),
    highestDimension: getHighestDimension(scores),
  }
}

/**
 * 从逐轮累加的信号直接计算结果（动态 AI onboarding 使用）
 * 不再依赖 QuestionOption[]，而是用每轮 AI 返回的维度信号累加
 */
export function computeResultFromSignals(
  accumulatedSignals: Partial<Record<DimensionKey, number>>,
  priority: DimensionKey,
  difficulty: Difficulty
): OnboardingResult {
  const scores: Record<DimensionKey, number> = {
    physical: BASE_SCORE,
    energy: BASE_SCORE,
    career: BASE_SCORE,
    social: BASE_SCORE,
    finance: BASE_SCORE,
  }

  // 将累加信号应用到分数
  for (const [dim, delta] of Object.entries(accumulatedSignals)) {
    const key = dim as DimensionKey
    if (DIMENSION_KEYS.includes(key) && typeof delta === 'number') {
      scores[key] += delta * SCORE_MULTIPLIER
    }
  }

  // Clamp
  for (const key of DIMENSION_KEYS) {
    scores[key] = clamp(scores[key], MIN_SCORE, MAX_SCORE)
  }

  return {
    scores,
    priority,
    difficulty,
    lowestDimension: getLowestDimension(scores),
    highestDimension: getHighestDimension(scores),
  }
}
