/**
 * JournalPanel — 日记式每日记录面板
 *
 * 替代原有的 QuestPanel (todo-list 风格)
 * 设计理念：
 * - "今日记录"而非"每日任务"
 * - 柔和视觉，无进度条压力
 * - Checkbox 是可选的，不勾也无惩罚感
 * - 支持简短备注
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, easing, duration } from '../../design-system'
import { getStatusColor } from '../../data/dimensionStatus'
import type { JournalEntry } from '../../services/journalGenerator'
import { getDailyReflection, type DailyReflection } from '../../services/journalReflection'
import type { DimensionData } from '../../App'
import HudText from './ui/HudText'

interface JournalPanelProps {
  entries: JournalEntry[]
  dimensions: DimensionData[]
  onLog: (entryId: string) => void
  loading?: boolean
}

const dimLabelMap: Record<string, string> = {
  physical: '体力',
  energy: '精力',
  career: '职业',
  social: '社交',
  finance: '金钱',
}

export default function JournalPanel({ entries, dimensions, onLog, loading }: JournalPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reflection, setReflection] = useState<DailyReflection | null>(null)

  const loggedCount = entries.filter(e => e.logged).length

  // 检查是否应该显示反思
  useEffect(() => {
    const checkReflection = async () => {
      const r = await getDailyReflection(entries, dimensions)
      if (r) setReflection(r)
    }
    // 延迟检查，不阻塞渲染
    const timer = setTimeout(checkReflection, 2000)
    return () => clearTimeout(timer)
  }, [entries, dimensions])

  if (loading) {
    return (
      <section className="journal-panel" aria-label="today journal">
        <div className="journal-panel__header">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.patch }} />
            <HudText variant="system" color={colors.patch}>TODAY</HudText>
          </div>
        </div>
        <div className="journal-panel__loading">
          <motion.div
            className="journal-panel__loading-text"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Oracle 正在为你规划今日...
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section className="journal-panel" aria-label="today journal">
      {/* 头部 */}
      <div className="journal-panel__header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.patch }} />
          <HudText variant="system" color={colors.patch}>TODAY</HudText>
        </div>
        <HudText variant="label" color={colors.textDim}>
          {loggedCount > 0 ? `${loggedCount} 条已记录` : '等待记录'}
        </HudText>
      </div>

      {/* 条目列表 */}
      <div className="journal-panel__list">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            className={`journal-panel__item ${entry.logged ? 'is-logged' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06, duration: duration.normal, ease: easing.smooth }}
          >
            {/* 左侧：圆点指示器 */}
            <button
              className="journal-panel__dot"
              onClick={() => !entry.logged && onLog(entry.id)}
              disabled={entry.logged}
              style={{
                background: entry.logged ? colors.patch : 'transparent',
                borderColor: entry.logged ? colors.patch : 'rgba(226,232,240,0.2)',
              }}
              title={entry.logged ? '已记录' : '点击记录'}
            >
              {entry.logged && <span className="journal-panel__check">✓</span>}
            </button>

            {/* 内容区 */}
            <div
              className="journal-panel__content"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <span className={`journal-panel__text ${entry.logged ? 'is-logged' : ''}`}>
                {entry.text}
              </span>
              <span className="journal-panel__meta">
                <span className="journal-panel__dim" style={{ color: getStatusColor(60) }}>
                  {dimLabelMap[entry.dimension] || entry.dimension}
                </span>
                <span className="journal-panel__exp">+{entry.exp}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI 反思卡片 */}
      <AnimatePresence>
        {reflection && (
          <motion.div
            className="journal-panel__reflection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="journal-panel__reflection-header">
              <span className="journal-panel__reflection-icon">✦</span>
              <HudText variant="label" color={colors.textDim}>Oracle 日记</HudText>
            </div>
            <p className="journal-panel__reflection-text">{reflection.content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
