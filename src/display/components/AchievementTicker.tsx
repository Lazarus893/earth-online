import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { colors, geometry, easing, duration } from '../../design-system'
import HudText from './ui/HudText'

const achievements = [
  { text: '七日连胜', sub: 'STREAK × 7', icon: '🔥', color: colors.exp, progress: 100 },
  { text: '精力突破 Lv.3', sub: 'ENERGY UP', icon: '⚡', color: colors.energy, progress: 100 },
  { text: '全维觉醒', sub: 'UNLOCK ALL', icon: '◆', color: colors.career, progress: 60 },
]

export default function AchievementTicker() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % achievements.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const active = achievements[current]
  const completedCount = achievements.filter(a => a.progress >= 100).length

  return (
    <section className="achievement-board" aria-label="achievements">
      {/* 头部 */}
      <div className="achievement-board__header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: colors.exp, clipPath: geometry.diamond }} />
          <HudText variant="system" color={colors.exp}>ACHIEVEMENTS</HudText>
        </div>
        <HudText variant="label" color={colors.textDim}>{completedCount}/{achievements.length}</HudText>
      </div>

      {/* 成就轮播 */}
      <div className="achievement-board__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="achievement-board__card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: duration.normal, ease: easing.smooth }}
          >
            {/* 图标 */}
            <div
              className="achievement-board__icon"
              style={{
                borderColor: active.color + '66',
                background: active.color + '15',
              }}
            >
              <span>{active.icon}</span>
            </div>

            {/* 文字信息 */}
            <div className="achievement-board__info">
              <strong style={{ color: active.progress >= 100 ? active.color : colors.text }}>
                {active.text}
              </strong>
              <small>{active.sub}</small>
              {/* 进度条 */}
              <div className="achievement-board__bar">
                <motion.div
                  className="achievement-board__bar-fill"
                  style={{ background: active.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${active.progress}%` }}
                  transition={{ duration: 0.5, ease: easing.sharp }}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部指示器 */}
      <div className="achievement-board__dots">
        {achievements.map((item, i) => (
          <div
            key={i}
            className="achievement-board__dot"
            style={{
              background: i === current ? item.color : 'rgba(148, 163, 184, 0.22)',
              width: i === current ? 14 : 6,
            }}
          />
        ))}
      </div>
    </section>
  )
}
