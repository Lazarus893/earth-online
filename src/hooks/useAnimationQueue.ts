import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * 统一动画队列 — 所有全屏动画事件按优先级排队播放
 *
 * 优先级: hp-warning > level-up > unlock > notification
 * 同优先级内按入队顺序 (FIFO)
 */

export type AnimationEventType = 'notification' | 'hp-warning' | 'level-up' | 'unlock' | 'checkin'

export interface AnimationEvent {
  id: string
  type: AnimationEventType
  payload: any
  /** 自动超时 (ms) — 防止动画组件卡住不调 dequeue */
  duration?: number
}

// 优先级映射 (数值越大优先级越高)
const PRIORITY: Record<AnimationEventType, number> = {
  'hp-warning': 40,
  'level-up': 30,
  'unlock': 20,
  'notification': 10,
  'checkin': 5,
}

let idCounter = 0
function genId(): string {
  return `anim-${Date.now()}-${++idCounter}`
}

export function useAnimationQueue() {
  const [queue, setQueue] = useState<AnimationEvent[]>([])
  const timeoutRef = useRef<number | null>(null)

  const currentEvent = queue[0] ?? null

  // 入队 — 按优先级插入（高优先级排前面，同优先级 FIFO）
  const enqueue = useCallback((event: Omit<AnimationEvent, 'id'> & { id?: string }) => {
    const fullEvent: AnimationEvent = {
      id: event.id || genId(),
      type: event.type,
      payload: event.payload,
      duration: event.duration,
    }

    setQueue(prev => {
      // 找到第一个比当前事件优先级低的位置
      const priority = PRIORITY[fullEvent.type]
      let insertIndex = prev.length
      for (let i = 0; i < prev.length; i++) {
        // 第一个元素（正在播放的）不参与排序
        if (i === 0) continue
        if (PRIORITY[prev[i].type] < priority) {
          insertIndex = i
          break
        }
      }
      const next = [...prev]
      next.splice(insertIndex, 0, fullEvent)
      return next
    })
  }, [])

  // 出队 — 当前动画播完后调用
  const dequeue = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setQueue(prev => prev.slice(1))
  }, [])

  // 清空队列
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setQueue([])
  }, [])

  // 自动超时保护 — 防止动画永远不结束
  useEffect(() => {
    if (!currentEvent) return

    // 默认超时: notification 4s, hp-warning 5s, level-up 6s, unlock 6s
    const defaultDurations: Record<AnimationEventType, number> = {
      'notification': 5000,
      'hp-warning': 5000,
      'level-up': 7000,
      'unlock': 7000,
      'checkin': 15000, // 较长，给用户时间阅读和决定
    }
    const timeout = currentEvent.duration ?? defaultDurations[currentEvent.type]

    timeoutRef.current = window.setTimeout(() => {
      // 超时强制出队
      dequeue()
    }, timeout)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [currentEvent?.id, dequeue])

  return {
    currentEvent,
    queue,
    enqueue,
    dequeue,
    clear,
    /** 队列是否为空 */
    isEmpty: queue.length === 0,
  }
}
