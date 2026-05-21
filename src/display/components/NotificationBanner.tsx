import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { colors } from '../../design-system'
import { assets } from '../assets'
import HudText from './ui/HudText'

interface NotificationBannerProps {
  show: boolean
  message: string
  subMessage?: string
  type?: 'info' | 'success' | 'warning'
  onDismiss: () => void
  autoDismissMs?: number
}

/**
 * 全屏通知Banner — 使用 VD06 滑入动画作为背景
 */
export default function NotificationBanner({
  show,
  message,
  subMessage,
  type = 'info',
  onDismiss,
  autoDismissMs = 4000,
}: NotificationBannerProps) {
  const [videoPlaying, setVideoPlaying] = useState(false)

  const typeColors = {
    info: colors.patch,
    success: colors.finance,
    warning: colors.social,
  }
  const color = typeColors[type]

  useEffect(() => {
    if (show && autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs)
      return () => clearTimeout(timer)
    }
  }, [show, autoDismissMs, onDismiss])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[55] overflow-hidden"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          onClick={onDismiss}
        >
          {/* VD06 Banner 入场动画 */}
          <div className="relative h-20">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={assets.effects.patchArrival}
              autoPlay
              muted
              playsInline
              preload="metadata"
              onPlay={() => setVideoPlaying(true)}
              onError={() => setVideoPlaying(true)}
            />

            {/* 文字内容 — 视频开始播放后显示 */}
            {videoPlaying && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center gap-4 px-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <div
                  className="w-2 h-8"
                  style={{ background: color }}
                />
                <div>
                  <div className="text-sm font-bold text-white">{message}</div>
                  {subMessage && (
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{subMessage}</div>
                  )}
                </div>
                <div className="ml-auto">
                  <HudText variant="label" color={colors.textDim}>轻触关闭</HudText>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
