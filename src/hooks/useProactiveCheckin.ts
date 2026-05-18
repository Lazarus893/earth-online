/**
 * useProactiveCheckin — 主动 Check-in 触发检测
 *
 * 监控游戏状态，当达到以下阈值时触发 Oracle 主动关心：
 * 1. score-decay: 任意维度分数跌破 30
 * 2. streak-break: 连续打卡中断（之前 ≥7 天）
 * 3. quests-incomplete: 连续 2 天完成率 < 50%
 * 4. dimension-stagnant: 某维度 7 天无 EXP 增长
 *
 * 冷却机制：同类型 4h 一次，每日最多 2 次
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DimensionKey, DimensionData } from '../App'
import type { Quest } from './useGameState'
import {
  type CheckinTriggerType,
  type CheckinTrigger,
  generateCheckinMessage,
  determineSeverity,
} from '../data/checkinMessages'

const STORAGE_KEY = 'earth-online-checkin-history'
const COOLDOWN_HOURS = 4
const MAX_PER_DAY = 2

interface CheckinHistory {
  triggers: Array<{ type: CheckinTriggerType; timestamp: number }>
}

function loadCheckinHistory(): CheckinHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { triggers: [] }
    return JSON.parse(raw) as CheckinHistory
  } catch {
    return { triggers: [] }
  }
}

function saveCheckinHistory(history: CheckinHistory): void {
  try {
    // 只保留最近 7 天的记录
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    history.triggers = history.triggers.filter(t => t.timestamp > weekAgo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch { /* quota */ }
}

export function useProactiveCheckin(
  dimensions: DimensionData[],
  quests: Quest[],
  streak: number,
  onboardingDone: boolean
): {
  pendingCheckin: CheckinTrigger | null
  dismissCheckin: () => void
} {
  const [pendingCheckin, setPendingCheckin] = useState<CheckinTrigger | null>(null)
  const checkedRef = useRef(false)

  // 主检测逻辑 — 仅在 app 加载时和状态变化时运行一次
  useEffect(() => {
    if (!onboardingDone || checkedRef.current) return
    checkedRef.current = true

    // 延迟检测，不阻塞初始渲染
    const timer = setTimeout(() => {
      const trigger = detectTrigger(dimensions, quests, streak)
      if (trigger) {
        setPendingCheckin(trigger)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [onboardingDone])

  const dismissCheckin = useCallback(() => {
    if (pendingCheckin) {
      // 记录到历史
      const history = loadCheckinHistory()
      history.triggers.push({
        type: pendingCheckin.type,
        timestamp: Date.now(),
      })
      saveCheckinHistory(history)
    }
    setPendingCheckin(null)
  }, [pendingCheckin])

  return { pendingCheckin, dismissCheckin }
}

// ─── 检测逻辑 ───

function detectTrigger(
  dimensions: DimensionData[],
  quests: Quest[],
  streak: number
): CheckinTrigger | null {
  const history = loadCheckinHistory()
  const now = Date.now()

  // 检查每日限额
  const today = new Date().toISOString().slice(0, 10)
  const todayTriggers = history.triggers.filter(t =>
    new Date(t.timestamp).toISOString().slice(0, 10) === today
  )
  if (todayTriggers.length >= MAX_PER_DAY) return null

  // 检查冷却
  const canTrigger = (type: CheckinTriggerType): boolean => {
    const lastOfType = history.triggers
      .filter(t => t.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    if (!lastOfType) return true
    const hoursSince = (now - lastOfType.timestamp) / (1000 * 60 * 60)
    return hoursSince >= COOLDOWN_HOURS
  }

  // 1. Score decay — 任意维度 < 30
  if (canTrigger('score-decay')) {
    const lowDim = dimensions.find(d => !d.locked && d.score < 30)
    if (lowDim) {
      const lastTrigger = history.triggers.find(t => t.type === 'score-decay')
      return {
        type: 'score-decay',
        dimensionKey: lowDim.key,
        message: generateCheckinMessage('score-decay', { dimensionKey: lowDim.key }),
        severity: determineSeverity('score-decay', lastTrigger?.timestamp ?? null),
        triggeredAt: now,
      }
    }
  }

  // 2. Streak break — 之前 ≥7 天
  if (canTrigger('streak-break')) {
    // streak === 0 且之前有连续记录 → 我们从 localStorage 检查
    if (streak === 0) {
      try {
        const stateRaw = localStorage.getItem('earth-online-game-state')
        if (stateRaw) {
          const state = JSON.parse(stateRaw)
          const savedStreak = state.streak ?? 0
          if (savedStreak >= 7) {
            const lastTrigger = history.triggers.find(t => t.type === 'streak-break')
            return {
              type: 'streak-break',
              message: generateCheckinMessage('streak-break', { days: savedStreak }),
              severity: determineSeverity('streak-break', lastTrigger?.timestamp ?? null),
              triggeredAt: now,
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  // 3. Quests incomplete — 当前 quests 完成率 < 50% 且已是晚间
  if (canTrigger('quests-incomplete')) {
    const hour = new Date().getHours()
    if (hour >= 20) {
      const doneCount = quests.filter(q => q.done || (q as any).logged).length
      const completionRate = quests.length > 0 ? doneCount / quests.length : 1
      if (completionRate < 0.5) {
        const lastTrigger = history.triggers.find(t => t.type === 'quests-incomplete')
        return {
          type: 'quests-incomplete',
          message: generateCheckinMessage('quests-incomplete', {}),
          severity: determineSeverity('quests-incomplete', lastTrigger?.timestamp ?? null),
          triggeredAt: now,
        }
      }
    }
  }

  // 4. Dimension stagnant — 7 天没升级（简化实现：level=1 且 exp=0）
  if (canTrigger('dimension-stagnant')) {
    const stagnant = dimensions.find(d =>
      !d.locked && d.level <= 1 && d.exp === 0 && d.score < 50
    )
    if (stagnant) {
      const lastTrigger = history.triggers.find(t => t.type === 'dimension-stagnant')
      return {
        type: 'dimension-stagnant',
        dimensionKey: stagnant.key,
        message: generateCheckinMessage('dimension-stagnant', { dimensionKey: stagnant.key }),
        severity: determineSeverity('dimension-stagnant', lastTrigger?.timestamp ?? null),
        triggeredAt: now,
      }
    }
  }

  return null
}
