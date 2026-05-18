import { useState, useCallback, useRef } from 'react'
import type { DimensionKey, DimensionData } from '../App'
import { syncToCloud } from '../services/cloudSync'

// ─── 等级经验曲线 (来自 config/game-balance.json) ───
const BASE_EXP = 100
const GROWTH_RATE = 1.15

function expForLevel(level: number): number {
  return Math.floor(BASE_EXP * Math.pow(GROWTH_RATE, level - 1))
}

// ─── 解锁条件 (来自 config/unlock-rules.json) ───
const UNLOCK_CONDITIONS: Record<DimensionKey, { dimension: DimensionKey; minLevel: number }[]> = {
  physical: [],
  energy: [],
  career: [],
  social: [
    { dimension: 'energy', minLevel: 5 },
    { dimension: 'career', minLevel: 3 },
  ],
  finance: [
    { dimension: 'career', minLevel: 5 },
    { dimension: 'physical', minLevel: 3 },
  ],
}

// ─── Quest 定义 ───
export interface Quest {
  id: string
  text: string
  dimension: DimensionKey
  exp: number
  done: boolean
  logged?: boolean          // v4 别名 — 等同 done，迁移兼容
  loggedAt?: number         // 记录时间戳
  note?: string             // 用户备注
  priority?: 'high' | 'medium' | 'low' // deprecated, 保留兼容
  sourceActionId?: string   // hierarchy action 来源 ID
}

const QUEST_POOL: Record<string, { text: string; dimension: DimensionKey; exp: number }[]> = {
  physical: [
    { text: '30min 有氧运动', dimension: 'physical', exp: 18 },
    { text: '50个深蹲', dimension: 'physical', exp: 12 },
    { text: '跑步2公里', dimension: 'physical', exp: 15 },
    { text: '拉伸15分钟', dimension: 'physical', exp: 8 },
    { text: '做3组俯卧撑', dimension: 'physical', exp: 10 },
  ],
  energy: [
    { text: '冥想10分钟', dimension: 'energy', exp: 10 },
    { text: '23:00前关灯睡觉', dimension: 'energy', exp: 12 },
    { text: '午间小憩20分钟', dimension: 'energy', exp: 8 },
    { text: '完成3个番茄钟', dimension: 'energy', exp: 15 },
  ],
  career: [
    { text: '完成技术日报', dimension: 'career', exp: 24 },
    { text: '阅读30页', dimension: 'career', exp: 15 },
    { text: '写500字笔记', dimension: 'career', exp: 18 },
    { text: '学习一个新概念', dimension: 'career', exp: 12 },
    { text: '完成一个代码PR', dimension: 'career', exp: 20 },
  ],
}

function generateDailyQuests(): Quest[] {
  const pool = Object.values(QUEST_POOL).flat()
  // Shuffle using Fisher-Yates and pick 5
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 5).map((q, i) => ({
    id: `quest-${Date.now()}-${i}`,
    ...q,
    done: false,
  }))
}

// ─── 游戏事件 (动画触发) ───
export interface GameEvent {
  type: 'level-up' | 'unlock'
  dimensionKey: DimensionKey
  newLevel?: number
  dimensionLabel?: string
  dimensionColor?: string
}

// ─── 默认维度数据 ───
const DEFAULT_DIMENSIONS: DimensionData[] = [
  { key: 'physical', label: '体力', labelEn: 'Physical', icon: '⚔', color: '#FF6B35', level: 1, exp: 0, expMax: 100, score: 50, locked: false },
  { key: 'energy', label: '精力', labelEn: 'Energy', icon: '⚡', color: '#7C3AED', level: 1, exp: 0, expMax: 100, score: 50, locked: false },
  { key: 'career', label: '职业', labelEn: 'Career', icon: '🎯', color: '#06B6D4', level: 1, exp: 0, expMax: 100, score: 50, locked: false },
  { key: 'social', label: '社交', labelEn: 'Social', icon: '🤝', color: '#F59E0B', level: 0, exp: 0, expMax: 100, score: 0, locked: true },
  { key: 'finance', label: '金钱', labelEn: 'Finance', icon: '💎', color: '#10B981', level: 0, exp: 0, expMax: 100, score: 0, locked: true },
]

// ─── 持久化 key ───
const STORAGE_KEY = 'earth-online-game-state'

interface PersistedState {
  dimensions: DimensionData[]
  quests: Quest[]
  streak: number
  onboardingDone: boolean
  lastQuestDate: string
  lastActiveDate: string // last day the user completed at least one quest
}

// ─── Streak 乘数 (来自 config/game-balance.json) ───
function getStreakMultiplier(streak: number): number {
  if (streak >= 90) return 3.0
  if (streak >= 30) return 2.0
  if (streak >= 14) return 1.8
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.2
  return 1.0
}

// ─── 衰减系统 (来自 config/game-balance.json) ───
function applyDecay(dimensions: DimensionData[], lastActiveDate: string | undefined): DimensionData[] {
  if (!lastActiveDate) return dimensions

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastActive = new Date(lastActiveDate)
  lastActive.setHours(0, 0, 0, 0)
  const daysSinceActive = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

  // Grace period: 2 days
  if (daysSinceActive <= 2) return dimensions

  const decayDays = daysSinceActive - 2
  const decayRate = 0.01 // 1% per day

  return dimensions.map(dim => {
    if (dim.locked) return dim
    const decay = Math.floor(dim.score * decayRate * decayDays)
    if (decay === 0) return dim
    const newScore = Math.max(10, dim.score - decay) // minimum 10
    return { ...dim, score: newScore }
  })
}

// ─── 计算 streak (app load) ───
function calculateStreak(lastActiveDate: string | undefined, currentStreak: number): number {
  if (!lastActiveDate) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastActive = new Date(lastActiveDate)
  lastActive.setHours(0, 0, 0, 0)
  const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff === 0) return currentStreak // already active today
  if (daysDiff === 1) return currentStreak // yesterday — streak continues, will increment on first quest today
  return 0 // more than 1 day gap — streak broken
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded — silently fail for MVP */ }
}

// ─── Hook ───
export function useGameState(patchModifiers?: Record<string, number>) {
  const saved = loadState()

  const [dimensions, setDimensions] = useState<DimensionData[]>(() => {
    let dims: DimensionData[]
    if (saved?.dimensions) {
      dims = saved.dimensions
    } else {
      // 兼容旧的 onboarding 数据
      const oldScores = localStorage.getItem('earth-online-scores')
      if (oldScores) {
        try {
          const scores = JSON.parse(oldScores)
          dims = DEFAULT_DIMENSIONS.map(dim => ({
            ...dim,
            score: scores[dim.key] ?? dim.score,
          }))
        } catch {
          dims = DEFAULT_DIMENSIONS
        }
      } else {
        dims = DEFAULT_DIMENSIONS
      }
    }
    // Apply decay on app load
    return applyDecay(dims, saved?.lastActiveDate)
  })

  const [quests, setQuests] = useState<Quest[]>(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (saved?.lastQuestDate === today && saved?.quests) {
      return saved.quests
    }
    // New day or first load — generate fresh quests and persist immediately
    const freshQuests = generateDailyQuests()
    saveState({
      dimensions: saved?.dimensions ?? DEFAULT_DIMENSIONS,
      quests: freshQuests,
      streak: saved?.streak ?? 0,
      onboardingDone: saved?.onboardingDone ?? false,
      lastQuestDate: today,
      lastActiveDate: saved?.lastActiveDate ?? '',
    })
    return freshQuests
  })
  const [streak, setStreak] = useState(() => calculateStreak(saved?.lastActiveDate, saved?.streak ?? 0))
  const [lastActiveDate, setLastActiveDate] = useState<string>(saved?.lastActiveDate ?? '')
  const [onboardingDone, setOnboardingDone] = useState(
    saved?.onboardingDone ?? !!localStorage.getItem('earth-online-onboarding-done')
  )

  // 事件队列 — 用于触发动画 (level-up, unlock)
  const [pendingEvents, setPendingEvents] = useState<GameEvent[]>([])
  const eventQueueRef = useRef<GameEvent[]>([])

  // ─── 持久化 ───
  const persist = useCallback((dims: DimensionData[], qs: Quest[], s: number, ob: boolean, activeDate?: string) => {
    const today = new Date().toISOString().slice(0, 10)
    saveState({ dimensions: dims, quests: qs, streak: s, onboardingDone: ob, lastQuestDate: today, lastActiveDate: activeDate ?? lastActiveDate })
    syncToCloud({ dimensions: dims, quests: qs, streak: s, onboardingDone: ob })
  }, [lastActiveDate])

  // ─── 检查解锁条件 ───
  const checkUnlocks = useCallback((dims: DimensionData[]): DimensionData[] => {
    let changed = false
    const updated = dims.map(dim => {
      if (!dim.locked) return dim
      const conditions = UNLOCK_CONDITIONS[dim.key]
      if (!conditions || conditions.length === 0) return dim

      const met = conditions.every(cond => {
        const target = dims.find(d => d.key === cond.dimension)
        return target && !target.locked && target.level >= cond.minLevel
      })

      if (met) {
        changed = true
        eventQueueRef.current.push({
          type: 'unlock',
          dimensionKey: dim.key,
          dimensionLabel: dim.label,
          dimensionColor: dim.color,
        })
        return { ...dim, locked: false, level: 1, exp: 0, expMax: expForLevel(1), score: 30 }
      }
      return dim
    })

    return changed ? updated : dims
  }, [])

  // ─── 给维度加经验 ───
  const addExp = useCallback((dimensionKey: DimensionKey, amount: number) => {
    // EXP = base × streak_multiplier × (1 + patch_modifier/100)
    const streakMult = getStreakMultiplier(streak)
    const patchPct = patchModifiers?.[dimensionKey] ?? 0
    const patchMult = 1 + patchPct / 100
    const actualAmount = Math.round(amount * streakMult * patchMult)

    setDimensions(prev => {
      let dims = prev.map(dim => {
        if (dim.key !== dimensionKey || dim.locked) return dim

        let newExp = dim.exp + actualAmount
        let newLevel = dim.level
        let newExpMax = dim.expMax

        // 升级循环
        while (newExp >= newExpMax) {
          newExp -= newExpMax
          newLevel++
          newExpMax = expForLevel(newLevel)
          eventQueueRef.current.push({
            type: 'level-up',
            dimensionKey: dim.key,
            newLevel,
            dimensionColor: dim.color,
          })
        }

        // score 随等级增长 (简单公式: base + level * 3, 上限100)
        const newScore = Math.min(100, dim.score + (newLevel - dim.level) * 3)

        return {
          ...dim,
          exp: newExp,
          level: newLevel,
          expMax: newExpMax,
          score: newScore,
        }
      })

      // 检查是否触发解锁
      dims = checkUnlocks(dims)

      // 刷新事件队列
      if (eventQueueRef.current.length > 0) {
        setPendingEvents([...eventQueueRef.current])
        eventQueueRef.current = []
      }

      persist(dims, quests, streak, onboardingDone)
      return dims
    })
  }, [checkUnlocks, persist, quests, streak, onboardingDone, patchModifiers])

  // ─── 完成任务 ───
  const completeQuest = useCallback((questId: string) => {
    const today = new Date().toISOString().slice(0, 10)

    // Update streak on quest completion
    let newStreak = streak
    let newActiveDate = lastActiveDate
    if (lastActiveDate !== today) {
      // First quest completed today — update streak
      if (lastActiveDate === '') {
        // First ever quest
        newStreak = 1
      } else {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)
        if (lastActiveDate === yesterdayStr) {
          // Consecutive day — increment streak
          newStreak = streak + 1
        } else {
          // Gap — reset streak
          newStreak = 1
        }
      }
      newActiveDate = today
      setStreak(newStreak)
      setLastActiveDate(newActiveDate)
    }

    setQuests(prev => {
      const quest = prev.find(q => q.id === questId)
      if (!quest || quest.done) return prev

      const updated = prev.map(q => q.id === questId ? { ...q, done: true, logged: true, loggedAt: Date.now() } : q)

      // 异步加经验 (避免 setState 嵌套)
      setTimeout(() => addExp(quest.dimension, quest.exp), 0)

      persist(dimensions, updated, newStreak, onboardingDone, newActiveDate)
      return updated
    })
  }, [addExp, persist, dimensions, streak, lastActiveDate, onboardingDone])

  // ─── 消费一个事件 (动画播完后调用) ───
  const consumeEvent = useCallback(() => {
    setPendingEvents(prev => prev.slice(1))
  }, [])

  // ─── Onboarding 完成 ───
  const completeOnboarding = useCallback((scores: Record<DimensionKey, number>) => {
    const updated = DEFAULT_DIMENSIONS.map(dim => ({
      ...dim,
      score: scores[dim.key] ?? dim.score,
    }))
    setDimensions(updated)
    setOnboardingDone(true)
    // 兼容旧的 localStorage key
    localStorage.setItem('earth-online-onboarding-done', 'true')
    localStorage.setItem('earth-online-scores', JSON.stringify(scores))
    persist(updated, quests, streak, true)
  }, [persist, quests, streak])

  // ─── 替换每日日志条目（AI 生成后调用） ───
  const replaceQuests = useCallback((newQuests: Quest[]) => {
    setQuests(newQuests)
    persist(dimensions, newQuests, streak, onboardingDone)
  }, [dimensions, persist, streak, onboardingDone])

  // ─── 计算玩家总等级 ───
  const playerLevel = dimensions
    .filter(d => !d.locked)
    .reduce((sum, d) => sum + d.level, 0)

  const playerExp = dimensions
    .filter(d => !d.locked)
    .reduce((sum, d) => sum + d.exp, 0)

  const playerExpMax = dimensions
    .filter(d => !d.locked)
    .reduce((sum, d) => sum + d.expMax, 0)

  const currentEvent = pendingEvents[0] ?? null

  return {
    // 状态
    dimensions,
    quests,
    streak,
    onboardingDone,
    playerLevel,
    playerExp,
    playerExpMax,

    // 事件
    currentEvent,
    consumeEvent,

    // 动作
    completeQuest,
    addExp,
    completeOnboarding,
    replaceQuests,
  }
}
