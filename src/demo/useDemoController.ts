import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { buildDemoScript, type DemoStep } from './demoScript'
import type { DemoPhase, DemoChatMessage, DemoContextValue } from './DemoContext'

/**
 * useDemoController — Demo 脚本执行引擎
 *
 * 驱动 demo 时间轴，按顺序执行每个步骤
 * 通过注册的回调函数控制子组件行为
 */

export function useDemoController(enabled: boolean) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [phase, setPhase] = useState<DemoPhase | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [cursorTarget, setCursorTarget] = useState<{ x: number; y: number } | null>(null)

  const steps = useMemo(() => buildDemoScript(), [])
  const timerRef = useRef<number | null>(null)
  const phaseReadyRef = useRef<Record<string, boolean>>({})

  // 注册回调 refs
  const onboardingSelectRef = useRef<((optionIndex: number) => void) | null>(null)
  const planSelectRef = useRef<((schemeIndex: number) => void) | null>(null)
  const chatInjectRef = useRef<((msg: DemoChatMessage) => void) | null>(null)
  const chatOpenRef = useRef<((open: boolean) => void) | null>(null)
  const questCompleteRef = useRef<((questId: string) => void) | null>(null)
  const questReplaceRef = useRef<((oldText: string, newText: string, newExp: number) => void) | null>(null)
  const notificationRef = useRef<((msg: { message: string; sub?: string; type: 'info' | 'success' | 'warning' }) => void) | null>(null)

  // 注册函数
  const registerOnboardingSelect = useCallback((fn: (optionIndex: number) => void) => {
    onboardingSelectRef.current = fn
  }, [])

  const registerPlanSelect = useCallback((fn: (schemeIndex: number) => void) => {
    planSelectRef.current = fn
  }, [])

  const registerChatInject = useCallback((fn: (msg: DemoChatMessage) => void) => {
    chatInjectRef.current = fn
  }, [])

  const registerChatOpen = useCallback((fn: (open: boolean) => void) => {
    chatOpenRef.current = fn
  }, [])

  const registerQuestComplete = useCallback((fn: (questId: string) => void) => {
    questCompleteRef.current = fn
  }, [])

  const registerQuestReplace = useCallback((fn: (oldText: string, newText: string, newExp: number) => void) => {
    questReplaceRef.current = fn
  }, [])

  const registerNotification = useCallback((fn: (msg: { message: string; sub?: string; type: 'info' | 'success' | 'warning' }) => void) => {
    notificationRef.current = fn
  }, [])

  // 通知 phase 就绪（子组件渲染完成后调用）
  // 用 ref 存储 pending start 标记，由下方 effect 触发
  const pendingStartRef = useRef(false)

  const notifyPhaseReady = useCallback((phaseName: string) => {
    phaseReadyRef.current[phaseName] = true
    if (phaseName === 'questions') {
      pendingStartRef.current = true
    }
  }, [])

  // 执行单个步骤
  const executeStep = useCallback((step: DemoStep) => {
    setPhase(step.phase as DemoPhase)

    switch (step.action) {
      case 'wait':
        // 纯等待，不做任何事
        break

      case 'select-option': {
        const payload = step.payload as { questionIndex: number; optionIndex: number }
        // 光标飞到选项位置（垂直分布，大约 40%-80% 的 y 区间）
        const yPos = 45 + payload.optionIndex * 14
        setCursorTarget({ x: 50, y: yPos })
        setTimeout(() => {
          if (onboardingSelectRef.current) {
            onboardingSelectRef.current(payload.optionIndex)
          }
          setTimeout(() => setCursorTarget(null), 300)
        }, 400)
        break
      }

      case 'select-plan': {
        const payload = step.payload as { schemeIndex: number }
        // 光标飞到第2张卡片中心（三栏布局中间）
        setCursorTarget({ x: 50, y: 55 })
        setTimeout(() => {
          if (planSelectRef.current) {
            planSelectRef.current(payload.schemeIndex)
          }
          setTimeout(() => setCursorTarget(null), 400)
        }, 600)
        break
      }

      case 'open-chat': {
        // 移动光标到右下角 chat 按钮位置
        setCursorTarget({ x: 96, y: 93 })
        setTimeout(() => {
          if (chatOpenRef.current) chatOpenRef.current(true)
        }, 800)
        break
      }

      case 'close-chat': {
        if (chatOpenRef.current) chatOpenRef.current(false)
        setCursorTarget(null)
        break
      }

      case 'chat-message': {
        const payload = step.payload as DemoChatMessage
        if (chatInjectRef.current) {
          chatInjectRef.current(payload)
        }
        break
      }

      case 'replace-quest': {
        const payload = step.payload as { oldText: string; newText: string; newExp: number }
        if (questReplaceRef.current) {
          questReplaceRef.current(payload.oldText, payload.newText, payload.newExp)
        }
        break
      }

      case 'complete-quest': {
        const payload = step.payload as { questText: string }
        // 使用 questText 来找到对应 quest 并完成
        if (questCompleteRef.current) {
          questCompleteRef.current(payload.questText)
        }
        break
      }

      case 'show-notification': {
        const payload = step.payload as { message: string; sub?: string; type: 'info' | 'success' | 'warning' }
        if (notificationRef.current) {
          notificationRef.current(payload)
        }
        break
      }
    }
  }, [])

  // 推进到下一步
  const advance = useCallback(() => {
    setCurrentStepIndex(prev => {
      const nextIndex = prev + 1
      if (nextIndex >= steps.length) {
        setIsRunning(false)
        setPhase('complete')
        return prev
      }

      const nextStep = steps[nextIndex]
      // 用 delay 来定时执行
      timerRef.current = window.setTimeout(() => {
        executeStep(nextStep)
        // 执行后继续推进
        advance()
      }, nextStep.delay)

      return nextIndex
    })
  }, [steps, executeStep])

  // 启动 demo
  useEffect(() => {
    if (!enabled) return

    // Demo 模式需要干净状态：清除 localStorage
    localStorage.removeItem('earth-online-game-state')
    localStorage.removeItem('earth-online-onboarding-done')
    localStorage.removeItem('earth-online-scores')
    localStorage.removeItem('earth-online-chat-history')
    localStorage.removeItem('earth-online-beginner-done')

    // 等待 Onboarding 进入 questions 阶段后开始
    // 预计前置动画约 18s，但我们用事件驱动而非固定等待
    setIsRunning(true)
    setPhase('onboarding')

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [enabled])

  // 当 Onboarding 进入 questions 阶段时开始执行
  const startQuestions = useCallback(() => {
    if (!isRunning || currentStepIndex >= 0) return
    // 开始推进
    const firstStep = steps[0]
    timerRef.current = window.setTimeout(() => {
      setCurrentStepIndex(0)
      executeStep(firstStep)
      advance()
    }, firstStep.delay)
  }, [isRunning, currentStepIndex, steps, executeStep, advance])

  // 监听 pendingStart 并触发
  useEffect(() => {
    if (pendingStartRef.current && isRunning && currentStepIndex < 0) {
      pendingStartRef.current = false
      startQuestions()
    }
  })

  // 构建 Context Value
  const contextValue: DemoContextValue = useMemo(() => ({
    isDemo: enabled,
    phase,
    notifyPhaseReady,
    registerOnboardingSelect,
    registerPlanSelect,
    registerChatInject,
    registerChatOpen,
    registerQuestComplete,
    registerQuestReplace,
    registerNotification,
  }), [enabled, phase, notifyPhaseReady, registerOnboardingSelect, registerPlanSelect, registerChatInject, registerChatOpen, registerQuestComplete, registerQuestReplace, registerNotification])

  return {
    contextValue,
    isRunning,
    currentStepIndex,
    totalSteps: steps.length,
    progress: steps.length > 0 ? Math.max(0, currentStepIndex) / steps.length : 0,
    cursorTarget,
    startQuestions,
    notifyPhaseReady,
  }
}
