/**
 * onboardingAI — 动态 Onboarding 对话引擎
 *
 * 核心理念：每轮回答后立即调用 AI，同时完成：
 * 1. 提取本轮维度信号
 * 2. 生成即时反射（让用户感到被听见）
 * 3. 基于对话历史动态生成下一个问题
 *
 * 回退策略：AI 不可用时使用 keyword 提取 + 备用问题池
 */

import type { DimensionKey } from '../App'
import type { QuestionOption } from '../data/questions'

const GATEWAY_URL = import.meta.env.VITE_OPENCLAW_GATEWAY_URL || '/api/openclaw'
const GATEWAY_TOKEN = import.meta.env.VITE_OPENCLAW_API_KEY || ''

// ─── 类型定义 ───

export interface ConversationTurn {
  round: number
  question: string
  answer: string
}

export interface DynamicQuestion {
  id: string
  questionText: string
  systemMessage: string
  options: QuestionOption[]
  allowCustom: boolean
  freeTextPrompt: string
}

export interface RoundResult {
  /** 本轮提取的维度信号 */
  signals: Partial<Record<DimensionKey, number>>
  /** AI 对用户回答的一句话即时反射 */
  reflection: string
  /** 下一个问题（最后一轮为 null） */
  nextQuestion: DynamicQuestion | null
  /** 最后一轮时 AI 推断的优先维度 */
  priority?: DimensionKey
  /** 最后一轮时 AI 推断的难度偏好 */
  difficulty?: 'easy' | 'medium' | 'hard' | 'casual'
}

// ─── 核心函数 ───

/**
 * 处理单轮对话 — 每轮调用一次
 */
export async function processRound(params: {
  roundIndex: number
  totalRounds: number
  currentQuestion: string
  userAnswer: string
  history: ConversationTurn[]
}): Promise<RoundResult> {
  const { roundIndex, totalRounds, currentQuestion, userAnswer, history } = params
  const isLastRound = roundIndex >= totalRounds - 1

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
          { role: 'system', content: buildRoundSystemPrompt(roundIndex, totalRounds, isLastRound) },
          { role: 'user', content: buildRoundUserPrompt(currentQuestion, userAnswer, history) },
        ],
        temperature: 0.6,
        max_tokens: 512,
        stream: false,
      }),
      signal: AbortSignal.timeout(6000),
    })

    if (!response.ok) throw new Error(`Gateway ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    return parseRoundResult(parsed, roundIndex, isLastRound)
  } catch {
    // AI 失败 → fallback
    return buildFallbackResult(roundIndex, totalRounds, userAnswer, isLastRound)
  }
}

// ─── Prompt 构建 ───

function buildRoundSystemPrompt(roundIndex: number, totalRounds: number, isLastRound: boolean): string {
  const base = `你正在与一位新用户进行 ${totalRounds} 轮了解对话。这是第 ${roundIndex + 1}/${totalRounds} 轮。

## 你的角色
你是 Oracle，一个借鉴心理咨询师沟通技巧的 AI 伙伴。通过主动设计好的问题引导用户表达需求，而非被动等待用户输入。

## 提问策略
用户大多只能模糊描述自己的状态（"还行"、"迷茫"）。你的任务是通过递进式提问，帮他们从模糊感受走向清晰认知：
- 第 1-2 轮：了解当前状态和感受（他们的日常是什么样的）
- 第 3-4 轮：探索背后的动机和痛点（什么在消耗他们、什么在驱动他们）
- 第 5-6 轮：明确方向和行动偏好（他们想要什么、愿意怎么开始）

## 五个观察维度
physical(体力/身体), energy(精力/情绪), career(职业/成长), social(社交/关系), finance(金钱/安全感)

## 规则
1. 每轮基于用户的回答，做一句简短的即时反射（"我听到了"的感觉），然后生成下一个追问
2. 反射要具体——引用用户说的话，不要泛泛而谈
3. 不要重复已经探索过的维度方向
4. 问题要短、自然、像朋友聊天，不像问卷调查
5. 提供 3-4 个选项帮助表达困难的用户，选项之间要有明显区分度
6. 每个选项附带维度影响预估（-3到+3）
7. 允许自由输入（很多用户的真实状态不在选项里）
8. 禁止使用心理学术语、禁止说"你是X型的人"
9. 禁止空洞鼓励（"加油"、"你很棒"）
10. 反射不超过 2 句话，问题不超过 30 字`

  if (isLastRound) {
    return base + `

这是最后一轮。不需要生成 nextQuestion（设为 null）。
额外返回：
- priority: 根据整段对话推断用户最应该优先发展的维度 (physical/energy/career)
- difficulty: 根据用户的表达风格和期望推断偏好 (easy=稳步推进/medium=适度挑战/hard=高强度/casual=随心所欲)

返回 JSON:
{
  "signals": {"维度": 数值, ...},
  "reflection": "反射文字（引用用户原话）",
  "nextQuestion": null,
  "priority": "维度key",
  "difficulty": "难度"
}`
  }

  return base + `

返回严格 JSON（不要其他文字）:
{
  "signals": {"维度": 数值, ...},
  "reflection": "一句话反射（引用用户的原话，让他感到被听见）",
  "nextQuestion": {
    "questionText": "下一个问题（短且自然，不超过30字）",
    "systemMessage": "HUD系统提示（8字内，类似'扫描精力状态...'）",
    "options": [
      {"id": "r${roundIndex + 2}a", "text": "选项1（具体、有画面感）", "impacts": {"维度": 数值}},
      {"id": "r${roundIndex + 2}b", "text": "选项2", "impacts": {"维度": 数值}},
      {"id": "r${roundIndex + 2}c", "text": "选项3", "impacts": {"维度": 数值}}
    ],
    "freeTextPrompt": "或者用你自己的话说说..."
  }
}`
}

function buildRoundUserPrompt(
  currentQuestion: string,
  userAnswer: string,
  history: ConversationTurn[]
): string {
  let prompt = ''

  if (history.length > 0) {
    prompt += '对话历史:\n'
    for (const turn of history) {
      prompt += `第${turn.round + 1}轮 问: ${turn.question}\n`
      prompt += `       答: ${turn.answer}\n`
    }
    prompt += '\n'
  }

  prompt += `本轮问题: ${currentQuestion}\n`
  prompt += `用户回答: ${userAnswer}\n`
  prompt += '\n请分析并返回 JSON:'

  return prompt
}

// ─── 结果解析 ───

function parseRoundResult(parsed: any, roundIndex: number, isLastRound: boolean): RoundResult {
  const result: RoundResult = {
    signals: sanitizeSignals(parsed.signals || {}),
    reflection: parsed.reflection || pickFallbackReflection(''),
    nextQuestion: null,
  }

  if (!isLastRound && parsed.nextQuestion) {
    const nq = parsed.nextQuestion
    result.nextQuestion = {
      id: `round-${roundIndex + 2}`,
      questionText: nq.questionText || '接下来聊聊？',
      systemMessage: nq.systemMessage || '继续扫描...',
      options: (nq.options || []).map((opt: any, i: number) => ({
        id: opt.id || `r${roundIndex + 2}${String.fromCharCode(97 + i)}`,
        text: opt.text || `选项${i + 1}`,
        impacts: sanitizeSignals(opt.impacts || {}),
      })),
      allowCustom: true,
      freeTextPrompt: nq.freeTextPrompt || '或者用你自己的话...',
    }
  }

  if (isLastRound) {
    const validPriorities: DimensionKey[] = ['physical', 'energy', 'career']
    result.priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'energy'
    const validDifficulties = ['easy', 'medium', 'hard', 'casual']
    result.difficulty = validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : 'medium'
  }

  return result
}

// ─── Fallback 反射文案池 — 多样化，避免重复 ───

const FALLBACK_REFLECTIONS = [
  '嗯，我记下了。',
  '明白了，接着聊。',
  '好，这个挺重要的。',
  '收到。我想多了解一些。',
  '嗯。继续往下看看。',
  '这个信息挺有用的。',
  '了解了，我们再往下聊。',
  '好的，有画面了。',
]

let lastReflectionIndex = -1
function pickFallbackReflection(_userAnswer: string): string {
  // 简单避免连续重复
  let idx = Math.floor(Math.random() * FALLBACK_REFLECTIONS.length)
  if (idx === lastReflectionIndex) idx = (idx + 1) % FALLBACK_REFLECTIONS.length
  lastReflectionIndex = idx
  return FALLBACK_REFLECTIONS[idx]
}

// ─── Fallback ───

function buildFallbackResult(
  roundIndex: number,
  totalRounds: number,
  userAnswer: string,
  isLastRound: boolean
): RoundResult {
  const signals = keywordFallback(userAnswer)
  const result: RoundResult = {
    signals,
    reflection: pickFallbackReflection(userAnswer),
    nextQuestion: null,
  }

  if (!isLastRound) {
    const fallback = FALLBACK_QUESTIONS[roundIndex] || FALLBACK_QUESTIONS[0]
    result.nextQuestion = {
      id: `round-${roundIndex + 2}`,
      questionText: fallback.questionText,
      systemMessage: fallback.systemMessage,
      options: fallback.options,
      allowCustom: true,
      freeTextPrompt: '或者用你自己的话描述...',
    }
  }

  if (isLastRound) {
    result.priority = 'energy'
    result.difficulty = 'medium'
  }

  return result
}

// ─── 备用问题池（AI 不可用时使用） ───

const FALLBACK_QUESTIONS: Array<{
  questionText: string
  systemMessage: string
  options: QuestionOption[]
}> = [
  {
    questionText: '上一次让你觉得"身体真不错"是什么时候？',
    systemMessage: '扫描物理属性...',
    options: [
      { id: 'fb1a', text: '就最近！每周都有运动', impacts: { physical: 3 } },
      { id: 'fb1b', text: '大概一两个月前', impacts: { physical: 1 } },
      { id: 'fb1c', text: '记不太清了', impacts: { physical: -1 } },
    ],
  },
  {
    questionText: '如果有人问"你最近在学什么"，你会说？',
    systemMessage: '加载技能树...',
    options: [
      { id: 'fb2a', text: '正在系统学习某个新技能', impacts: { career: 3 } },
      { id: 'fb2b', text: '零散看些感兴趣的内容', impacts: { career: 1 } },
      { id: 'fb2c', text: '最近没怎么学新东西', impacts: { career: -1 } },
    ],
  },
  {
    questionText: '你觉得自己现在的生活节奏怎么样？',
    systemMessage: '分析生活模式...',
    options: [
      { id: 'fb3a', text: '很规律，有固定的作息和习惯', impacts: { physical: 1, energy: 1 } },
      { id: 'fb3b', text: '大体规律，偶尔打乱', impacts: {} },
      { id: 'fb3c', text: '比较混乱，想改但没动力', impacts: { energy: -1 } },
    ],
  },
  {
    questionText: '心里不舒服的时候，你一般怎么处理？',
    systemMessage: '扫描社交连接...',
    options: [
      { id: 'fb4a', text: '找朋友聊聊', impacts: { social: 2 } },
      { id: 'fb4b', text: '自己消化，过两天就好了', impacts: { social: -1 } },
      { id: 'fb4c', text: '做点别的转移注意力', impacts: { energy: 1 } },
    ],
  },
  {
    questionText: '如果接下来30天只能专注一个方面，你会选？',
    systemMessage: '校准优先方向...',
    options: [
      { id: 'fb5a', text: '身体素质和运动习惯', impacts: { physical: 1 } },
      { id: 'fb5b', text: '精力管理和专注力', impacts: { energy: 1 } },
      { id: 'fb5c', text: '职业技能和工作能力', impacts: { career: 1 } },
    ],
  },
]

// ─── 工具函数 ───

function keywordFallback(text: string): Partial<Record<DimensionKey, number>> {
  const signals: Partial<Record<DimensionKey, number>> = {}
  const t = text.toLowerCase()

  if (/运动|跑步|健身|锻炼|早起|体能/.test(t)) signals.physical = 2
  if (/久坐|不动|熬夜|失眠|疲惫/.test(t)) signals.physical = -1
  if (/精力充沛|专注|冥想|状态好/.test(t)) signals.energy = 2
  if (/焦虑|累|疲|透支|崩|压力/.test(t)) signals.energy = -1
  if (/学习|进步|项目|技能|成长|规划/.test(t)) signals.career = 2
  if (/迷茫|停滞|无聊|没方向/.test(t)) signals.career = -1
  if (/朋友|聚|社交|聊天|陪伴/.test(t)) signals.social = 1
  if (/孤独|一个人|没人|社恐/.test(t)) signals.social = -1
  if (/赚|收入|存钱|理财/.test(t)) signals.finance = 1
  if (/穷|缺钱|贷款|负债/.test(t)) signals.finance = -1

  return signals
}

function sanitizeSignals(raw: any): Partial<Record<DimensionKey, number>> {
  const validKeys: DimensionKey[] = ['physical', 'energy', 'career', 'social', 'finance']
  const result: Partial<Record<DimensionKey, number>> = {}

  for (const key of validKeys) {
    if (key in raw && typeof raw[key] === 'number') {
      result[key] = Math.max(-3, Math.min(3, Math.round(raw[key])))
    }
  }

  return result
}

// ─── 旧接口保留（兼容其他模块引用） ───

export { keywordFallback as extractKeywordSignals }

export async function batchExtractSignals(
  entries: Array<{ questionId: string; freeText: string }>
): Promise<Record<string, Partial<Record<DimensionKey, number>>>> {
  const results: Record<string, Partial<Record<DimensionKey, number>>> = {}
  for (const entry of entries) {
    results[entry.questionId] = keywordFallback(entry.freeText)
  }
  return results
}
