import { createContext, useContext } from 'react'

/**
 * Demo Mode Context
 * 通过 Context 让子组件感知当前是否在 demo 模式中
 * 并提供注册回调的方式让 demo controller 控制子组件行为
 */

export interface DemoContextValue {
  /** 是否处于 demo 模式 */
  isDemo: boolean
  /** 当前 demo 阶段 */
  phase: DemoPhase | null
  /** 通知 demo controller 某个阶段已就绪 */
  notifyPhaseReady: (phase: string) => void
  /** 注册 Onboarding 的自动选择回调 */
  registerOnboardingSelect: (fn: (optionIndex: number) => void) => void
  /** 注册 PlanSelection 的自动选择回调 */
  registerPlanSelect: (fn: (schemeIndex: number) => void) => void
  /** 注册 Chat 消息注入回调 */
  registerChatInject: (fn: (msg: DemoChatMessage) => void) => void
  /** 注册 Chat 打开回调 */
  registerChatOpen: (fn: (open: boolean) => void) => void
  /** 注册 Quest 完成回调 */
  registerQuestComplete: (fn: (questId: string) => void) => void
  /** 注册 Quest 替换回调 */
  registerQuestReplace: (fn: (oldText: string, newText: string, newExp: number) => void) => void
  /** 注册通知显示回调 */
  registerNotification: (fn: (msg: { message: string; sub?: string; type: 'info' | 'success' | 'warning' }) => void) => void
}

export type DemoPhase = 'onboarding' | 'plan-selection' | 'dashboard' | 'chat' | 'complete'

export interface DemoChatMessage {
  role: 'user' | 'system'
  content: string
  typeSpeed?: number // ms per char for typing effect
}

const defaultContext: DemoContextValue = {
  isDemo: false,
  phase: null,
  notifyPhaseReady: () => {},
  registerOnboardingSelect: () => {},
  registerPlanSelect: () => {},
  registerChatInject: () => {},
  registerChatOpen: () => {},
  registerQuestComplete: () => {},
  registerQuestReplace: () => {},
  registerNotification: () => {},
}

export const DemoContext = createContext<DemoContextValue>(defaultContext)

export function useDemoContext() {
  return useContext(DemoContext)
}
