import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '../../design-system'
import { assets } from '../assets'
import HudText from './ui/HudText'

interface ExpFillEffectProps {
  show: boolean
  expGained: number
  dimensionColor?: string
  onComplete: () => void
}

/**
 * VD07 经验值获取动画 — 播放 XP 条填充视频 + 经验数字
 */
export default function ExpFillEffect({ show, expGained, dimensionColor, onComplete }: ExpFillEffectProps) {
  const color = dimensionColor || colors.exp

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-[52] h-24 overflow-hidden pointer-events-none"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* VD07 XP填充视频 */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={assets.effects.expFill}
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={onComplete}
            onError={onComplete}
          />

          {/* 暗色底保证文字可读 */}
          <div className="absolute inset-0" style={{ background: `${colors.bg}77` }} />

          {/* 经验值数字 */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center gap-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="w-1.5 h-6" style={{ background: color }} />
            <div className="flex items-baseline gap-2">
              <HudText variant="system" color={colors.exp}>EXP</HudText>
              <motion.span
                className="text-3xl font-bold font-mono"
                style={{ color, textShadow: `0 0 20px ${color}66` }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                +{expGained}
              </motion.span>
            </div>
            <motion.div
              className="h-[1px] w-24"
              style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
