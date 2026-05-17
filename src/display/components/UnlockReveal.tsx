import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '../../design-system'
import HudText from './ui/HudText'
import type { DimensionKey } from '../../App'
import { assets } from '../assets'

interface UnlockRevealProps {
  show: boolean
  dimensionKey: DimensionKey
  dimensionLabel: string
  dimensionColor: string
  onComplete: () => void
}

/**
 * 维度解锁动画 — 播放 VD03 面板碎裂视频 + 维度名揭示
 */
export default function UnlockReveal({ show, dimensionKey, dimensionLabel, dimensionColor, onComplete }: UnlockRevealProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: colors.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* VD-UNLOCK 解锁视频 — 居中保持比例 */}
          <video
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[60vw] max-h-[70vh] object-contain"
            src={assets.effects.unlock}
            autoPlay
            playsInline
            preload="metadata"
            onEnded={onComplete}
            onError={onComplete}
          />

          {/* 维度揭示 — 延迟出现 */}
          <motion.div
            className="relative flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <HudText variant="system" color={colors.exp}>DIMENSION UNLOCKED</HudText>

            <motion.div
              className="text-4xl font-bold font-mono tracking-widest"
              style={{ color: dimensionColor, textShadow: `0 0 30px ${dimensionColor}66` }}
            >
              {dimensionKey.toUpperCase()}
            </motion.div>

            <div className="text-sm text-gray-400">{dimensionLabel}</div>

            <motion.div
              className="mt-4 h-[1px] w-48"
              style={{ background: `linear-gradient(90deg, transparent, ${dimensionColor}, transparent)` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
