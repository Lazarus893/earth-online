/**
 * Demo Script — 时间轴定义
 *
 * 定义 demo 模式的完整流程和预设对话内容
 */

export interface DemoStep {
  id: string
  phase: 'onboarding' | 'plan-selection' | 'dashboard' | 'chat' | 'quest-complete'
  action: 'wait' | 'select-option' | 'select-plan' | 'open-chat' | 'close-chat' | 'chat-message' | 'replace-quest' | 'complete-quest' | 'show-notification'
  /** 等待时间 (ms) — 在执行此步骤前等待 */
  delay: number
  /** 动作参数 */
  payload?: unknown
  /** 调试描述 */
  description?: string
}

interface ChatPayload {
  role: 'user' | 'system'
  content: string
  typeSpeed?: number
}

interface SelectOptionPayload {
  questionIndex: number
  optionIndex: number
}

interface ReplaceQuestPayload {
  oldText: string
  newText: string
  newExp: number
}

// ─── 预设答案（模拟一个刚转行、想发展职业的用户）───
export const DEMO_ANSWERS: SelectOptionPayload[] = [
  { questionIndex: 0, optionIndex: 1 }, // Q1: B - 赖床挣扎起来
  { questionIndex: 1, optionIndex: 2 }, // Q2: C - 记不太清
  { questionIndex: 2, optionIndex: 3 }, // Q3: D - 最近没怎么学新东西
  { questionIndex: 3, optionIndex: 2 }, // Q4: C - 比较混乱
  { questionIndex: 4, optionIndex: 2 }, // Q5: C - 职业技能
  { questionIndex: 5, optionIndex: 0 }, // Q6: A - 稳步推进
]

// ─── 预设 AI 对话脚本 ───
export const DEMO_CHAT_SCRIPT: ChatPayload[] = [
  {
    role: 'user',
    content: '这个"阅读30页"的任务...我刚转行做这个方向，推荐的那些论文和书完全看不懂，全是术语，看了两页就放弃了。感觉自己好笨',
    typeSpeed: 45,
  },
  {
    role: 'system',
    content: '等等，"笨"这个词先收回去。\n\n你两天前才进这个领域，那些论文是写给在这行泡了五六年的人看的。看不懂才对，看懂了才奇怪。',
    typeSpeed: 28,
  },
  {
    role: 'system',
    content: '任务调整一下：\n\n× 阅读30页专业文献 ← 不适合现在的你\n✓ 看一个10分钟入门科普视频 (+10EXP)\n\n先把"这东西大概在讲什么"搞清楚，术语的事以后再说。',
    typeSpeed: 25,
  },
  {
    role: 'user',
    content: '但是看视频会不会太水了...别人都在啃论文',
    typeSpeed: 50,
  },
  {
    role: 'system',
    content: '别人啃论文是因为他们三年前就看过入门视频了。你没看到他们的第一步而已。\n\n本系统已为你搜索到以下入门资源和工具：\n\n```resources\n[{"title":"3Blue1Brown - 线性代数的本质","description":"可视化讲解，零门槛，15分钟建立数学直觉","url":"https://www.bilibili.com/video/BV1ys411472E","icon":"🎬","tag":"视频·入门","guide":"从第1集开始看，每天一集，看完动手画一遍向量加法"},{"title":"ML-For-Beginners","description":"微软官方机器学习入门课，中文友好，配套代码练习","url":"https://github.com/microsoft/ML-For-Beginners","icon":"⭐","tag":"GitHub·69k stars","guide":"先 fork 到自己仓库，从 lesson 1 开始跟着跑代码"},{"title":"learning-path","description":"AI学习路径规划技能，根据当前水平自动推荐下一步内容和练习","url":"https://skillhub.cn/skills/learning-path","icon":"🧩","tag":"Skill·SkillHub","guide":"安装后输入你当前的困惑，它会帮你拆解成每日小任务"},{"title":"Crash Course CS","description":"计算机科学速成课，每集10分钟，轻松有趣","url":"https://www.bilibili.com/video/BV1EW411u7th","icon":"💻","tag":"视频·系列","guide":"当作背景知识补充，通勤时听也行"}]\n```\n\n从第一个视频开始就好。看完回来聊。',
    typeSpeed: 22,
  },
]

// ─── 固定 Quest 列表（demo 模式使用）───
export const DEMO_QUESTS = [
  { text: '阅读30页', dimension: 'career' as const, exp: 15, priority: 'medium' as const },
  { text: '完成技术日报', dimension: 'career' as const, exp: 24, priority: 'high' as const },
  { text: '冥想10分钟', dimension: 'energy' as const, exp: 10, priority: 'medium' as const },
  { text: '拉伸15分钟', dimension: 'physical' as const, exp: 8, priority: 'low' as const },
  { text: '完成3个番茄钟', dimension: 'energy' as const, exp: 15, priority: 'medium' as const },
]

/** Demo 模式完整 Quest 对象（带 id + done 状态） */
export interface DemoQuest {
  id: string
  text: string
  dimension: 'physical' | 'energy' | 'career' | 'social' | 'finance'
  exp: number
  done: boolean
  priority: 'high' | 'medium' | 'low'
}

export const DEMO_QUESTS_FULL: DemoQuest[] = [
  { id: 'demo-q-0', text: '阅读30页', dimension: 'career', exp: 15, done: false, priority: 'medium' },
  { id: 'demo-q-1', text: '完成技术日报', dimension: 'career', exp: 24, done: false, priority: 'high' },
  { id: 'demo-q-2', text: '冥想10分钟', dimension: 'energy', exp: 10, done: false, priority: 'medium' },
  { id: 'demo-q-3', text: '拉伸15分钟', dimension: 'physical', exp: 8, done: false, priority: 'low' },
  { id: 'demo-q-4', text: '完成3个番茄钟', dimension: 'energy', exp: 15, done: false, priority: 'medium' },
]

// ─── 完整时间轴脚本 ───
export function buildDemoScript(): DemoStep[] {
  const steps: DemoStep[] = []

  // ═══ Phase 1: Onboarding — 等系统消息自动播完后选题 ═══
  for (let i = 0; i < DEMO_ANSWERS.length; i++) {
    steps.push({
      id: `onboarding-q${i}`,
      phase: 'onboarding',
      action: 'select-option',
      delay: i === 0 ? 1200 : 1800, // 给每题更多展示时间
      payload: DEMO_ANSWERS[i],
      description: `选择第${i + 1}题 选项${DEMO_ANSWERS[i].optionIndex + 1}`,
    })
  }

  // ═══ Phase 2: Plan Selection ═══
  steps.push({
    id: 'plan-select',
    phase: 'plan-selection',
    action: 'select-plan',
    delay: 18000, // 等 context-reading 阶段播完（约15s）+ 方案展示
    payload: { schemeIndex: 1 },
    description: '选择第2个方案（优势突破）',
  })

  // ═══ Phase 3: Dashboard — 展示低迷状态 ═══
  steps.push({
    id: 'dashboard-enter',
    phase: 'dashboard',
    action: 'wait',
    delay: 3000, // 等 Dashboard 入场动画完成
    description: '等待 Dashboard 动画序列完成',
  })

  // 展示 HP 警告通知（状态低迷）
  steps.push({
    id: 'status-warning',
    phase: 'dashboard',
    action: 'show-notification',
    delay: 1500,
    payload: {
      message: '[系统] ⚠ 检测到宿主多项维度处于低迷状态',
      sub: '职业 LV.1 · 精力不足 · 建议立即执行恢复任务',
      type: 'warning',
    },
    description: '显示状态低迷警告',
  })

  // 等一下让用户看到警告
  steps.push({
    id: 'warning-pause',
    phase: 'dashboard',
    action: 'wait',
    delay: 3000,
    description: '停留展示警告',
  })

  // Oracle 主动推送消息 → chat badge 亮起
  steps.push({
    id: 'oracle-nudge',
    phase: 'dashboard',
    action: 'show-notification',
    delay: 500,
    payload: {
      message: '[系统] 叮！本系统已为你生成紧急恢复方案',
      sub: '点击终端查看详情 →',
      type: 'info',
    },
    description: 'Oracle 推送紧急方案通知',
  })

  // 打开 Chat（先亮 badge，再点击）
  steps.push({
    id: 'open-chat',
    phase: 'dashboard',
    action: 'open-chat',
    delay: 2000,
    description: '打开 Chat 面板',
  })

  // ═══ Phase 4: Chat 对话 ═══
  for (let i = 0; i < DEMO_CHAT_SCRIPT.length; i++) {
    const msg = DEMO_CHAT_SCRIPT[i]
    steps.push({
      id: `chat-msg-${i}`,
      phase: 'chat',
      action: 'chat-message',
      delay: i === 0 ? 2000 : 3000, // 每条消息间隔更长，让人看完
      payload: msg,
      description: `${msg.role}: ${msg.content.slice(0, 30)}...`,
    })
  }

  // Quest 替换
  steps.push({
    id: 'replace-quest',
    phase: 'chat',
    action: 'replace-quest',
    delay: 500,
    payload: {
      oldText: '阅读30页',
      newText: '看一个10分钟入门科普视频',
      newExp: 10,
    } as ReplaceQuestPayload,
    description: '将「阅读30页」替换为「看入门视频」',
  })

  // ═══ Phase 5: 关闭 Chat + 完成任务 ═══
  steps.push({
    id: 'close-chat',
    phase: 'chat',
    action: 'close-chat',
    delay: 3000,
    description: '关闭 Chat 面板',
  })

  steps.push({
    id: 'complete-quest',
    phase: 'quest-complete',
    action: 'complete-quest',
    delay: 2500,
    payload: { questText: '看一个10分钟入门科普视频' },
    description: '自动完成降级后的任务',
  })

  // 最后等待升级动画
  steps.push({
    id: 'demo-end',
    phase: 'quest-complete',
    action: 'wait',
    delay: 5000,
    description: '等待升级特效，展示最终状态',
  })

  return steps
}
