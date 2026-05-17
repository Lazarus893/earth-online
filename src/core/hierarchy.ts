import type { DimensionKey } from '../App'

// ═══════════════════════════════════════════════════════
// Earth Online — 五层层级数据模型
// Status → Goals → Plans → Tasks → Actions
// ═══════════════════════════════════════════════════════

export interface HierarchyAction {
  id: string
  text: string
  exp: number
  dimension: DimensionKey
  completed: boolean
  source: 'ai' | 'user'
}

export interface HierarchyTask {
  id: string
  text: string
  frequency: 'daily' | 'weekly' | 'once'
  actions: HierarchyAction[]
  completed: boolean
}

export interface HierarchyPlan {
  id: string
  text: string
  timeframe: string // e.g. "每周4次", "每日", "2周内"
  tasks: HierarchyTask[]
  progress: number // 0-100
}

export interface HierarchyGoal {
  id: string
  text: string
  dimension: DimensionKey
  plans: HierarchyPlan[]
  progress: number // 0-100
  icon: string
}

/** 一组完整的发展方案 */
export interface DevelopmentScheme {
  id: string
  name: string
  style: 'balanced' | 'strength' | 'weakness'
  description: string
  goals: HierarchyGoal[]
}

/** 用户已选择的方案 — 持久化用 */
export interface SelectedScheme {
  schemeId: string
  schemeName: string
  schemeStyle: DevelopmentScheme['style']
  goals: HierarchyGoal[]
  selectedAt: string // ISO date
}

// ─── 持久化 ───
const SCHEME_STORAGE_KEY = 'earth-online-selected-scheme'

export function loadSelectedScheme(): SelectedScheme | null {
  try {
    const raw = localStorage.getItem(SCHEME_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSelectedScheme(scheme: SelectedScheme) {
  try {
    localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(scheme))
  } catch { /* quota exceeded */ }
}

// ─── 从 DevelopmentScheme 转换为 SelectedScheme ───
export function selectScheme(scheme: DevelopmentScheme): SelectedScheme {
  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    schemeStyle: scheme.style,
    goals: scheme.goals,
    selectedAt: new Date().toISOString(),
  }
}

// ─── 计算方案整体进度 ───
export function calculateSchemeProgress(scheme: SelectedScheme): number {
  if (scheme.goals.length === 0) return 0
  const totalProgress = scheme.goals.reduce((sum, g) => sum + g.progress, 0)
  return Math.round(totalProgress / scheme.goals.length)
}

// ─── 获取某维度下的所有 goals ───
export function getGoalsForDimension(scheme: SelectedScheme, dimension: DimensionKey): HierarchyGoal[] {
  return scheme.goals.filter(g => g.dimension === dimension)
}

// ─── 获取今日可执行的 actions ───
export function getTodayActions(scheme: SelectedScheme): HierarchyAction[] {
  const actions: HierarchyAction[] = []
  for (const goal of scheme.goals) {
    for (const plan of goal.plans) {
      for (const task of plan.tasks) {
        if (task.completed) continue
        for (const action of task.actions) {
          if (!action.completed) {
            actions.push(action)
          }
        }
      }
    }
  }
  return actions
}
