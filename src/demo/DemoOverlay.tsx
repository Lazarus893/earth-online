import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { colors } from '../design-system'

interface DemoOverlayProps {
  cursorTarget: { x: number; y: number } | null
  progress: number
  isRunning: boolean
}

/**
 * DemoOverlay — 虚拟光标 + 进度条
 * 光标使用 viewport 百分比定位，流畅动画移动
 */
export default function DemoOverlay({ cursorTarget, progress, isRunning }: DemoOverlayProps) {
  const [showRipple, setShowRipple] = useState(false)
  const [rippleKey, setRippleKey] = useState(0)

  // 每次 cursorTarget 变化时触发涟漪
  useEffect(() => {
    if (cursorTarget) {
      setShowRipple(false)
      // 光标飞到位后触发涟漪
      const timer = setTimeout(() => {
        setShowRipple(true)
        setRippleKey(prev => prev + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [cursorTarget?.x, cursorTarget?.y])

  return (
    <>
      {/* 虚拟光标 */}
      <AnimatePresence>
        {cursorTarget && (
          <motion.div
            className="demo-cursor"
            style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}
            initial={{ opacity: 0, scale: 0, left: '50%', top: '50%' }}
            animate={{
              opacity: 1,
              scale: 1,
              left: `${cursorTarget.x}vw`,
              top: `${cursorTarget.y}vh`,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* 光标圆点 */}
            <div className="demo-cursor__dot" />
            {/* 点击涟漪 */}
            {showRipple && (
              <motion.div
                key={rippleKey}
                className="demo-cursor__ripple"
                initial={{ scale: 0.5, opacity: 0.7 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部进度条 */}
      {isRunning && (
        <div className="demo-progress">
          <div className="demo-progress__track">
            <motion.div
              className="demo-progress__fill"
              style={{ background: colors.patch }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="demo-progress__label">
            DEMO MODE · {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </>
  )
}
