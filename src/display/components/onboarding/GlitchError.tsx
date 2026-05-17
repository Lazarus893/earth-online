import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { colors } from '../../../design-system'
import { assets } from '../../assets'

interface GlitchErrorProps {
  /** 显示/隐藏 */
  show: boolean
  /** 动画播完回调 */
  onComplete?: () => void
  /** ERROR 信息 */
  errorCode?: string
  errorMessage?: string
}

/**
 * ERROR 干扰动画组件
 * 模拟系统绑定失败 — 色差畸变 + 屏幕抖动 + 红色警告
 */
export default function GlitchError({
  show,
  onComplete,
  errorCode = '0x4E2F',
  errorMessage = '信号衰减，链路中断',
}: GlitchErrorProps) {
  const [phase, setPhase] = useState<'idle' | 'glitch' | 'warning' | 'fade'>('idle')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!show) {
      setPhase('idle')
      return
    }

    setPhase('glitch')

    // glitch 抖动 1.2s → warning 静止 1.5s → fade out
    const t1 = setTimeout(() => setPhase('warning'), 1200)
    const t2 = setTimeout(() => setPhase('fade'), 2700)
    const t3 = setTimeout(() => onCompleteRef.current?.(), 3200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [show])

  if (!show && phase === 'idle') return null

  return (
    <motion.div
      className="glitch-error"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'fade' ? 0 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* VD-ERROR 全屏视频背景 */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={assets.onboarding.errorGlitch}
        autoPlay
        playsInline
        onError={(e) => { e.currentTarget.style.display = 'none' }}
        onLoadedData={(e) => {
          const v = e.currentTarget
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
        }}
      />

      {/* 全屏色差叠层 */}
      {phase === 'glitch' && (
        <>
          <motion.div
            className="glitch-error__layer glitch-error__layer--red"
            animate={{
              x: [0, -3, 4, -2, 3, 0],
              opacity: [0.6, 0.8, 0.4, 0.7, 0.5, 0.6],
            }}
            transition={{ duration: 0.15, repeat: 8, repeatType: 'loop' }}
          />
          <motion.div
            className="glitch-error__layer glitch-error__layer--cyan"
            animate={{
              x: [0, 3, -4, 2, -3, 0],
              opacity: [0.4, 0.6, 0.3, 0.5, 0.4, 0.4],
            }}
            transition={{ duration: 0.12, repeat: 10, repeatType: 'loop' }}
          />

          {/* 扫描线噪点 */}
          <div className="glitch-error__scanlines" />

          {/* 随机色块闪烁 */}
          <motion.div
            className="glitch-error__block"
            animate={{
              y: [0, -100, 200, -50, 150, 0],
              scaleY: [1, 0.5, 2, 0.8, 1.5, 1],
              opacity: [0.5, 0.8, 0.3, 0.7, 0.4, 0],
            }}
            transition={{ duration: 1.2, ease: 'linear' }}
          />
        </>
      )}

      {/* 警告界面 */}
      {(phase === 'warning' || phase === 'fade') && (
        <motion.div
          className="glitch-error__warning"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* 三角警告符号 */}
          <motion.div
            className="glitch-error__triangle"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L44 40H4L24 4Z"
                stroke={colors.danger}
                strokeWidth="2"
                fill="none"
              />
              <text
                x="24"
                y="34"
                textAnchor="middle"
                fill={colors.danger}
                fontSize="18"
                fontWeight="bold"
              >
                !
              </text>
            </svg>
          </motion.div>

          {/* ERROR 文字 */}
          <motion.div
            className="glitch-error__code"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="glitch-error__label">ERROR</span>
            <span className="glitch-error__detail">
              CODE: {errorCode} - {errorMessage}
            </span>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
