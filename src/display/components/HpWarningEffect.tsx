import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '../../design-system'
import { assets } from '../assets'
import HudText from './ui/HudText'

interface HpWarningEffectProps {
  show: boolean
  message?: string
  onComplete: () => void
}

/**
 * VD08 HP/状态警告动画 — 播放警告闪烁视频 + 提示文字
 * 用于低能量/低状态提醒
 */
export default function HpWarningEffect({ show, message = '宿主状态告急', onComplete }: HpWarningEffectProps) {
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // 超时保护 — 4s 后强制结束（防止视频加载失败时卡住）
  useEffect(() => {
    if (!show) return
    const timeout = setTimeout(() => onCompleteRef.current(), 4000)
    return () => clearTimeout(timeout)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[54] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* VD08 警告闪烁视频 — 全屏叠加 */}
          <video
            className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
            src={assets.effects.hpWarning}
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={() => onCompleteRef.current()}
            onError={() => onCompleteRef.current()}
            onLoadedData={(e) => {
              const v = e.currentTarget
              v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
            }}
          />

          {/* 红色边框闪烁 */}
          <motion.div
            className="absolute inset-0 border-2 rounded"
            style={{ borderColor: colors.danger }}
            animate={{ opacity: [0.8, 0.2, 0.8, 0.2, 0.6] }}
            transition={{ duration: 1.5, ease: 'linear' }}
          />

          {/* 中央警告文字 */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-2 px-8 py-4" style={{ background: `${colors.bg}cc` }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: 2 }}
              >
                <HudText variant="system" color={colors.danger}>{message}</HudText>
              </motion.div>
              <div className="h-[1px] w-32" style={{ background: `linear-gradient(90deg, transparent, ${colors.danger}, transparent)` }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
