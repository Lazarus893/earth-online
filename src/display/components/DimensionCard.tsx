import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { DimensionData } from '../../App'
import StatBar from './ui/StatBar'
import HudText from './ui/HudText'
import { colors, geometry, easing, duration } from '../../design-system'
import { getStatusLabel, getStatusColor } from '../../data/dimensionStatus'

interface DimensionCardProps {
  dimension: DimensionData
  onClick: () => void
}

export default function DimensionCard({ dimension, onClick }: DimensionCardProps) {
  const { label, labelEn, icon, color, level, exp, expMax, score, locked } = dimension
  const nodeStyle = { '--dim-color': color } as CSSProperties

  return (
    <motion.button
      type="button"
      className={`dimension-orbit-card ${locked ? 'is-locked' : ''}`}
      style={nodeStyle}
      disabled={locked}
      onClick={locked ? undefined : onClick}
      whileHover={locked ? undefined : { y: -5, scale: 1.03 }}
      whileTap={locked ? undefined : { scale: 0.97 }}
      transition={{ duration: duration.fast, ease: easing.smooth }}
      aria-label={locked ? `${labelEn} locked` : `${labelEn} score ${score}`}
    >
      <span className="dimension-orbit-card__frame" aria-hidden="true" />
      <span className="dimension-orbit-card__core" style={{ clipPath: geometry.hexagon }}>
        <span className="dimension-orbit-card__icon">{locked ? '⌁' : icon}</span>
      </span>

      <span className="dimension-orbit-card__copy">
        <HudText variant="label" color={locked ? colors.textDim : color}>
          {labelEn}
        </HudText>
        <span className="dimension-orbit-card__label">{label}</span>
      </span>

      <span className="dimension-orbit-card__metric">
        {locked ? (
          <span className="dimension-orbit-card__locked">LOCKED</span>
        ) : (
          <>
            <span className="dimension-orbit-card__level">LV.{level}</span>
            <span className="dimension-orbit-card__status" style={{ color: getStatusColor(score) }}>
              {getStatusLabel(dimension.key, score)}
            </span>
          </>
        )}
      </span>

      <span className="dimension-orbit-card__bar">
        {locked ? (
          <span className="dimension-orbit-card__lockline" />
        ) : (
          <StatBar current={exp} max={expMax} color={color} showTicks={false} height={4} />
        )}
      </span>
    </motion.button>
  )
}
