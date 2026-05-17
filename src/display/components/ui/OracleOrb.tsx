import { motion } from 'framer-motion'

interface OracleOrbProps {
  size?: number // px, default 40
  className?: string
}

/**
 * Oracle AI 呼吸光晕 — 三色渐变流转
 * 用作 AI 身份标识，替代传统头像
 * 灵感来源: react-ai-orb (github.com/Steve0929/react-ai-orb)
 */
export default function OracleOrb({ size = 40, className = '' }: OracleOrbProps) {
  return (
    <div
      className={`oracle-orb ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 核心光球 */}
      <div className="oracle-orb__core" />
      {/* 外层光晕 */}
      <div className="oracle-orb__halo" />
      {/* 呼吸脉冲 */}
      <motion.div
        className="oracle-orb__pulse"
        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
