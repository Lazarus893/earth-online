/**
 * Hierarchy Editor — 通过 OpenClaw AI 修改层级规划节点
 *
 * 用户选中 Goal/Plan/Task/Action 后发送给 AI，
 * AI 返回修改后的完整 Goal 子树（含上下游联动修改）
 */

import type { DimensionKey } from '../App'
import type { HierarchyGoal, HierarchyPlan, HierarchyTask, HierarchyAction } from '../core/hierarchy'

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''

export interface SelectedItem {
  id: string
  type: 'goal' | 'plan' | 'task' | 'action'
  text: string
}

export interface EditRequest {
  selectedItems: SelectedItem[]
  fullGoal: HierarchyGoal
  dimensionKey: DimensionKey
  userInstruction?: string
}

export interface EditResult {
  updatedGoal: HierarchyGoal
  modifiedIds: string[]
}

const SYSTEM_PROMPT = `你是 Earth Online 的规划修改引擎。用户选中了规划树中的节点，你需要对其进行优化修改。

规则：
1. 修改选中节点，同时联动调整上下游节点使其逻辑一致
2. 保持游戏化语言风格，简洁有力
3. 保留未被影响的节点原样不动
4. ACTION 的 EXP 值保持在 8-25 之间
5. 返回修改后的完整 Goal JSON + 被修改的节点 ID 列表
6. 保持所有节点的 id 字段不变（除非是新增节点）
7. 新增节点使用 "new-" 前缀的 id

输出严格 JSON 格式：
{
  "goal": {
    "id": "原始goal id",
    "text": "目标描述（可能微调）",
    "dimension": "维度key",
    "icon": "emoji",
    "progress": 0,
    "plans": [
      {
        "id": "原始plan id",
        "text": "计划描述",
        "timeframe": "时间框架",
        "progress": 0,
        "tasks": [
          {
            "id": "原始task id",
            "text": "任务描述",
            "frequency": "daily|weekly|once",
            "completed": false,
            "actions": [
              { "id": "原始action id", "text": "具体动作", "exp": 15, "dimension": "维度key", "completed": false, "source": "ai" }
            ]
          }
        ]
      }
    ]
  },
  "modifiedIds": ["被修改的节点id1", "被修改的节点id2"]
}`

function buildUserPrompt(req: EditRequest): string {
  const selectedDesc = req.selectedItems
    .map(item => `- [${item.type.toUpperCase()}] "${item.text}" (id: ${item.id})`)
    .join('\n')

  const goalJson = JSON.stringify(req.fullGoal, null, 2)

  return `用户选中了以下节点希望 AI 优化修改：
${selectedDesc}

${req.userInstruction ? `用户修改指令：${req.userInstruction}\n` : ''}
当前 Goal 完整结构如下：
\`\`\`json
${goalJson}
\`\`\`

请对选中节点进行优化修改，并联动调整上下游使其逻辑一致。未受影响的节点保持原样。`
}

/** 发送修改请求到 OpenClaw */
export async function requestHierarchyEdit(req: EditRequest): Promise<EditResult> {
  try {
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_OPENCLAW_MODEL || 'openclaw/codex',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(req) },
        ],
        temperature: 0.6,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) throw new Error(`Gateway ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    // 解析 JSON
    let jsonStr = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) jsonStr = codeBlockMatch[1]
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.goal) throw new Error('No goal in response')

    const updatedGoal = normalizeGoal(parsed.goal, req.fullGoal)
    const modifiedIds: string[] = parsed.modifiedIds || []

    return { updatedGoal, modifiedIds }
  } catch (err) {
    console.warn('[HierarchyEditor] Edit failed:', err)
    throw err
  }
}

/** 标准化 AI 返回的 Goal 数据，保留原有字段默认值 */
function normalizeGoal(raw: any, original: HierarchyGoal): HierarchyGoal {
  return {
    id: raw.id || original.id,
    text: raw.text || original.text,
    dimension: (raw.dimension || original.dimension) as DimensionKey,
    icon: raw.icon || original.icon,
    progress: typeof raw.progress === 'number' ? raw.progress : original.progress,
    plans: (raw.plans || []).map((p: any, pi: number) => {
      const origPlan = original.plans.find(op => op.id === p.id)
      return normalizePlan(p, origPlan, original.dimension)
    }),
  }
}

function normalizePlan(raw: any, original: HierarchyPlan | undefined, dimKey: DimensionKey): HierarchyPlan {
  return {
    id: raw.id || `new-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: raw.text || original?.text || '未命名计划',
    timeframe: raw.timeframe || original?.timeframe || '每周',
    progress: typeof raw.progress === 'number' ? raw.progress : (original?.progress ?? 0),
    tasks: (raw.tasks || []).map((t: any) => {
      const origTask = original?.tasks.find(ot => ot.id === t.id)
      return normalizeTask(t, origTask, dimKey)
    }),
  }
}

function normalizeTask(raw: any, original: HierarchyTask | undefined, dimKey: DimensionKey): HierarchyTask {
  return {
    id: raw.id || `new-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: raw.text || original?.text || '未命名任务',
    frequency: raw.frequency || original?.frequency || 'daily',
    completed: typeof raw.completed === 'boolean' ? raw.completed : (original?.completed ?? false),
    actions: (raw.actions || []).map((a: any) => {
      const origAction = original?.actions.find(oa => oa.id === a.id)
      return normalizeAction(a, origAction, dimKey)
    }),
  }
}

function normalizeAction(raw: any, original: HierarchyAction | undefined, dimKey: DimensionKey): HierarchyAction {
  return {
    id: raw.id || `new-action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: raw.text || original?.text || '未命名行动',
    exp: typeof raw.exp === 'number' ? raw.exp : (original?.exp ?? 12),
    dimension: (raw.dimension || original?.dimension || dimKey) as DimensionKey,
    completed: typeof raw.completed === 'boolean' ? raw.completed : (original?.completed ?? false),
    source: (raw.source || original?.source || 'ai') as 'ai' | 'user',
  }
}
