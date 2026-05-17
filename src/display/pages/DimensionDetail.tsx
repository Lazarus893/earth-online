import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { DimensionKey, DimensionData } from '../../App'
import { colors, easing, duration } from '../../design-system'
import HudText from '../components/ui/HudText'
import StatBar from '../components/ui/StatBar'
import OracleOrb from '../components/ui/OracleOrb'
import { assets } from '../assets'
import { useDimensionAdvisor } from '../../hooks/useDimensionAdvisor'
import { getShortcutsForDimension, type Shortcut, type ShortcutContext } from '../../services/shortcuts'
import MarkdownContent from '../components/ui/MarkdownContent'
import HierarchyTree from '../components/HierarchyTree'
import { loadSelectedScheme, saveSelectedScheme, getGoalsForDimension, type HierarchyGoal } from '../../core/hierarchy'
import { type SelectedItem, type EditResult } from '../../services/hierarchyEditor'
import HierarchyEditDialog from '../components/HierarchyEditDialog'

interface DimensionDetailProps {
  dimension: DimensionData
  allDimensions: DimensionData[]
  onBack: () => void
  onAddExp?: (dimensionKey: DimensionKey, amount: number) => void
  onInjectChat?: (msg: { role: 'user' | 'system'; content: string }) => void
}

const dimensionDescriptions: Record<DimensionKey, string> = {
  physical: '身体是一切的根基。作为转行期的高强度学习者，体能和作息直接决定你的学习效率上限。',
  energy: '精力是你的内在燃料。转行需要大量深度学习时间，精力管理决定你每天能有效投入多少小时。',
  career: '从数据分析到 AI 产品——你的转型通道。核心技能迁移 + AI 新技能习得，双线并行。',
  social: '人际关系是转行加速器。AI 圈子、产品社区、行业人脉，让你更快摸清行业门道。',
  finance: '转行期的财务安全网。确保生活无后顾之忧，才能专注投入转型。',
}

const skillTrees: Record<DimensionKey, { name: string; level: number; maxLevel: number }[]> = {
  physical: [
    { name: '基础体能', level: 1, maxLevel: 10 },
    { name: '有氧耐力', level: 1, maxLevel: 10 },
    { name: '力量训练', level: 0, maxLevel: 10 },
    { name: '睡眠管理', level: 2, maxLevel: 10 },
  ],
  energy: [
    { name: '专注力', level: 3, maxLevel: 10 },
    { name: '精力恢复', level: 2, maxLevel: 10 },
    { name: '情绪调节', level: 2, maxLevel: 10 },
    { name: '冥想', level: 0, maxLevel: 10 },
  ],
  career: [
    { name: '数据分析', level: 7, maxLevel: 10 },
    { name: 'AI 产品设计', level: 2, maxLevel: 10 },
    { name: 'Prompt Engineering', level: 1, maxLevel: 10 },
    { name: '用户研究', level: 4, maxLevel: 10 },
    { name: '项目管理', level: 3, maxLevel: 10 },
  ],
  social: [
    { name: '行业社交', level: 1, maxLevel: 10 },
    { name: '跨团队协作', level: 3, maxLevel: 10 },
    { name: '演讲表达', level: 2, maxLevel: 10 },
    { name: '人脉拓展', level: 1, maxLevel: 10 },
  ],
  finance: [
    { name: '收入增长', level: 3, maxLevel: 10 },
    { name: '储蓄纪律', level: 2, maxLevel: 10 },
    { name: '投资认知', level: 1, maxLevel: 10 },
    { name: '副业探索', level: 0, maxLevel: 10 },
  ],
}

export default function DimensionDetail({ dimension, allDimensions, onBack, onAddExp, onInjectChat }: DimensionDetailProps) {
  const dimColor = (colors as Record<string, string>)[dimension.key] || colors.patch
  const skills = skillTrees[dimension.key]
  const sceneBg = assets.backgrounds.dimension[dimension.key]

  // Hierarchy data from selected scheme
  const [hierarchyGoals, setHierarchyGoals] = useState<HierarchyGoal[]>([])
  useEffect(() => {
    const scheme = loadSelectedScheme()
    if (scheme) {
      setHierarchyGoals(getGoalsForDimension(scheme, dimension.key))
    }
  }, [dimension.key])

  const handleActionComplete = useCallback((actionId: string, goalId: string, dim: DimensionKey, exp: number) => {
    // Update local state
    setHierarchyGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal
      return {
        ...goal,
        plans: goal.plans.map(plan => ({
          ...plan,
          tasks: plan.tasks.map(task => ({
            ...task,
            actions: task.actions.map(action =>
              action.id === actionId ? { ...action, completed: true } : action
            ),
          })),
        })),
      }
    }))
    // Award EXP
    if (onAddExp) onAddExp(dim, exp)
  }, [onAddExp])

  // ─── AI 修改对话框 ───
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editSelectedItems, setEditSelectedItems] = useState<SelectedItem[]>([])
  const [editGoalId, setEditGoalId] = useState<string>('')
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set())
  const modifiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRequestEdit = useCallback((selectedItems: SelectedItem[], goalId: string) => {
    setEditSelectedItems(selectedItems)
    setEditGoalId(goalId)
    setEditDialogOpen(true)
  }, [])

  const handleApplyEdit = useCallback((result: EditResult) => {
    // 更新本地 goals
    setHierarchyGoals(prev => prev.map(goal =>
      goal.id === editGoalId ? result.updatedGoal : goal
    ))

    // 设置已修改标记
    setModifiedIds(new Set(result.modifiedIds))

    // 持久化到 localStorage
    const scheme = loadSelectedScheme()
    if (scheme) {
      const updatedGoals = scheme.goals.map(g =>
        g.id === editGoalId ? result.updatedGoal : g
      )
      saveSelectedScheme({ ...scheme, goals: updatedGoals })
    }

    // 注入修改记录到主对话框
    if (onInjectChat) {
      const modCount = result.modifiedIds.length
      const dimLabel = dimension.label
      onInjectChat({
        role: 'system',
        content: `已完成「${dimLabel}」维度规划调整，共更新 ${modCount} 个节点。宿主可以在 Development Path 中查看变化。继续加油 ✦`,
      })
    }

    // 60秒后清除已修改标记
    if (modifiedTimerRef.current) clearTimeout(modifiedTimerRef.current)
    modifiedTimerRef.current = setTimeout(() => {
      setModifiedIds(new Set())
    }, 60000)
  }, [editGoalId, onInjectChat, dimension.label])

  // 清理 timer
  useEffect(() => {
    return () => {
      if (modifiedTimerRef.current) clearTimeout(modifiedTimerRef.current)
    }
  }, [])

  // AI Advisor
  const advisor = useDimensionAdvisor(
    dimension.key,
    dimension.label,
    dimension.score,
    dimension.level,
    skills
  )

  // Agent shortcuts — always visible regardless of availability
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentResult, setAgentResult] = useState<string | null>(null)
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null)

  const shortcuts = getShortcutsForDimension(dimension.key)
  const shortcutContext: ShortcutContext = {
    skills,
    score: dimension.score,
    level: dimension.level,
    weakestSkill: [...skills].sort((a, b) => a.level - b.level)[0]?.name ?? '',
  }

  const executeShortcut = async (shortcut: Shortcut) => {
    setActiveShortcut(shortcut.id)
    setAgentLoading(true)
    setAgentResult(null)
    try {
      const result = await shortcut.execute(shortcutContext)
      setAgentResult(result)
    } catch (err) {
      setAgentResult('调用失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
    setAgentLoading(false)
  }

  // 计算综合统计
  const totalSkillLevel = skills.reduce((sum, s) => sum + s.level, 0)
  const maxSkillLevel = skills.reduce((sum, s) => sum + s.maxLevel, 0)
  const skillProgress = Math.round((totalSkillLevel / maxSkillLevel) * 100)

  return (
    <motion.div
      className="detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.slow }}
    >
      {/* 背景层 */}
      <div className="absolute inset-0 z-0">
        <video
          className="w-full h-full object-cover opacity-25"
          src={assets.backgrounds.codeRain}
          autoPlay loop muted playsInline preload="metadata"
        />
      </div>
      <div className="absolute inset-0 z-0 dimension-detail-bg" style={{ backgroundImage: `url(${sceneBg})` }} />
      <div className="absolute inset-0 z-0" style={{ background: `${colors.bg}e8` }} />

      {/* 顶部导航栏 */}
      <motion.header
        className="detail-page__nav"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.25 }}
      >
        <button onClick={onBack} className="detail-page__back" style={{ color: dimColor }}>
          <span>←</span>
          <HudText variant="system">RETURN</HudText>
        </button>

        <div className="detail-page__breadcrumb">
          <HudText variant="label" color={colors.textDim}>DIMENSION</HudText>
          <span style={{ color: dimColor }}>/</span>
          <HudText variant="label" color={dimColor}>{dimension.labelEn.toUpperCase()}</HudText>
        </div>
      </motion.header>

      {/* 主内容 */}
      <div className="detail-page__body">
        {/* ─── 顶部横条: 维度标题 + 核心数据 ─── */}
        <motion.section
          className="detail-hero"
          style={{ '--dim-color': dimColor } as React.CSSProperties}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {/* 左：图标+名称 */}
          <div className="detail-hero__identity">
            <div className="detail-hero__icon" style={{ background: `${dimColor}18`, borderColor: `${dimColor}44` }}>
              {dimension.icon}
            </div>
            <div>
              <div className="detail-hero__name" style={{ color: dimColor }}>
                {dimension.labelEn.toUpperCase()}
              </div>
              <div className="detail-hero__sub">{dimension.label} · {dimensionDescriptions[dimension.key]}</div>
            </div>
          </div>

          {/* 中：等级+经验 */}
          <div className="detail-hero__stats">
            <div className="detail-hero__level">
              <HudText variant="label" color={colors.textDim}>LEVEL</HudText>
              <span className="detail-hero__level-num" style={{ color: dimColor }}>{dimension.level}</span>
            </div>
            <div className="detail-hero__exp">
              <div className="detail-hero__exp-header">
                <HudText variant="label" color={colors.textDim}>EXP</HudText>
                <HudText variant="label" color={colors.textMuted}>{dimension.exp}/{dimension.expMax}</HudText>
              </div>
              <StatBar current={dimension.exp} max={dimension.expMax} color={dimColor} height={5} />
            </div>
          </div>

          {/* 右：分数 */}
          <div className="detail-hero__score">
            <HudText variant="label" color={colors.textDim}>SCORE</HudText>
            <motion.div
              className="detail-hero__score-num"
              style={{ color: dimColor, textShadow: `0 0 16px ${dimColor}44` }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {dimension.score}
            </motion.div>
          </div>
        </motion.section>

        {/* ─── 中部三列: 技能+Agent / 发展路径(核心) / 顾问+维度 ─── */}
        <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1.6fr 0.8fr' }}>

          {/* ═══ 左列：技能树 + Agent 能力 ═══ */}
          <motion.section
            className="detail-panel detail-panel--skills"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.25 }}
          >
            <div className="detail-panel__head">
              <div className="detail-panel__dot" style={{ background: dimColor }} />
              <HudText variant="system" color={dimColor}>SKILL TREE</HudText>
              <HudText variant="label" color={colors.textDim} style={{ marginLeft: 'auto' }}>{skillProgress}%</HudText>
            </div>

            <div className="detail-skills">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  className="detail-skill-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.2 }}
                >
                  <span className="detail-skill-row__name">{skill.name}</span>
                  <div className="detail-skill-row__bar">
                    <StatBar current={skill.level} max={skill.maxLevel} color={dimColor} height={4} delay={0.4 + i * 0.08} />
                  </div>
                  <span className="detail-skill-row__val" style={{ color: dimColor }}>{skill.level}</span>
                  <span className="detail-skill-row__max">/{skill.maxLevel}</span>
                </motion.div>
              ))}
            </div>

            {/* 总进度 */}
            <div className="detail-skills__total">
              <HudText variant="label" color={colors.textDim}>TOTAL PROGRESS</HudText>
              <StatBar current={totalSkillLevel} max={maxSkillLevel} color={dimColor} height={3} />
            </div>

            {/* ─── Agent 能力（始终可见） ─── */}
            <div style={{ marginTop: 12 }}>
              <div className="detail-panel__head">
                <div className="detail-panel__dot" style={{ background: colors.patch }} />
                <HudText variant="system" color={colors.patch}>AGENT ABILITIES</HudText>
              </div>
              <div className="advisor-shortcuts" style={{ marginTop: 6 }}>
                {shortcuts.slice(0, 5).map(sc => (
                  <button
                    key={sc.id}
                    className={`advisor-shortcut ${activeShortcut === sc.id ? 'is-active' : ''}`}
                    onClick={() => executeShortcut(sc)}
                    disabled={agentLoading}
                    title={sc.description}
                  >
                    <span className="advisor-shortcut__icon">{sc.icon}</span>
                    <span className="advisor-shortcut__label">{sc.label}</span>
                  </button>
                ))}
              </div>

              {agentLoading && (
                <motion.div
                  className="advisor-agent-status"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <OracleOrb size={20} />
                  <span style={{ color: colors.patch }}>Agent 执行中...</span>
                </motion.div>
              )}
              {agentResult && !agentLoading && (
                <div className="advisor-agent-result">
                  <MarkdownContent content={agentResult} />
                </div>
              )}
            </div>
          </motion.section>

          {/* ═══ 中列：发展路径 (核心区域) ═══ */}
          <motion.section
            className="detail-panel detail-panel--advisor"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.25 }}
          >
            {/* 路径标题 */}
            <div className="detail-panel__head">
              <div className="detail-panel__dot" style={{ background: dimColor }} />
              <HudText variant="system" color={dimColor}>DEVELOPMENT PATH</HudText>
              {hierarchyGoals.length > 0 && (
                <HudText variant="label" color={colors.textDim} style={{ marginLeft: 'auto' }}>
                  {hierarchyGoals.length} goals · {hierarchyGoals.reduce((s, g) => s + g.plans.length, 0)} plans · {hierarchyGoals.reduce((s, g) => s + g.plans.reduce((ps, p) => ps + p.tasks.length, 0), 0)} tasks
                </HudText>
              )}
            </div>

            {/* 维度说明 */}
            <div style={{ padding: '0 4px 10px', fontSize: 11, color: colors.textMuted, lineHeight: 1.6 }}>
              {dimensionDescriptions[dimension.key]}
            </div>

            {/* 层级规划树 / Loading 态 */}
            {hierarchyGoals.length > 0 ? (
              <HierarchyTree
                goals={hierarchyGoals}
                onActionComplete={handleActionComplete}
                dimensionColor={dimColor}
                onRequestEdit={handleRequestEdit}
                modifiedIds={modifiedIds}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <OracleOrb size={40} />
                <motion.div
                  className="text-center"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <p className="text-xs font-mono text-cyan-300/70 tracking-wider">
                    Oracle 正在为该维度生成发展路径...
                  </p>
                  <p className="text-[10px] font-mono text-gray-600 mt-1">
                    COMPUTING GOALS · PLANS · TASKS
                  </p>
                </motion.div>
                {/* Skeleton placeholders */}
                <div className="w-full mt-4 flex flex-col gap-3 px-2">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="rounded-sm border border-white/[0.04] p-3"
                      style={{ background: 'rgba(17,24,39,0.5)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-sm" style={{ background: `${dimColor}22` }} />
                        <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.04)', maxWidth: `${60 + i * 15}%` }} />
                      </div>
                      <div className="pl-6 flex flex-col gap-1.5">
                        <div className="h-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)', width: '80%' }} />
                        <div className="h-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', width: '60%' }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* ═══ 右列：AI 顾问 + 全维度对比 ═══ */}
          <motion.section
            className="detail-panel detail-panel--compare"
            style={{ overflow: 'hidden auto' }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.25 }}
          >
            {/* AI 现状分析 */}
            <div className="detail-panel__head">
              <div className="detail-panel__dot" style={{ background: colors.patch }} />
              <HudText variant="system" color={colors.patch}>ADVISOR</HudText>
              {advisor.status === 'loading' && (
                <motion.span
                  className="ml-auto text-[9px] font-mono"
                  style={{ color: colors.patch }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ...
                </motion.span>
              )}
              <button
                className="advisor-btn"
                onClick={advisor.regenerateAnalysis}
                disabled={advisor.status === 'loading'}
                title="重新分析"
                style={{ marginLeft: 'auto' }}
              >↻</button>
            </div>

            <div className="advisor-block" style={{ marginBottom: 10 }}>
              {advisor.status === 'loading' ? (
                <div className="flex items-center gap-3 py-3">
                  <OracleOrb size={24} />
                  <motion.span
                    className="text-[11px] font-mono text-cyan-300/60"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Oracle 正在分析宿主状态...
                  </motion.span>
                </div>
              ) : (
                <MarkdownContent content={advisor.analysis || '正在分析宿主状态...'} className="advisor-analysis" />
              )}
            </div>

            {/* 大机缘 */}
            {advisor.opportunities.length > 0 && (
              <div className="advisor-block advisor-block--fortune" style={{ marginBottom: 10 }}>
                <div className="advisor-block__head">
                  <span className="advisor-block__title" style={{ color: colors.exp }}>⚡ 推荐资源</span>
                </div>
                <div className="advisor-opportunities">
                  {advisor.opportunities.map(opp => (
                    <motion.div
                      key={opp.id}
                      className="advisor-opp"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="advisor-opp__type">{
                        opp.type === 'app' ? '📱' :
                        opp.type === 'course' ? '🎓' :
                        opp.type === 'method' ? '📘' :
                        opp.type === 'community' ? '👥' : '🔧'
                      }</div>
                      <div className="advisor-opp__body">
                        <div className="advisor-opp__title">{opp.title}</div>
                        <div className="advisor-opp__desc">{opp.description}</div>
                      </div>
                      {opp.link && (
                        <a href={opp.link} target="_blank" rel="noopener" className="advisor-opp__link" style={{ color: colors.patch }}>→</a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 全维度对比 */}
            <div className="detail-panel__head" style={{ marginTop: 8 }}>
              <div className="detail-panel__dot" style={{ background: colors.textMuted }} />
              <HudText variant="system" color={colors.textMuted}>ALL DIMENSIONS</HudText>
            </div>

            <div className="detail-compare-list">
              {allDimensions.map((dim, i) => {
                const c = (colors as Record<string, string>)[dim.key] || colors.textDim
                const isActive = dim.key === dimension.key
                return (
                  <motion.div
                    key={dim.key}
                    className={`detail-compare-row ${isActive ? 'is-active' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dim.locked ? 0.35 : 1 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                  >
                    <div className="detail-compare-row__icon" style={{ background: c, borderColor: c }}>
                      {dim.locked ? '⌁' : dim.icon}
                    </div>
                    <div className="detail-compare-row__info">
                      <span className="detail-compare-row__name" style={{ color: isActive ? '#fff' : colors.textMuted }}>
                        {dim.labelEn}
                      </span>
                      {dim.locked ? (
                        <div className="detail-compare-row__locked">LOCKED</div>
                      ) : (
                        <StatBar current={dim.score} max={100} color={c} height={3} delay={0.5 + i * 0.06} />
                      )}
                    </div>
                    <span className="detail-compare-row__score" style={{ color: c }}>
                      {dim.locked ? '--' : dim.score}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        </div>
      </div>

      {/* 底部装饰线 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${dimColor}, transparent)` }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      {/* ─── AI 修改对话框 ─── */}
      <HierarchyEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        selectedItems={editSelectedItems}
        fullGoal={hierarchyGoals.find(g => g.id === editGoalId) || null}
        dimensionKey={dimension.key}
        dimensionColor={dimColor}
        onApplyEdit={handleApplyEdit}
        onInjectChat={onInjectChat}
      />
    </motion.div>
  )
}
