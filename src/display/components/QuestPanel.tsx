import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { colors, geometry, easing, duration } from '../../design-system'
import type { Quest } from '../../hooks/useGameState'
import HudText from './ui/HudText'

interface QuestPanelProps {
  quests: Quest[]
  onComplete: (questId: string) => void
}

const dimColorMap: Record<string, string> = {
  physical: colors.physical,
  energy: colors.energy,
  career: colors.career,
  social: colors.social,
  finance: colors.finance,
}

const priorityMap = {
  high: { label: '!', color: colors.danger },
  medium: { label: '·', color: colors.exp },
  low: { label: '', color: colors.textDim },
}

export default function QuestPanel({ quests, onComplete }: QuestPanelProps) {
  const doneCount = quests.filter(q => q.done).length
  const totalCount = quests.length

  return (
    <section className="quest-board" aria-label="today quests">
      {/* 头部 */}
      <div className="quest-board__header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: colors.patch, clipPath: geometry.diamond }} />
          <HudText variant="system" color={colors.patch}>今日修行</HudText>
        </div>
        <div className="flex items-center gap-2">
          <HudText variant="label" color={colors.textDim}>{doneCount}/{totalCount}</HudText>
          <div className="quest-board__progress">
            <motion.div
              className="quest-board__progress-fill"
              style={{ background: colors.patch }}
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / totalCount) * 100}%` }}
              transition={{ delay: 0.5, duration: 0.4, ease: easing.sharp }}
            />
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="quest-board__list">
        {quests.map((q, i) => {
          const qColor = dimColorMap[q.dimension] || colors.patch
          const prio = priorityMap[q.priority || 'low']
          return (
            <motion.div
              key={q.id}
              className={`quest-board__item ${q.done ? 'is-done' : ''}`}
              style={{ '--quest-color': qColor, cursor: q.done ? 'default' : 'pointer' } as CSSProperties}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: duration.normal, ease: easing.smooth }}
              onClick={() => !q.done && onComplete(q.id)}
              whileHover={q.done ? undefined : { x: 4, background: 'rgba(255,255,255,0.06)' }}
              whileTap={q.done ? undefined : { scale: 0.97 }}
            >
              {/* 左侧色条 */}
              <div className="quest-board__accent" style={{ background: q.done ? colors.textDim : qColor }} />

              {/* 勾选框 */}
              <div className="quest-board__check" style={{ borderColor: q.done ? colors.textDim : qColor, background: q.done ? qColor : 'rgba(4,9,19,0.9)' }}>
                {q.done && <span style={{ color: '#fff' }}>✓</span>}
              </div>

              {/* 内容 */}
              <div className="quest-board__content">
                <span className="quest-board__text" style={{ textDecoration: q.done ? 'line-through' : 'none' }}>{q.text}</span>
                <span className="quest-board__meta">
                  {prio.label && <span style={{ color: prio.color }}>{prio.label}</span>}
                  <span className="quest-board__exp">+{q.exp}</span>
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
