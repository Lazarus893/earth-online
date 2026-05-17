/**
 * useDimensionAdvisor — AI 顾问面板状态管理
 * 管理: 现状分析 / 目标推荐 / 今日行动
 * 持久化: localStorage 缓存当天数据
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DimensionKey } from '../App'
import { isApiKeyConfigured } from '../services/glm'
import {
  generateAnalysis,
  generateGoals,
  generateActions,
  generateOpportunities,
  type Goal,
  type Action,
  type Opportunity,
} from '../services/dimensionAdvisor'

interface SkillState {
  name: string
  level: number
  maxLevel: number
}

interface AdvisorCache {
  date: string  // YYYY-MM-DD
  analysis: string
  goals: Goal[]
  actions: Action[]
  opportunities: Opportunity[]
}

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'no-key'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getCacheKey(dimensionKey: DimensionKey): string {
  return `earth-online-advisor-${dimensionKey}`
}

function loadCache(dimensionKey: DimensionKey): AdvisorCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(dimensionKey))
    if (!raw) return null
    const cache: AdvisorCache = JSON.parse(raw)
    // 仅使用当天缓存
    if (cache.date !== todayKey()) return null
    return cache
  } catch {
    return null
  }
}

function saveCache(dimensionKey: DimensionKey, data: Omit<AdvisorCache, 'date'>) {
  try {
    const cache: AdvisorCache = { ...data, date: todayKey() }
    localStorage.setItem(getCacheKey(dimensionKey), JSON.stringify(cache))
  } catch { /* ignore */ }
}

export function useDimensionAdvisor(
  dimensionKey: DimensionKey,
  dimensionLabel: string,
  score: number,
  level: number,
  skills: SkillState[]
) {
  const [status, setStatus] = useState<Status>('idle')
  const [analysis, setAnalysis] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [editingAnalysis, setEditingAnalysis] = useState(false)
  const initRef = useRef(false)

  // 初始化：检查缓存 or 自动生成
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    if (!isApiKeyConfigured()) {
      setStatus('no-key')
      // 使用 fallback 数据
      loadFallback()
      return
    }

    const cache = loadCache(dimensionKey)
    if (cache) {
      setAnalysis(cache.analysis)
      setGoals(cache.goals)
      setActions(cache.actions)
      setOpportunities(cache.opportunities || [])
      setStatus('ready')
    } else {
      generateAll()
    }
  }, [dimensionKey])

  // 加载 fallback
  const loadFallback = useCallback(async () => {
    const fallbackGoals = await generateGoals(dimensionKey, dimensionLabel, skills)
    const fallbackActions = await generateActions(dimensionKey, fallbackGoals, skills)
    const fallbackOpps = await generateOpportunities(dimensionKey, dimensionLabel, skills)
    setAnalysis(getDefaultAnalysis(dimensionLabel, level, score))
    setGoals(fallbackGoals)
    setActions(fallbackActions)
    setOpportunities(fallbackOpps)
    setStatus('ready')
  }, [dimensionKey, dimensionLabel, level, score, skills])

  // 全量生成
  const generateAll = useCallback(async () => {
    setStatus('loading')
    try {
      const analysisText = await generateAnalysis(dimensionKey, dimensionLabel, score, level, skills)
      setAnalysis(analysisText)

      const newGoals = await generateGoals(dimensionKey, dimensionLabel, skills)
      setGoals(newGoals)

      const newActions = await generateActions(dimensionKey, newGoals, skills)
      setActions(newActions)

      const newOpps = await generateOpportunities(dimensionKey, dimensionLabel, skills)
      setOpportunities(newOpps)

      setStatus('ready')
      saveCache(dimensionKey, { analysis: analysisText, goals: newGoals, actions: newActions, opportunities: newOpps })
    } catch (err) {
      console.error('AI Advisor error:', err)
      setStatus('error')
      // fallback
      await loadFallback()
    }
  }, [dimensionKey, dimensionLabel, score, level, skills, loadFallback])

  // 重新生成现状
  const regenerateAnalysis = useCallback(async () => {
    if (!isApiKeyConfigured()) return
    setStatus('loading')
    try {
      const text = await generateAnalysis(dimensionKey, dimensionLabel, score, level, skills)
      setAnalysis(text)
      setStatus('ready')
      saveCache(dimensionKey, { analysis: text, goals, actions, opportunities })
    } catch {
      setStatus('ready') // 保留旧数据
    }
  }, [dimensionKey, dimensionLabel, score, level, skills, goals, actions])

  // 重新生成目标+行动
  const regenerateGoals = useCallback(async () => {
    if (!isApiKeyConfigured()) return
    setStatus('loading')
    try {
      const newGoals = await generateGoals(dimensionKey, dimensionLabel, skills)
      setGoals(newGoals)
      const newActions = await generateActions(dimensionKey, newGoals, skills)
      setActions(newActions)
      setStatus('ready')
      saveCache(dimensionKey, { analysis, goals: newGoals, actions: newActions, opportunities })
    } catch {
      setStatus('ready')
    }
  }, [dimensionKey, dimensionLabel, skills, analysis])

  // 手动编辑分析
  const editAnalysis = useCallback((text: string) => {
    setAnalysis(text)
    setEditingAnalysis(false)
    saveCache(dimensionKey, { analysis: text, goals, actions, opportunities })
  }, [dimensionKey, goals, actions])

  // 添加自定义目标
  const addGoal = useCallback((text: string) => {
    const newGoal: Goal = {
      id: `goal-user-${Date.now()}`,
      text,
      source: 'user',
      completed: false,
    }
    const updated = [...goals, newGoal]
    setGoals(updated)
    saveCache(dimensionKey, { analysis, goals: updated, actions, opportunities })
  }, [dimensionKey, analysis, goals, actions])

  // 完成行动 (返回 exp 值供外部 addExp 调用)
  const completeAction = useCallback((actionId: string): { exp: number; dimension: DimensionKey; skill: string } | null => {
    const action = actions.find(a => a.id === actionId)
    if (!action || action.completed) return null

    const updated = actions.map(a => a.id === actionId ? { ...a, completed: true } : a)
    setActions(updated)
    saveCache(dimensionKey, { analysis, goals, actions: updated, opportunities })

    return { exp: action.exp, dimension: action.dimension, skill: action.skill }
  }, [dimensionKey, analysis, goals, actions])

  return {
    status,
    analysis,
    goals,
    actions,
    opportunities,
    editingAnalysis,
    setEditingAnalysis,

    regenerateAnalysis,
    regenerateGoals,
    editAnalysis,
    addGoal,
    completeAction,
  }
}

function getDefaultAnalysis(label: string, level: number, score: number): string {
  if (score >= 70) return `你的${label}维度表现优秀（${score}分）。保持现有节奏，同时关注薄弱技能的提升。`
  if (score >= 40) return `你的${label}维度处于中等水平（${score}分）。有一定基础，但存在明显的提升空间。建议集中攻克1-2个核心技能。`
  return `你的${label}维度刚起步（${score}分）。不要急，从最基础的习惯开始建立，保持每天一点小进步。`
}
