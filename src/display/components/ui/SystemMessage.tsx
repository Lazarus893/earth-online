import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, easing, duration } from '../../../design-system'

type MessageType = 'system' | 'warning' | 'reward' | 'announcement' | 'opportunity'

interface SystemMessageProps {
  /** 消息文本 (不含前缀) */
  text: string
  /** 消息类型 — 决定前缀和颜色 */
  type?: MessageType
  /** 打字速度 ms/字 */
  speed?: number
  /** 延迟开始 ms */
  delay?: number
  /** 打字完成回调 */
  onComplete?: () => void
  /** 是否跳过打字直接显示 */
  instant?: boolean
  /** 额外 className */
  className?: string
}

const PREFIX_MAP: Record<MessageType, { prefix: string; color: string }> = {
  system: { prefix: '[系统]', color: colors.patch },
  warning: { prefix: '[警告]', color: colors.danger },
  reward: { prefix: '[奖励]', color: colors.exp },
  announcement: { prefix: '[公告]', color: '#a78bfa' },
  opportunity: { prefix: '[机缘]', color: colors.finance },
}

/**
 * 系统消息打字机组件
 * 模拟网文系统流中的系统提示效果
 * 逐字显示 + 前缀高亮 + 光标闪烁
 */
export default function SystemMessage({
  text,
  type = 'system',
  speed = 35,
  delay = 0,
  onComplete,
  instant = false,
  className = '',
}: SystemMessageProps) {
  const [displayed, setDisplayed] = useState(instant ? text : '')
  const [started, setStarted] = useState(instant || delay === 0)
  const [done, setDone] = useState(instant)

  // Delay start
  useEffect(() => {
    if (instant || delay === 0) {
      setStarted(true)
      return
    }
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay, instant])

  // Typewriter effect
  useEffect(() => {
    if (!started || instant) return
    if (displayed.length >= text.length) {
      setDone(true)
      onComplete?.()
      return
    }
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1))
    }, speed)
    return () => clearTimeout(timer)
  }, [started, displayed, text, speed, instant, onComplete])

  // Reset if text changes
  useEffect(() => {
    if (!instant) {
      setDisplayed('')
      setDone(false)
    }
  }, [text, instant])

  const { prefix, color } = PREFIX_MAP[type]

  if (!started) return null

  return (
    <motion.div
      className={`system-message ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.fast, ease: easing.smooth }}
    >
      {/* 前缀 */}
      <span
        className="system-message__prefix"
        style={{ color, fontFamily: typography.mono }}
      >
        {prefix}
      </span>

      {/* 消息正文 */}
      <span
        className="system-message__text"
        style={{ fontFamily: typography.body }}
      >
        {instant ? text : displayed}
      </span>

      {/* 光标 */}
      {!done && (
        <motion.span
          className="system-message__cursor"
          style={{ color }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
        >
          ▌
        </motion.span>
      )}
    </motion.div>
  )
}

/**
 * 多条系统消息依次显示
 */
interface MessageSequenceProps {
  messages: Array<{
    text: string
    type?: MessageType
    speed?: number
    /** 该消息显示完后等待多少 ms 再显示下一条 */
    pauseAfter?: number
  }>
  /** 所有消息播完回调 */
  onAllComplete?: () => void
  className?: string
}

export function SystemMessageSequence({
  messages,
  onAllComplete,
  className = '',
}: MessageSequenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleMessages, setVisibleMessages] = useState<number[]>([0])

  const handleMessageComplete = useCallback(() => {
    const msg = messages[currentIndex]
    const pause = msg?.pauseAfter ?? 600

    setTimeout(() => {
      const nextIndex = currentIndex + 1
      if (nextIndex >= messages.length) {
        onAllComplete?.()
      } else {
        setCurrentIndex(nextIndex)
        setVisibleMessages(prev => [...prev, nextIndex])
      }
    }, pause)
  }, [currentIndex, messages, onAllComplete])

  return (
    <div className={`system-message-sequence ${className}`}>
      <AnimatePresence>
        {visibleMessages.map(i => {
          const msg = messages[i]
          if (!msg) return null
          return (
            <SystemMessage
              key={`${i}-${msg.text}`}
              text={msg.text}
              type={msg.type}
              speed={msg.speed}
              onComplete={i === currentIndex ? handleMessageComplete : undefined}
              instant={i < currentIndex}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
