/**
 * Plan Generator — 调用 OpenClaw 生成 3 组发展方案
 *
 * 基于用户 onboarding 结果的维度分数，生成：
 * - 方案A：平衡发展型
 * - 方案B：突破优势型
 * - 方案C：补短板型
 *
 * 每组包含 Goals → Plans → Tasks → Actions 完整层级
 */

import type { DimensionKey, DimensionData } from '../App'
import type { DevelopmentScheme, HierarchyGoal, HierarchyPlan, HierarchyTask, HierarchyAction } from '../core/hierarchy'

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''

const SYSTEM_PROMPT = `你是 Earth Online 系统的核心 AI 规划模块。你需要为"宿主"生成个人发展方案。

规则：
1. 用游戏化语言，像 RPG 任务描述，简洁有力
2. TASK 要具体可执行，有明确的完成标准
3. 每个 ACTION 标注预计获得的 EXP 值 (8-25之间)
4. 输出严格 JSON 格式，不要多余文字
5. 方案名称要有中二感/游戏感

输出格式：
{
  "schemes": [
    {
      "name": "方案名称",
      "style": "balanced" | "strength" | "weakness",
      "description": "一句话描述",
      "goals": [
        {
          "text": "目标描述",
          "dimension": "physical" | "energy" | "career",
          "icon": "emoji",
          "plans": [
            {
              "text": "计划描述",
              "timeframe": "时间框架",
              "tasks": [
                {
                  "text": "任务描述",
                  "frequency": "daily" | "weekly" | "once",
                  "actions": [
                    { "text": "具体动作", "exp": 15 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`

function buildUserPrompt(dimensions: DimensionData[]): string {
  const unlocked = dimensions.filter(d => !d.locked)
  const dimStr = unlocked.map(d => `- ${d.labelEn}(${d.label}): 分数${d.score}/100, LV.${d.level}`).join('\n')

  const strongest = unlocked.reduce((a, b) => a.score > b.score ? a : b)
  const weakest = unlocked.reduce((a, b) => a.score < b.score ? a : b)

  return `宿主刚完成初始绑定，当前属性如下：
${dimStr}

最强维度: ${strongest.labelEn}(${strongest.label}) ${strongest.score}分
最弱维度: ${weakest.labelEn}(${weakest.label}) ${weakest.score}分

请生成 3 组发展方案：
- 方案A：平衡发展型（均匀提升各维度，每个维度至少一个目标）
- 方案B：突破优势型（集中强化 ${strongest.labelEn}，辅助提升其他）
- 方案C：补短板型（优先强化 ${weakest.labelEn}，拉齐整体水平）

每组包含 2-3 个 GOAL，每个 GOAL 下 1-2 个 PLAN，每个 PLAN 下 2-3 个 TASK，每个 TASK 下 1-2 个 ACTION。`
}

/** 生成方案 — 优先调用 OpenClaw，失败回退预置数据 */
export async function generateSchemes(dimensions: DimensionData[]): Promise<DevelopmentScheme[]> {
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
          { role: 'user', content: buildUserPrompt(dimensions) },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!response.ok) throw new Error(`Gateway ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    let jsonStr = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) jsonStr = codeBlockMatch[1]
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])
    const schemes = parsed.schemes
    if (!Array.isArray(schemes) || schemes.length === 0) throw new Error('Empty schemes array')

    return normalizeSchemes(schemes, dimensions)
  } catch (err) {
    console.warn('[PlanGenerator] OpenClaw unavailable, using fallback:', err)
    return getFallbackSchemes(dimensions)
  }
}

/** 标准化 AI 返回的方案数据 */
function normalizeSchemes(raw: any[], dimensions: DimensionData[]): DevelopmentScheme[] {
  const styles: DevelopmentScheme['style'][] = ['balanced', 'strength', 'weakness']

  return raw.map((scheme, si) => ({
    id: `scheme-${Date.now()}-${si}`,
    name: scheme.name || `方案${String.fromCharCode(65 + si)}`,
    style: scheme.style || styles[si],
    description: scheme.description || '',
    goals: (scheme.goals || []).map((goal: any, gi: number) => normalizeGoal(goal, gi, dimensions)),
  }))
}

function normalizeGoal(raw: any, index: number, dimensions: DimensionData[]): HierarchyGoal {
  const dimKey = (raw.dimension || 'physical') as DimensionKey
  return {
    id: `goal-${Date.now()}-${index}`,
    text: raw.text || '未命名目标',
    dimension: dimKey,
    icon: raw.icon || '🎯',
    progress: 0,
    plans: (raw.plans || []).map((p: any, pi: number) => normalizePlan(p, pi, dimKey)),
  }
}

function normalizePlan(raw: any, index: number, dimKey: DimensionKey): HierarchyPlan {
  return {
    id: `plan-${Date.now()}-${index}`,
    text: raw.text || '未命名计划',
    timeframe: raw.timeframe || '每周',
    progress: 0,
    tasks: (raw.tasks || []).map((t: any, ti: number) => normalizeTask(t, ti, dimKey)),
  }
}

function normalizeTask(raw: any, index: number, dimKey: DimensionKey): HierarchyTask {
  return {
    id: `task-${Date.now()}-${index}`,
    text: raw.text || '未命名任务',
    frequency: raw.frequency || 'daily',
    completed: false,
    actions: (raw.actions || []).map((a: any, ai: number) => normalizeAction(a, ai, dimKey)),
  }
}

function normalizeAction(raw: any, index: number, dimKey: DimensionKey): HierarchyAction {
  return {
    id: `action-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: raw.text || '未命名行动',
    exp: typeof raw.exp === 'number' ? raw.exp : 12,
    dimension: dimKey,
    completed: false,
    source: 'ai',
  }
}

// ═══ Fallback 方案 (Agent 不可用时) ═══

function getFallbackSchemes(dimensions: DimensionData[]): DevelopmentScheme[] {
  const unlocked = dimensions.filter(d => !d.locked)
  const strongest = unlocked.reduce((a, b) => a.score > b.score ? a : b)
  const weakest = unlocked.reduce((a, b) => a.score < b.score ? a : b)

  return [
    {
      id: 'fallback-balanced',
      name: '均衡觉醒',
      style: 'balanced',
      description: '稳步提升所有维度，打好基础',
      goals: unlocked.slice(0, 3).map((dim, i) => makeDefaultGoal(dim, i)),
    },
    {
      id: 'fallback-strength',
      name: `${strongest.label}突破`,
      style: 'strength',
      description: `集中突破${strongest.label}维度，快速升级`,
      goals: [
        makeDefaultGoal(strongest, 0, '极限突破'),
        ...unlocked.filter(d => d.key !== strongest.key).slice(0, 1).map((d, i) => makeDefaultGoal(d, i + 1, '辅助提升')),
      ],
    },
    {
      id: 'fallback-weakness',
      name: `${weakest.label}补强`,
      style: 'weakness',
      description: `优先强化${weakest.label}维度，拉齐短板`,
      goals: [
        makeDefaultGoal(weakest, 0, '短板修复'),
        ...unlocked.filter(d => d.key !== weakest.key).slice(0, 1).map((d, i) => makeDefaultGoal(d, i + 1, '维持训练')),
      ],
    },
  ]
}

const DEFAULT_GOALS_DATA: Record<DimensionKey, { goal: string; plans: { text: string; timeframe: string; tasks: { text: string; frequency?: 'daily' | 'weekly' | 'once'; actions: { text: string; exp: number }[] }[] }[] }> = {
  physical: {
    goal: '建立规律运动习惯',
    plans: [
      {
        text: '每周3-4次运动训练',
        timeframe: '每周',
        tasks: [
          { text: '力量训练日', frequency: 'weekly', actions: [{ text: '完成深蹲/硬拉训练', exp: 18 }, { text: '记录训练数据', exp: 5 }] },
          { text: '有氧训练日', frequency: 'weekly', actions: [{ text: '30分钟跑步/游泳', exp: 15 }, { text: '拉伸放松10分钟', exp: 8 }] },
        ],
      },
      {
        text: '作息优化',
        timeframe: '每日',
        tasks: [
          { text: '睡眠管理', frequency: 'daily', actions: [{ text: '23:00前关灯入睡', exp: 10 }] },
          { text: '休息恢复', frequency: 'weekly', actions: [{ text: '泡沫轴/按摩放松', exp: 8 }] },
        ],
      },
    ],
  },
  energy: {
    goal: '建立精力管理系统',
    plans: [
      {
        text: '优化作息节奏',
        timeframe: '每日',
        tasks: [
          { text: '早起仪式', frequency: 'daily', actions: [{ text: '6:30起床+晨间冥想', exp: 12 }, { text: '规划今日任务', exp: 8 }] },
          { text: '睡前断电', frequency: 'daily', actions: [{ text: '22:30放下手机', exp: 10 }, { text: '阅读15分钟', exp: 8 }] },
        ],
      },
      {
        text: '深度工作训练',
        timeframe: '每日',
        tasks: [
          { text: '番茄钟训练', frequency: 'daily', actions: [{ text: '完成3个25分钟番茄钟', exp: 15 }] },
          { text: '冥想练习', frequency: 'daily', actions: [{ text: '正念冥想10分钟', exp: 10 }] },
        ],
      },
    ],
  },
  career: {
    goal: '完成 AI 产品经理转型',
    plans: [
      {
        text: 'AI 产品知识体系构建',
        timeframe: '每日',
        tasks: [
          { text: 'AI产品知识学习', frequency: 'daily', actions: [{ text: '完成1小时 AI 产品课程/阅读', exp: 20 }, { text: '撰写 AI 功能需求文档练习', exp: 18 }] },
          { text: '行业案例研究', frequency: 'weekly', actions: [{ text: '拆解1个 AI 产品案例（功能+数据+模型）', exp: 22 }] },
        ],
      },
      {
        text: 'Prompt Engineering 实战',
        timeframe: '每周',
        tasks: [
          { text: 'Prompt 优化练习', frequency: 'daily', actions: [{ text: '完成3个 Prompt 优化练习', exp: 15 }, { text: '输出1篇 Prompt 设计笔记', exp: 12 }] },
          { text: '构建 Prompt 模板库', frequency: 'weekly', actions: [{ text: '整理本周最佳 Prompt 到模板库', exp: 10 }] },
        ],
      },
      {
        text: '数据分析能力迁移',
        timeframe: '每周',
        tasks: [
          { text: '数据驱动产品分析', frequency: 'weekly', actions: [{ text: '用数据分析思维拆解1个AI产品指标', exp: 18 }] },
          { text: '输出产出', frequency: 'weekly', actions: [{ text: '写1篇 AI 产品分析文章', exp: 20 }] },
        ],
      },
    ],
  },
  social: {
    goal: '拓展 AI 行业人脉',
    plans: [
      {
        text: '每周主动社交',
        timeframe: '每周',
        tasks: [
          { text: '主动联系', frequency: 'weekly', actions: [{ text: '联系1位 AI 领域从业者', exp: 12 }] },
          { text: '参与社区', frequency: 'weekly', actions: [{ text: '在 AI 社区发布1条有价值的内容', exp: 15 }] },
        ],
      },
    ],
  },
  finance: {
    goal: '建立转行期财务安全网',
    plans: [
      {
        text: '收支管理',
        timeframe: '每日',
        tasks: [
          { text: '每日记账', frequency: 'daily', actions: [{ text: '记录今日收支', exp: 8 }] },
          { text: '理财学习', frequency: 'weekly', actions: [{ text: '阅读理财内容30分钟', exp: 15 }] },
        ],
      },
    ],
  },
}

function makeDefaultGoal(dim: DimensionData, index: number, prefix?: string): HierarchyGoal {
  const data = DEFAULT_GOALS_DATA[dim.key]
  const goalText = prefix ? `${prefix}: ${data.goal}` : data.goal

  return {
    id: `goal-fallback-${dim.key}-${index}`,
    text: goalText,
    dimension: dim.key,
    icon: dim.icon,
    progress: 0,
    plans: data.plans.map((p, pi) => ({
      id: `plan-fallback-${dim.key}-${index}-${pi}`,
      text: p.text,
      timeframe: p.timeframe,
      progress: 0,
      tasks: p.tasks.map((t, ti) => ({
        id: `task-fallback-${dim.key}-${index}-${pi}-${ti}`,
        text: t.text,
        frequency: (t.frequency || 'daily') as 'daily' | 'weekly' | 'once',
        completed: false,
        actions: t.actions.map((a, ai) => ({
          id: `action-fallback-${dim.key}-${index}-${pi}-${ti}-${ai}`,
          text: a.text,
          exp: a.exp,
          dimension: dim.key,
          completed: false,
          source: 'ai' as const,
        })),
      })),
    })),
  }
}
