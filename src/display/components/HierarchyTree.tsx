import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DimensionKey } from '../../App'
import type { HierarchyGoal, HierarchyPlan, HierarchyTask, HierarchyAction } from '../../core/hierarchy'
import type { SelectedItem } from '../../services/hierarchyEditor'
import { colors, easing, duration } from '../../design-system'

interface HierarchyTreeProps {
  goals: HierarchyGoal[]
  onActionComplete: (actionId: string, goalId: string, dimension: DimensionKey, exp: number) => void
  dimensionColor: string
  /** 编辑回调 — 用户选中节点后请求 AI 修改 */
  onRequestEdit?: (selectedItems: SelectedItem[], goalId: string) => void
  /** 被 AI 修改的节点 ID 集合 */
  modifiedIds?: Set<string>
}

/**
 * 层级树组件 — Goals → Plans → Tasks → Actions 树状目录
 * 支持：选中态、AI修改标签、进度百分比追踪
 */
export default function HierarchyTree({
  goals,
  onActionComplete,
  dimensionColor,
  onRequestEdit,
  modifiedIds,
}: HierarchyTreeProps) {
  // 默认展开所有 goals 和 plans
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(
    new Set(goals.map(g => g.id))
  )
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(
    new Set(goals.flatMap(g => g.plans.map(p => p.id)))
  )
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    new Set(goals.flatMap(g => g.plans.flatMap(p => p.tasks.map(t => t.id))))
  )

  // 选中态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  const toggleGoal = useCallback((id: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const togglePlan = useCallback((id: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleTask = useCallback((id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // 选中/取消选中节点
  const toggleSelect = useCallback((id: string, type: SelectedItem['type'], text: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setSelectedItems(items => items.filter(i => i.id !== id))
      } else {
        next.add(id)
        setSelectedItems(items => {
          // 去重：避免同一 id 被加入多次
          if (items.some(i => i.id === id)) return items
          return [...items, { id, type, text }]
        })
      }
      return next
    })
  }, [])

  // 清除所有选中
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedItems([])
  }, [])

  // 移除单个选中
  const removeSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setSelectedItems(items => items.filter(i => i.id !== id))
  }, [])

  // 发送编辑请求
  const handleRequestEdit = useCallback(() => {
    if (!onRequestEdit || selectedItems.length === 0) return
    // 找到选中项所属的 goal
    const firstSelected = selectedItems[0]
    let goalId = ''
    for (const goal of goals) {
      if (goal.id === firstSelected.id) { goalId = goal.id; break }
      for (const plan of goal.plans) {
        if (plan.id === firstSelected.id) { goalId = goal.id; break }
        for (const task of plan.tasks) {
          if (task.id === firstSelected.id) { goalId = goal.id; break }
          for (const action of task.actions) {
            if (action.id === firstSelected.id) { goalId = goal.id; break }
          }
          if (goalId) break
        }
        if (goalId) break
      }
      if (goalId) break
    }
    if (!goalId && goals.length > 0) goalId = goals[0].id
    onRequestEdit(selectedItems, goalId)
    clearSelection()
  }, [onRequestEdit, selectedItems, goals, clearSelection])

  if (goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-xs font-mono">
        [系统] 暂无规划数据。请完成初始化方案选择。
      </div>
    )
  }

  // 整体进度
  const allActions = goals.flatMap(g => g.plans.flatMap(p => p.tasks.flatMap(t => t.actions)))
  const completedActions = allActions.filter(a => a.completed).length
  const totalProgress = allActions.length > 0 ? Math.round((completedActions / allActions.length) * 100) : 0

  return (
    <div className="hierarchy-tree">
      {/* 整体进度条 */}
      <div className="hierarchy-tree__overview">
        <div className="hierarchy-tree__overview-header">
          <span className="hierarchy-tree__overview-label">OVERALL PROGRESS</span>
          <span className="hierarchy-tree__overview-pct" style={{ color: dimensionColor }}>{totalProgress}%</span>
        </div>
        <div className="hierarchy-tree__overview-bar">
          <motion.div
            className="hierarchy-tree__overview-bar-fill"
            style={{ background: dimensionColor }}
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ duration: 0.6, ease: easing.sharp }}
          />
        </div>
        <div className="hierarchy-tree__overview-meta">
          <span>{completedActions}/{allActions.length} actions</span>
          <span>{goals.length} goals · {goals.reduce((s, g) => s + g.plans.length, 0)} plans · {goals.reduce((s, g) => s + g.plans.reduce((ps, p) => ps + p.tasks.length, 0), 0)} tasks</span>
        </div>
      </div>

      {/* Goals 树 */}
      {goals.map((goal, gi) => (
        <GoalNode
          key={goal.id}
          goal={goal}
          index={gi}
          expanded={expandedGoals.has(goal.id)}
          onToggle={() => toggleGoal(goal.id)}
          expandedPlans={expandedPlans}
          onTogglePlan={togglePlan}
          expandedTasks={expandedTasks}
          onToggleTask={toggleTask}
          onActionComplete={onActionComplete}
          dimensionColor={dimensionColor}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          modifiedIds={modifiedIds}
        />
      ))}

      {/* ─── 浮动选中操作栏 ─── */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div
            className="hierarchy-tree__selection-bar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
          >
            <div className="hierarchy-tree__selection-chips">
              <span className="hierarchy-tree__selection-label">已选中:</span>
              {Array.from(new Map(selectedItems.map(item => [item.id, item])).values()).map(item => (
                <span key={item.id} className="hierarchy-tree__selection-chip">
                  <span className="hierarchy-tree__chip-type">{item.type.toUpperCase()}</span>
                  <span className="hierarchy-tree__chip-text">{item.text.slice(0, 20)}{item.text.length > 20 ? '...' : ''}</span>
                  <button
                    className="hierarchy-tree__chip-remove"
                    onClick={() => removeSelection(item.id)}
                  >×</button>
                </span>
              ))}
              <button className="hierarchy-tree__selection-clear" onClick={clearSelection}>
                清除全部
              </button>
            </div>

            <button
              className="hierarchy-tree__edit-btn"
              onClick={handleRequestEdit}
              style={{ borderColor: `${dimensionColor}66`, color: dimensionColor }}
            >
              <span className="hierarchy-tree__edit-icon">✦</span>
              <span>发送给 Oracle 修改</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Goal Node ───
interface GoalNodeProps {
  goal: HierarchyGoal
  index: number
  expanded: boolean
  onToggle: () => void
  expandedPlans: Set<string>
  onTogglePlan: (id: string) => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  onActionComplete: (actionId: string, goalId: string, dimension: DimensionKey, exp: number) => void
  dimensionColor: string
  selectedIds: Set<string>
  onToggleSelect: (id: string, type: SelectedItem['type'], text: string) => void
  modifiedIds?: Set<string>
}

function GoalNode({ goal, index, expanded, onToggle, expandedPlans, onTogglePlan, expandedTasks, onToggleTask, onActionComplete, dimensionColor, selectedIds, onToggleSelect, modifiedIds }: GoalNodeProps) {
  const completedActions = goal.plans.flatMap(p => p.tasks.flatMap(t => t.actions)).filter(a => a.completed).length
  const totalActions = goal.plans.flatMap(p => p.tasks.flatMap(t => t.actions)).length
  const progress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0
  const isSelected = selectedIds.has(goal.id)
  const isModified = modifiedIds?.has(goal.id)

  return (
    <motion.div
      className={`hierarchy-tree__goal ${isSelected ? 'hierarchy-tree__goal--selected' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: duration.normal, ease: easing.smooth }}
    >
      {/* Goal 头部 */}
      <div className="hierarchy-tree__goal-header">
        <button className="hierarchy-tree__toggle-btn" onClick={onToggle}>
          <span className="hierarchy-tree__icon">{goal.icon}</span>
          <motion.span
            className="hierarchy-tree__chevron"
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            ▸
          </motion.span>
        </button>

        <div
          className="hierarchy-tree__goal-info hierarchy-tree__selectable"
          onClick={() => onToggleSelect(goal.id, 'goal', goal.text)}
        >
          <span className="hierarchy-tree__goal-text">{goal.text}</span>
          <div className="hierarchy-tree__goal-meta">
            <span className="hierarchy-tree__progress-badge" style={{ color: dimensionColor }}>
              {progress}%
            </span>
            <span className="hierarchy-tree__count">
              {completedActions}/{totalActions} actions
            </span>
            {isModified && (
              <motion.span
                className="hierarchy-tree__modified-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                已修改
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Goal 进度条 */}
      <div className="hierarchy-tree__bar">
        <motion.div
          className="hierarchy-tree__bar-fill"
          style={{ background: dimensionColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: easing.sharp }}
        />
      </div>

      {/* 展开的 Plans */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="hierarchy-tree__children"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
          >
            {goal.plans.map((plan, pi) => (
              <PlanNode
                key={plan.id}
                plan={plan}
                goalId={goal.id}
                dimension={goal.dimension}
                index={pi}
                expanded={expandedPlans.has(plan.id)}
                onToggle={() => onTogglePlan(plan.id)}
                expandedTasks={expandedTasks}
                onToggleTask={onToggleTask}
                onActionComplete={onActionComplete}
                dimensionColor={dimensionColor}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                modifiedIds={modifiedIds}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Plan Node ───
interface PlanNodeProps {
  plan: HierarchyPlan
  goalId: string
  dimension: DimensionKey
  index: number
  expanded: boolean
  onToggle: () => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  onActionComplete: (actionId: string, goalId: string, dimension: DimensionKey, exp: number) => void
  dimensionColor: string
  selectedIds: Set<string>
  onToggleSelect: (id: string, type: SelectedItem['type'], text: string) => void
  modifiedIds?: Set<string>
}

function PlanNode({ plan, goalId, dimension, index, expanded, onToggle, expandedTasks, onToggleTask, onActionComplete, dimensionColor, selectedIds, onToggleSelect, modifiedIds }: PlanNodeProps) {
  const completedActions = plan.tasks.flatMap(t => t.actions).filter(a => a.completed).length
  const totalActions = plan.tasks.flatMap(t => t.actions).length
  const planProgress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0
  const isSelected = selectedIds.has(plan.id)
  const isModified = modifiedIds?.has(plan.id)

  return (
    <div className={`hierarchy-tree__plan ${isSelected ? 'hierarchy-tree__plan--selected' : ''}`}>
      <div className="hierarchy-tree__plan-header">
        <button className="hierarchy-tree__toggle-btn hierarchy-tree__toggle-btn--sm" onClick={onToggle}>
          <span className="hierarchy-tree__connector">├──</span>
          <span className="hierarchy-tree__plan-icon">📋</span>
          <motion.span
            className="hierarchy-tree__chevron hierarchy-tree__chevron--sm"
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            ▸
          </motion.span>
        </button>

        <div
          className="hierarchy-tree__plan-info hierarchy-tree__selectable"
          onClick={() => onToggleSelect(plan.id, 'plan', plan.text)}
        >
          <span className="hierarchy-tree__plan-text">{plan.text}</span>
        </div>

        <span className="hierarchy-tree__timeframe">{plan.timeframe}</span>
        <span className="hierarchy-tree__plan-pct" style={{ color: dimensionColor }}>{planProgress}%</span>
        {isModified && (
          <motion.span
            className="hierarchy-tree__modified-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            已修改
          </motion.span>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="hierarchy-tree__tasks"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {plan.tasks.map((task, ti) => (
              <TaskNode
                key={task.id}
                task={task}
                goalId={goalId}
                dimension={dimension}
                expanded={expandedTasks.has(task.id)}
                onToggle={() => onToggleTask(task.id)}
                onActionComplete={onActionComplete}
                dimensionColor={dimensionColor}
                isLast={ti === plan.tasks.length - 1}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                modifiedIds={modifiedIds}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Task Node ───
interface TaskNodeProps {
  task: HierarchyTask
  goalId: string
  dimension: DimensionKey
  expanded: boolean
  onToggle: () => void
  onActionComplete: (actionId: string, goalId: string, dimension: DimensionKey, exp: number) => void
  dimensionColor: string
  isLast: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string, type: SelectedItem['type'], text: string) => void
  modifiedIds?: Set<string>
}

function TaskNode({ task, goalId, dimension, expanded, onToggle, onActionComplete, dimensionColor, isLast, selectedIds, onToggleSelect, modifiedIds }: TaskNodeProps) {
  const completedCount = task.actions.filter(a => a.completed).length
  const totalCount = task.actions.length
  const allDone = completedCount === totalCount && totalCount > 0
  const isSelected = selectedIds.has(task.id)
  const isModified = modifiedIds?.has(task.id)

  return (
    <div className={`hierarchy-tree__task ${isSelected ? 'hierarchy-tree__task--selected' : ''}`}>
      <div className="hierarchy-tree__task-header">
        <button className="hierarchy-tree__toggle-btn hierarchy-tree__toggle-btn--sm" onClick={onToggle}>
          <span className="hierarchy-tree__connector">{isLast ? '└──' : '├──'}</span>
          <span className="hierarchy-tree__task-icon">{allDone ? '✅' : '📌'}</span>
          <motion.span
            className="hierarchy-tree__chevron hierarchy-tree__chevron--sm"
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            ▸
          </motion.span>
        </button>

        <div
          className={`hierarchy-tree__task-info hierarchy-tree__selectable ${allDone ? 'line-through opacity-50' : ''}`}
          onClick={() => onToggleSelect(task.id, 'task', task.text)}
        >
          <span className="hierarchy-tree__task-text">{task.text}</span>
        </div>

        <span className="hierarchy-tree__frequency">{task.frequency}</span>
        <span className="hierarchy-tree__task-count" style={{ color: allDone ? '#10B981' : colors.textDim }}>
          {completedCount}/{totalCount}
        </span>
        {isModified && (
          <motion.span
            className="hierarchy-tree__modified-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            已修改
          </motion.span>
        )}
      </div>

      {/* Actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="hierarchy-tree__actions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {task.actions.map((action, ai) => (
              <ActionNode
                key={action.id}
                action={action}
                goalId={goalId}
                onComplete={() => onActionComplete(action.id, goalId, dimension, action.exp)}
                dimensionColor={dimensionColor}
                isLast={ai === task.actions.length - 1}
                isSelected={selectedIds.has(action.id)}
                onToggleSelect={() => onToggleSelect(action.id, 'action', action.text)}
                isModified={modifiedIds?.has(action.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Action Node ───
interface ActionNodeProps {
  action: HierarchyAction
  goalId: string
  onComplete: () => void
  dimensionColor: string
  isLast: boolean
  isSelected: boolean
  onToggleSelect: () => void
  isModified?: boolean
}

function ActionNode({ action, goalId, onComplete, dimensionColor, isLast, isSelected, onToggleSelect, isModified }: ActionNodeProps) {
  return (
    <motion.div
      className={`hierarchy-tree__action ${action.completed ? 'hierarchy-tree__action--done' : ''} ${isSelected ? 'hierarchy-tree__action--selected' : ''}`}
      whileHover={action.completed ? {} : { x: 2 }}
    >
      <span className="hierarchy-tree__connector hierarchy-tree__connector--action">
        {isLast ? '└─' : '├─'}
      </span>

      {/* 完成状态 */}
      {action.completed ? (
        <span className="hierarchy-tree__check">✓</span>
      ) : (
        <button
          className="hierarchy-tree__action-btn"
          style={{ borderColor: `${dimensionColor}66` }}
          onClick={onComplete}
          title="打卡完成"
        >
          <motion.span
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
          >
            ○
          </motion.span>
        </button>
      )}

      <span
        className={`hierarchy-tree__action-text hierarchy-tree__selectable ${action.completed ? 'line-through opacity-40' : ''}`}
        onClick={onToggleSelect}
      >
        {action.text}
      </span>

      {/* EXP badge */}
      {!action.completed && (
        <span
          className="hierarchy-tree__exp-badge"
          style={{ color: dimensionColor }}
        >
          +{action.exp}
        </span>
      )}

      {/* Modified badge */}
      {isModified && (
        <motion.span
          className="hierarchy-tree__modified-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          已修改
        </motion.span>
      )}
    </motion.div>
  )
}
