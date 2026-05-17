import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '../../design-system'
import { assets } from '../assets'
import HudText from './ui/HudText'

interface LevelUpEffectProps {
  show: boolean
  newLevel: number
  dimensionColor?: string
  onComplete: () => void
}

/**
 * 升级全屏动画 — 播放 VD02 粒子爆发视频 + 等级数字
 */
export default function LevelUpEffect({ show, newLevel, dimensionColor, onComplete }: LevelUpEffectProps) {
  const color = dimensionColor || colors.exp

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* 暗色背景 */}
          <div className="absolute inset-0" style={{ background: `${colors.bg}cc` }} />

          {/* VD-LEVELUP 视频 — 保持原始比例居中 */}
          <video
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[50vw] max-h-[80vh] object-contain"
            src={assets.effects.levelUp}
            autoPlay
            playsInline
            preload="metadata"
            onEnded={onComplete}
            onError={onComplete}
          />

          {/* 等级数字 */}
          <motion.div
            className="relative flex flex-col items-center gap-2"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <HudText variant="system" color={colors.exp}>LEVEL UP</HudText>
            <motion.div
              className="text-7xl font-bold font-mono"
              style={{ color, textShadow: `0 0 30px ${color}88, 0 0 60px ${color}44` }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {newLevel}
            </motion.div>
            <motion.div
              className="h-[1px] w-32"
              style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
