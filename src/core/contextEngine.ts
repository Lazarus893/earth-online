/**
 * 动态上下文引擎 — 构建场景感知的 AI 系统提示
 *
 * 替代原有的静态 buildSystemPrompt()，实现：
 * 1. 场景感知 — 根据用户当前所在页面注入相关上下文
 * 2. 记忆种子 — 用户 onboarding 时的自由文本回答
 * 3. 交互摘要 — 今日对话中的关键信息
 * 4. 预算控制 — 系统提示总长不超过限制
 */

import type { DimensionKey, DimensionData } from '../App'
import type { Quest } from '../hooks/useGameState'
import type { HierarchyGoal } from './hierarchy'
import type { MemorySeed } from './memorySeeds'
import type { InteractionSummary } from './interactionSummary'
import { getStatusLabel } from '../data/dimensionStatus'
import { formatSeedsForPrompt } from './memorySeeds'
import { formatSummaryForPrompt } from './interactionSummary'

// ─── 类型定义 ───

export interface SceneContext {
  scene: 'dashboard' | 'dimension-detail' | 'onboarding'
  /** 当前查看的维度 (仅 dimension-detail 时有值) */
  dimensionKey?: DimensionKey
  /** 当前维度的 goals (仅 dimension-detail 时有值) */
  hierarchyGoals?: HierarchyGoal[]
  /** 最近完成的 actions (用于场景相关推荐) */
  recentActions?: string[]
}

export interface ContextPayload {
  scene: SceneContext
  summary: InteractionSummary | null
  memorySeeds: MemorySeed[]
  dimensions: DimensionData[]
  quests: Quest[]
  streak: number
  playerLevel: number
}

// ─── 常量 ───

const DEFAULT_MAX_CHARS = 2800

// ─── 核心人设（固定，不受预算裁剪影响） ───

const PERSONA_BLOCK = `你是 Oracle，Earth Online 系统的 AI 内核。你的角色类似一位温暖的心理咨询师——真正关心宿主，善于倾听，懂得共情。

## 你的风格
- 先倾听、共情，再给建议。不急于解决问题，先让宿主感到被理解
- 说话自然、温柔但真诚，不打官腔、不灌鸡汤、不空洞鼓励
- 善用开放式提问引导宿主思考，而非直接下指令
- 根据宿主当前状态灵活调整：状态低迷时降低要求、给予支持；状态好时温和鼓励多做一点
- 偶尔可以用轻松幽默的方式缓解压力
- 记住：你不是冷冰冰的系统，你是宿主可以信赖的伙伴

## 你能做的
- 倾听宿主的困扰、压力、迷茫，帮助梳理情绪和想法
- 帮宿主调整任务难度和节奏
- 回答学习、训练、作息、精力管理等实际问题
- 推荐资源和工具
- 宿主状态低迷时帮他找到一件「现在就能做」的小事
- 根据宿主的计划和进度，主动提出观察和建议

## 格式
直接说话，简短自然。不要加任何角色前缀（不要写[系统]、[Oracle]等）。`

// ─── 构建函数 ───

/**
 * 构建动态上下文 — 主入口
 *
 * 按优先级分配预算：
 * 1. 人设+风格 (~800 chars) — 不可裁剪
 * 2. 当前状态 (~400 chars) — 维度+等级+状态文案
 * 3. 场景上下文 (~400 chars) — 维度详情页时注入 goals
 * 4. 记忆种子 (~400 chars) — onboarding 自述
 * 5. 交互摘要 (~300 chars) — 今日对话记忆
 * 6. 日志/任务 (~300 chars) — 今日记录
 */
export function buildDynamicContext(payload: ContextPayload, maxChars: number = DEFAULT_MAX_CHARS): string {
  const blocks: string[] = []

  // Block 1: 人设（固定）
  blocks.push(PERSONA_BLOCK)

  // Block 2: 当前状态
  blocks.push(buildStateBlock(payload))

  // Block 3: 场景上下文
  const sceneBlock = buildSceneBlock(payload.scene, payload.dimensions)
  if (sceneBlock) blocks.push(sceneBlock)

  // Block 4: 记忆种子
  const seedsBlock = formatSeedsForPrompt(payload.memorySeeds)
  if (seedsBlock) blocks.push(seedsBlock)

  // Block 5: 交互摘要
  const summaryBlock = formatSummaryForPrompt(payload.summary)
  if (summaryBlock) blocks.push(summaryBlock)

  // Block 6: 日志/任务
  const questBlock = buildQuestBlock(payload.quests)
  if (questBlock) blocks.push(questBlock)

  // 组装并做预算裁剪
  let result = blocks.join('\n\n')

  // 如果超预算，从后向前移除可选 block
  if (result.length > maxChars) {
    // 移除 quest block
    result = blocks.slice(0, -1).join('\n\n')
  }
  if (result.length > maxChars) {
    // 移除 summary block
    result = blocks.slice(0, -2).join('\n\n')
  }
  if (result.length > maxChars) {
    // 移除 seeds block
    result = blocks.slice(0, -3).join('\n\n')
  }

  return result
}

// ─── 内部构建函数 ───

function buildStateBlock(payload: ContextPayload): string {
  const { dimensions, playerLevel, streak } = payload

  const dimStr = dimensions
    .filter(d => !d.locked)
    .map(d => `${d.label}(${d.labelEn}): LV.${d.level} · ${getStatusLabel(d.key, d.score)}`)
    .join(' | ')

  const lines = [
    `## 宿主当前状态`,
    `- 等级: LV.${playerLevel} · 连续活跃: ${streak}天`,
    `- 属性: ${dimStr}`,
  ]

  return lines.join('\n')
}

function buildSceneBlock(scene: SceneContext, dimensions: DimensionData[]): string | null {
  if (scene.scene === 'dashboard') {
    return null // Dashboard 不需要额外场景上下文
  }

  if (scene.scene === 'dimension-detail' && scene.dimensionKey) {
    const dim = dimensions.find(d => d.key === scene.dimensionKey)
    if (!dim) return null

    const lines = [`## 当前场景：${dim.label}维度详情`]

    if (scene.hierarchyGoals && scene.hierarchyGoals.length > 0) {
      lines.push('当前目标:')
      for (const goal of scene.hierarchyGoals.slice(0, 3)) {
        lines.push(`- ${goal.text} (进度 ${goal.progress}%)`)
        // 简要列出 plans
        for (const plan of goal.plans.slice(0, 2)) {
          lines.push(`  · ${plan.text}`)
        }
      }
    }

    if (scene.recentActions && scene.recentActions.length > 0) {
      lines.push(`最近完成: ${scene.recentActions.slice(0, 3).join('、')}`)
    }

    return lines.join('\n')
  }

  return null
}

function buildQuestBlock(quests: Quest[]): string | null {
  if (!quests || quests.length === 0) return null

  // 兼容 done (当前) 和 logged (Phase 4 迁移后)
  const isCompleted = (q: Quest) => (q as any).logged ?? q.done
  const logged = quests.filter(q => isCompleted(q))
  const pending = quests.filter(q => !isCompleted(q))

  const lines = ['## 今日记录']

  if (logged.length > 0) {
    lines.push(`已完成: ${logged.map(q => q.text).join('、')}`)
  }
  if (pending.length > 0) {
    lines.push(`待记录: ${pending.map(q => q.text).join('、')}`)
  }

  const doneCount = logged.length
  const total = quests.length
  lines.push(`进度: ${doneCount}/${total}`)

  return lines.join('\n')
}
