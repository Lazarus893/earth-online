import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DimensionData } from '../../App'
import type { DevelopmentScheme } from '../../core/hierarchy'
import { selectScheme, saveSelectedScheme } from '../../core/hierarchy'
import { generateSchemes } from '../../services/planGenerator'
import { SystemMessageSequence } from '../components/ui/SystemMessage'
import SystemMessage from '../components/ui/SystemMessage'
import OracleOrb from '../components/ui/OracleOrb'
import { colors, easing, duration } from '../../design-system'

interface PlanSelectionProps {
  dimensions: DimensionData[]
  onComplete: () => void
}

type Phase = 'context-reading' | 'generating' | 'presenting' | 'selected'

const STYLE_META: Record<DevelopmentScheme['style'], { label: string; color: string; badge: string; tagline: string }> = {
  balanced: { label: '均衡觉醒', color: '#22D3EE', badge: 'A', tagline: '万法归一，稳步突破' },
  strength: { label: '天赋觉醒', color: '#FBBF24', badge: 'B', tagline: '集中火力，极限突破' },
  weakness: { label: '逆天改命', color: '#A78BFA', badge: 'C', tagline: '直面短板，逆势翻盘' },
}

// ─── 新手礼包：基于方案风格推荐的 OpenClaw 能力 ───
interface StarterGift {
  icon: string
  name: string
  description: string
}

const STARTER_GIFTS: Record<DevelopmentScheme['style'], StarterGift[]> = {
  balanced: [
    { icon: '🌐', name: '智能发现引擎', description: '联网搜索+Twitter+GitHub 综合推荐' },
    { icon: '📋', name: '周计划生成器', description: '基于状态自动制定7天提升计划' },
    { icon: '⏰', name: '每日训练提醒', description: 'Oracle 定时推送任务提醒' },
  ],
  strength: [
    { icon: '👤', name: '领域KOL追踪', description: '搜索优势领域 KOL 与社区资源' },
    { icon: '⭐', name: '开源工具库', description: 'GitHub 精选开源项目推荐' },
    { icon: '📊', name: '趋势雷达', description: '行业动态与前沿技术追踪' },
  ],
  weakness: [
    { icon: '🌐', name: '定向资源搜索', description: '针对薄弱环节的精准资源匹配' },
    { icon: '📋', name: '补强训练计划', description: '智能生成短板突破训练方案' },
    { icon: '👤', name: '入门导师匹配', description: '搜索该领域适合新手的 KOL' },
  ],
}

export default function PlanSelection({ dimensions, onComplete }: PlanSelectionProps) {
  const [phase, setPhase] = useState<Phase>('context-reading')
  const [schemes, setSchemes] = useState<DevelopmentScheme[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schemesLoading, setSchemesLoading] = useState(true)

  // 加载方案
  useEffect(() => {
    setSchemesLoading(true)
    generateSchemes(dimensions).then(result => {
      setSchemes(result)
      setSchemesLoading(false)
    }).catch(() => {
      setSchemesLoading(false)
    })
  }, [dimensions])

  // context-reading 完成后：如果方案还在加载，进入 generating 态
  const handleContextComplete = useCallback(() => {
    if (schemesLoading || schemes.length === 0) {
      setPhase('generating')
    } else {
      setPhase('presenting')
    }
  }, [schemesLoading, schemes])

  // 方案加载完成 → 如果当前在 generating 态，自动切到 presenting
  useEffect(() => {
    if (phase === 'generating' && !schemesLoading && schemes.length > 0) {
      // 短延迟让 loading 动画有感知
      setTimeout(() => setPhase('presenting'), 800)
    }
  }, [phase, schemesLoading, schemes])

  const handleSelect = useCallback((scheme: DevelopmentScheme) => {
    setSelectedId(scheme.id)
    setPhase('selected')

    // 保存到 localStorage
    const selected = selectScheme(scheme)
    saveSelectedScheme(selected)

    // 等完成消息播完
    setTimeout(() => onComplete(), 4500)
  }, [onComplete])

  return (
    <motion.div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#030712' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 背景装饰 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.04), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(124,58,237,0.03), transparent 50%)',
        }}
      />

      {/* HUD 角落 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-6 left-6 w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#06B6D4]/15" />
          <div className="absolute top-0 left-0 w-[1px] h-full bg-[#06B6D4]/15" />
        </div>
        <div className="absolute bottom-6 right-6 w-12 h-12">
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[#06B6D4]/15" />
          <div className="absolute bottom-0 right-0 w-[1px] h-full bg-[#06B6D4]/15" />
        </div>
      </div>

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-6xl px-6 py-8 gap-6">
        <AnimatePresence mode="wait">

          {/* ═══ CONTEXT READING ═══ */}
          {phase === 'context-reading' && (
            <motion.div
              key="context-reading"
              className="flex flex-col items-center gap-4 w-full max-w-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SystemMessageSequence
                messages={[
                  { text: '正在整合宿主对话数据...', type: 'system' as const, speed: 30, pauseAfter: 1000 },
                  { text: '> 核心诉求已锁定，正在匹配觉醒路径模板...', speed: 25, pauseAfter: 800 },
                  { text: '> 分析维度优先级...', speed: 28, pauseAfter: 600 },
                  { text: '> 计算最优资源配置方案...', speed: 25, pauseAfter: 700 },
                  { text: '⚠ Oracle 将根据宿主的状态准备专属新手礼包', type: 'warning' as const, speed: 22, pauseAfter: 1000 },
                  { text: 'Oracle 正在生成觉醒路径...', type: 'reward' as const, speed: 22, pauseAfter: 1200 },
                ]}
                onAllComplete={handleContextComplete}
              />
            </motion.div>
          )}

          {/* ═══ GENERATING (Loading State) ═══ */}
          {phase === 'generating' && (
            <motion.div
              key="generating"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <OracleOrb size={56} />
              <motion.div
                className="text-center"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-sm font-mono text-cyan-300/80 tracking-wider">
                  Oracle 正在为宿主计算专属觉醒路径...
                </p>
                <p className="text-[10px] font-mono text-gray-500 mt-2 tracking-wider">
                  GENERATING DEVELOPMENT SCHEMES
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ PRESENTING SCHEMES ═══ */}
          {phase === 'presenting' && schemes.length > 0 && (
            <motion.div
              key="presenting"
              className="flex flex-col items-center gap-8 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SystemMessage
                text="觉醒路径已生成。选择你的命运——每条路径将解锁专属新手礼包。"
                type="reward"
                speed={22}
                className="mb-2"
              />

              {/* 三张方案卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {schemes.map((scheme, i) => {
                  const meta = STYLE_META[scheme.style]
                  const gifts = STARTER_GIFTS[scheme.style]
                  return (
                    <motion.button
                      key={scheme.id}
                      className="scheme-card"
                      style={{
                        '--scheme-color': meta.color,
                      } as React.CSSProperties}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.15, duration: duration.normal, ease: easing.smooth }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelect(scheme)}
                    >
                      {/* 顶部发光条 */}
                      <div className="scheme-card__glow" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}40, transparent)` }} />

                      {/* Badge 区域 */}
                      <div className="scheme-card__badge-row">
                        <div className="scheme-card__badge" style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}30` }}>
                          {meta.badge}
                        </div>
                        <div className="scheme-card__badge-info">
                          <span className="scheme-card__label" style={{ color: meta.color }}>{meta.label}</span>
                          <span className="scheme-card__tagline">{meta.tagline}</span>
                        </div>
                      </div>

                      {/* 方案名 + 描述 */}
                      <h3 className="scheme-card__name">{scheme.name}</h3>
                      <p className="scheme-card__desc">{scheme.description}</p>

                      {/* Goals 预览 */}
                      <div className="scheme-card__goals">
                        {scheme.goals.slice(0, 3).map(goal => (
                          <div key={goal.id} className="scheme-card__goal-item">
                            <span className="scheme-card__goal-icon">{goal.icon}</span>
                            <span className="scheme-card__goal-text">{goal.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* 新手礼包 */}
                      <div className="scheme-card__gifts">
                        <div className="scheme-card__gifts-header">
                          <span>🎁</span>
                          <span>STARTER PACK</span>
                        </div>
                        <div className="scheme-card__gifts-list">
                          {gifts.map((gift, gi) => (
                            <div key={gi} className="scheme-card__gift-item">
                              <span className="scheme-card__gift-icon">{gift.icon}</span>
                              <div className="scheme-card__gift-info">
                                <span className="scheme-card__gift-name">{gift.name}</span>
                                <span className="scheme-card__gift-desc">{gift.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 底部统计 */}
                      <div className="scheme-card__stats">
                        <span>{scheme.goals.length} goals</span>
                        <span>{scheme.goals.reduce((s, g) => s + g.plans.length, 0)} plans</span>
                        <span>
                          {scheme.goals.reduce((s, g) => s + g.plans.reduce((ps, p) => ps + p.tasks.length, 0), 0)} tasks
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <motion.p
                className="text-[10px] text-gray-600 font-mono tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                路径选定后可在主面板随时调整 · 新手礼包一经领取不可撤回
              </motion.p>
            </motion.div>
          )}

          {/* ═══ SELECTED ═══ */}
          {phase === 'selected' && (
            <motion.div
              key="selected"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: easing.smooth }}
            >
              <SystemMessageSequence
                messages={[
                  { text: `使命路径锁定：「${schemes.find(s => s.id === selectedId)?.name ?? ''}」`, type: 'reward', speed: 25, pauseAfter: 800 },
                  { text: '🎁 新手礼包已注入 Oracle 核心 — Agent 能力解锁完毕', type: 'reward', speed: 22, pauseAfter: 700 },
                  { text: '觉醒之路已刻入系统。从此刻起，你的每一步都将被记录。', speed: 28, pauseAfter: 600 },
                  { text: '正在加载主控面板...', speed: 30, pauseAfter: 400 },
                ]}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
