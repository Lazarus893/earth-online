/**
 * useSceneContext — 从 App 视图状态派生当前场景
 *
 * 供 chat 系统使用，让 AI 知道用户当前在哪个页面、
 * 正在查看什么维度，有哪些相关的 goals 可以参考。
 */

import { useMemo } from 'react'
import type { DimensionKey } from '../App'
import type { SceneContext } from '../core/contextEngine'
import { loadSelectedScheme, getGoalsForDimension } from '../core/hierarchy'

type AppView = 'onboarding' | 'plan-selection' | 'dashboard' | 'dimension'

export function useSceneContext(
  currentView: AppView,
  selectedDimension: DimensionKey | null
): SceneContext {
  return useMemo(() => {
    if (currentView === 'onboarding' || currentView === 'plan-selection') {
      return { scene: 'onboarding' as const }
    }

    if (currentView === 'dimension' && selectedDimension) {
      const scheme = loadSelectedScheme()
      const goals = scheme ? getGoalsForDimension(scheme, selectedDimension) : []

      // 收集最近完成的 actions（从 goals 中找 completed 的）
      const recentActions: string[] = []
      for (const goal of goals) {
        for (const plan of goal.plans) {
          for (const task of plan.tasks) {
            for (const action of task.actions) {
              if (action.completed) {
                recentActions.push(action.text)
              }
            }
          }
        }
      }

      return {
        scene: 'dimension-detail' as const,
        dimensionKey: selectedDimension,
        hierarchyGoals: goals,
        recentActions: recentActions.slice(-5), // 最近 5 个
      }
    }

    return { scene: 'dashboard' as const }
  }, [currentView, selectedDimension])
}
