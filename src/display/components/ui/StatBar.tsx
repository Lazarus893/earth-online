import { motion } from 'framer-motion'
import { colors, geometry, easing } from '../../../design-system'

interface StatBarProps {
  current: number
  max: number
  color: string
  /** 动画延迟 */
  delay?: number
  /** 是否显示刻度线 */
  showTicks?: boolean
  /** 高度 */
  height?: number
  /** 是否显示发光效果 */
  glow?: boolean
}

/**
 * 统一属性/经验条 — 赛博几何风格
 * 深色底 + 斜切填充 + 发光 + 刻度线 + 尾部光标
 */
export default function StatBar({
  current,
  max,
  color,
  delay = 0,
  showTicks = true,
  height = 10,
  glow = false,
}: StatBarProps) {
  const pct = Math.min((current / max) * 100, 100)

  return (
    <div
      className="stat-bar"
      style={{
        height,
        '--bar-color': color,
        boxShadow: glow && pct > 0 ? `0 0 8px ${color}33, inset 0 0 4px ${color}11` : undefined,
      } as React.CSSProperties}
    >
      {/* 外框 */}
      <div className="stat-bar__frame" />

      {/* 刻度线 */}
      {showTicks && [25, 50, 75].map(tick => (
        <div
          key={tick}
          className="stat-bar__tick"
          style={{ left: `${tick}%` }}
        />
      ))}

      {/* 填充条 */}
      <motion.div
        className="stat-bar__fill"
        style={{
          background: `linear-gradient(90deg, ${color}66, ${color}cc, ${color})`,
          clipPath: geometry.barSlice,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay, duration: 0.6, ease: easing.sharp }}
      />

      {/* 内部高光条 */}
      {pct > 5 && (
        <motion.div
          className="stat-bar__highlight"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 0.85}%` }}
          transition={{ delay: delay + 0.1, duration: 0.5, ease: easing.sharp }}
        />
      )}

      {/* 尾部光标 */}
      {pct > 0 && (
        <motion.div
          className="stat-bar__cursor"
          style={{ left: `${pct}%`, background: colors.white, boxShadow: `0 0 4px ${color}88` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: delay + 0.5, duration: 0.2 }}
        />
      )}
    </div>
  )
}
