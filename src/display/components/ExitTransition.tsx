import { motion } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { colors } from '../../design-system'
import { assets } from '../assets'

interface ExitTransitionProps {
  onComplete: () => void
}

/**
 * VD12 退出转场 — 反向缩放动画，从维度详情返回仪表盘
 */
export default function ExitTransition({ onComplete }: ExitTransitionProps) {
  const completedRef = useRef(false)

  // 安全超时：视频不播放时 fallback
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  const handleEnded = () => {
    if (!completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[58] overflow-hidden"
      style={{ background: colors.bg }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <video
        className="w-full h-full object-cover"
        src={assets.transition.exitZoom}
        autoPlay
        playsInline
        preload="metadata"
        onEnded={handleEnded}
        onError={handleEnded}
      />

      {/* 中心闪光 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: colors.patch, boxShadow: `0 0 80px 40px ${colors.patch}44` }}
        />
      </motion.div>
    </motion.div>
  )
}
