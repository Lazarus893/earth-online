import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QuestionOption } from '../../data/questions'
import type { OnboardingResult } from '../../core/scoring'
import { computeResultFromSignals } from '../../core/scoring'
import { processRound, type DynamicQuestion, type ConversationTurn } from '../../services/onboardingAI'
import { addMemorySeed } from '../../core/memorySeeds'
import type { DimensionKey } from '../../App'
import QuestionCard from '../components/onboarding/QuestionCard'
import ProgressIndicator from '../components/onboarding/ProgressIndicator'
import ScanAnimation from '../components/onboarding/ScanAnimation'
import CardReveal from '../components/onboarding/CardReveal'
import GlitchError from '../components/onboarding/GlitchError'
import SystemMessage, { SystemMessageSequence } from '../components/ui/SystemMessage'
import { assets } from '../assets'
import { colors, easing } from '../../design-system'

/**
 * Onboarding 阶段 (系统绑定仪式)
 *
 * intro-video → binding-messages → binding-progress → error →
 * emergency → questions → scanning → card-reveal → complete
 */
type OnboardingPhase =
  | 'intro-video'
  | 'binding-messages'
  | 'binding-progress'
  | 'error'
  | 'emergency'
  | 'questions'
  | 'scanning'
  | 'card-reveal'
  | 'complete'

interface OnboardingProps {
  onComplete: (result: OnboardingResult) => void
}

const TOTAL_ROUNDS = 6

// ─── 开场问题池 — 奇迹问题变体，每次随机选一个 ───
// 核心思路：让用户想象"如果最困扰的事解决了"，从而暴露核心痛点指向
const OPENER_POOL: DynamicQuestion[] = [
  {
    id: 'round-1',
    questionText: '如果明天醒来，让你最困扰的那件事突然解决了，你的生活最大的变化会是什么？',
    systemMessage: '正在建立初始连接...',
    options: [
      { id: 'op1a', text: '终于不焦虑了，不那么累了', impacts: { energy: -2 } },
      { id: 'op1b', text: '想清楚自己要什么了', impacts: { career: -1 } },
      { id: 'op1c', text: '经济上有底气了', impacts: { finance: -2 } },
      { id: 'op1d', text: '有人懂我，关系变好了', impacts: { social: -1 } },
    ],
    allowCustom: true,
    freeTextPrompt: '或者描述那个让你最想改变的事...',
  },
  {
    id: 'round-1',
    questionText: '假设有个按钮，按一下就能解决你现在最头疼的问题——那个问题是什么？',
    systemMessage: '扫描核心诉求...',
    options: [
      { id: 'op2a', text: '每天都在透支，想恢复精力', impacts: { energy: -2, physical: -1 } },
      { id: 'op2b', text: '方向不清楚，不知道该往哪走', impacts: { career: -2 } },
      { id: 'op2c', text: '钱的问题，一直在算', impacts: { finance: -2 } },
      { id: 'op2d', text: '工作或事业上卡住了', impacts: { career: -1, energy: -1 } },
    ],
    allowCustom: true,
    freeTextPrompt: '或者直接说你最想解决的...',
  },
  {
    id: 'round-1',
    questionText: '想象一下三个月后最理想的你——跟现在最大的区别是什么？',
    systemMessage: '投射未来状态...',
    options: [
      { id: 'op3a', text: '身体状态好了，有精力做想做的事', impacts: { physical: -1, energy: -1 } },
      { id: 'op3b', text: '工作上有了突破或新方向', impacts: { career: -1 } },
      { id: 'op3c', text: '生活有节奏了，不再那么混乱', impacts: { energy: -1, physical: -1 } },
      { id: 'op3d', text: '内心平静了，不再总想太多', impacts: { energy: -2 } },
    ],
    allowCustom: true,
    freeTextPrompt: '或者描述你理想中的样子...',
  },
  {
    id: 'round-1',
    questionText: '如果此刻有个人能帮你搞定一件事，你最想让他帮什么？',
    systemMessage: '识别核心需求...',
    options: [
      { id: 'op4a', text: '帮我理清思路，想明白下一步', impacts: { career: -1 } },
      { id: 'op4b', text: '帮我安排好作息，恢复精力', impacts: { energy: -1, physical: -1 } },
      { id: 'op4c', text: '帮我解决眼前的经济压力', impacts: { finance: -2 } },
      { id: 'op4d', text: '帮我推一把，做那件一直拖着的事', impacts: { career: -1, energy: -1 } },
    ],
    allowCustom: true,
    freeTextPrompt: '或者说说你最想要什么帮助...',
  },
]

function pickRandomOpener(): DynamicQuestion {
  return OPENER_POOL[Math.floor(Math.random() * OPENER_POOL.length)]
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<OnboardingPhase>('intro-video')

  // ─── 动态问答状态 ───
  const [currentRound, setCurrentRound] = useState(0)
  const [dynamicQuestion, setDynamicQuestion] = useState<DynamicQuestion>(pickRandomOpener)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [accumulatedSignals, setAccumulatedSignals] = useState<Record<string, number>>({})
  const [roundLoading, setRoundLoading] = useState(false)
  const [aiReflection, setAiReflection] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null)

  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [bindingPct, setBindingPct] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // ═══ Phase: intro-video ═══
  useEffect(() => {
    if (phase !== 'intro-video') return
    const checkPlaying = setTimeout(() => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) {
        setPhase('binding-messages')
      }
    }, 2000)
    return () => clearTimeout(checkPlaying)
  }, [phase])

  const handleVideoEnd = useCallback(() => {
    setPhase('binding-messages')
  }, [])

  // ═══ Phase: binding-progress ═══
  useEffect(() => {
    if (phase !== 'binding-progress') return
    let pct = 0
    const interval = setInterval(() => {
      if (pct < 87) pct += 3.2
      else if (pct < 92) pct += 0.8
      else if (pct < 99.5) pct += 0.3
      else {
        clearInterval(interval)
        pct = 99.7
        setBindingPct(pct)
        setTimeout(() => setPhase('error'), 600)
        return
      }
      setBindingPct(Math.min(pct, 99.7))
    }, 80)
    return () => clearInterval(interval)
  }, [phase])

  // ═══ Handlers ═══
  const handleBindingMessagesComplete = useCallback(() => {
    setPhase('binding-progress')
  }, [])

  const handleErrorComplete = useCallback(() => {
    setPhase('emergency')
  }, [])

  const handleEmergencyComplete = useCallback(() => {
    setPhase('questions')
  }, [])

  // ─── 用户回答处理（选项 or 自由文本统一走这里） ───
  const handleAnswer = useCallback(async (answerText: string, option?: QuestionOption) => {
    if (roundLoading) return

    // 视觉反馈
    if (option) setSelectedOption(option)

    // 短暂延迟后开始 AI 处理（保持 loading 直到下一题准备好）
    await new Promise(r => setTimeout(r, 400))
    setRoundLoading(true)
    setAiReflection(null)

    // 保存记忆种子
    addMemorySeed({
      questionId: dynamicQuestion.id,
      rawText: answerText,
      extractedSignals: option?.impacts || {},
      createdAt: Date.now(),
    })

    // 调用 AI 处理本轮
    const roundResult = await processRound({
      roundIndex: currentRound,
      totalRounds: TOTAL_ROUNDS,
      currentQuestion: dynamicQuestion.questionText,
      userAnswer: answerText,
      history: conversationHistory,
    })

    // 更新对话历史
    const newHistory: ConversationTurn[] = [
      ...conversationHistory,
      { round: currentRound, question: dynamicQuestion.questionText, answer: answerText },
    ]
    setConversationHistory(newHistory)

    // 累加维度信号
    const newSignals = { ...accumulatedSignals }
    for (const [dim, val] of Object.entries(roundResult.signals)) {
      newSignals[dim] = (newSignals[dim] || 0) + (val || 0)
    }
    setAccumulatedSignals(newSignals)

    // 显示即时反射（仍在 loading 状态中显示，不会露出旧卡片）
    setAiReflection(roundResult.reflection)

    // 等待用户阅读反射
    await new Promise(r => setTimeout(r, 1800))

    // 判断是否最后一轮
    if (currentRound >= TOTAL_ROUNDS - 1 || !roundResult.nextQuestion) {
      // 最后一轮 → 进入 scanning
      setRoundLoading(false)
      setPhase('scanning')
      setTimeout(() => {
        const priority = roundResult.priority || 'energy'
        const difficulty = roundResult.difficulty || 'medium'
        const computedResult = computeResultFromSignals(
          newSignals as Partial<Record<DimensionKey, number>>,
          priority,
          difficulty
        )
        setResult(computedResult)
        setPhase('card-reveal')
      }, 2500)
    } else {
      // 先更新下一题数据，再关闭 loading（原子切换，不会闪回旧卡片）
      setDynamicQuestion(roundResult.nextQuestion)
      setCurrentRound(prev => prev + 1)
      setSelectedOption(null)
      setAiReflection(null)
      setRoundLoading(false)
    }
  }, [roundLoading, dynamicQuestion, currentRound, conversationHistory, accumulatedSignals])

  const handleSelect = useCallback((option: QuestionOption) => {
    handleAnswer(option.text, option)
  }, [handleAnswer])

  const handleFreeText = useCallback((_questionId: string, text: string) => {
    handleAnswer(text)
  }, [handleAnswer])

  const handleStepClick = useCallback((_index: number) => {
    // 动态模式下不支持跳回之前的题
  }, [])

  const handleCardRevealComplete = useCallback(() => {
    setPhase('complete')
    setTimeout(() => {
      if (result) onComplete(result)
    }, 2500)
  }, [result, onComplete])

  return (
    <motion.div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#030712' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 背景层 */}
      <div className="absolute inset-0">
        <img
          src={assets.onboarding.bindingBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(6,182,212,0.06), transparent 60%), linear-gradient(180deg, rgba(3,7,18,0.4), rgba(3,7,18,0.9))',
          }}
        />
      </div>

      {/* HUD 几何装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-6 left-6 w-14 h-14">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#06B6D4]/15" />
          <div className="absolute top-0 left-0 w-[1px] h-full bg-[#06B6D4]/15" />
        </div>
        <div className="absolute bottom-6 right-6 w-14 h-14">
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-[#06B6D4]/15" />
          <div className="absolute bottom-0 right-0 w-[1px] h-full bg-[#06B6D4]/15" />
        </div>
      </div>

      {/* 内容区 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-10 gap-6 max-w-2xl w-full">

        {/* 问卷进度条 */}
        {phase === 'questions' && (
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: easing.smooth }}
          >
            <ProgressIndicator
              total={TOTAL_ROUNDS}
              current={currentRound}
              onStepClick={handleStepClick}
            />
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ═══ INTRO VIDEO ═══ */}
          {phase === 'intro-video' && (
            <motion.div
              key="intro-video"
              className="fixed inset-0 z-50 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src={assets.onboarding.bindingIntro}
                autoPlay
                playsInline
                preload="auto"
                onEnded={handleVideoEnd}
                onError={() => setPhase('binding-messages')}
                onStalled={() => setPhase('binding-messages')}
                onLoadedData={(e) => {
                  const video = e.currentTarget
                  video.play().catch(() => {
                    video.muted = true
                    video.play().catch(() => setPhase('binding-messages'))
                  })
                }}
              />
            </motion.div>
          )}

          {/* ═══ BINDING MESSAGES ═══ */}
          {phase === 'binding-messages' && (
            <motion.div
              key="binding-messages"
              className="flex flex-col items-center gap-6 text-center w-full max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easing.smooth }}
              >
                <h1 className="text-4xl font-black tracking-tighter text-white/90">
                  ORACLE OS
                </h1>
                <motion.div
                  className="mt-1 text-[10px] font-mono tracking-[0.25em] text-white/30 uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  Operational Resource &amp; Awakening Command Layer Engine
                </motion.div>
                <motion.div
                  className="mt-2 h-[2px] w-16 mx-auto"
                  style={{ background: colors.patch }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                />
              </motion.div>

              <SystemMessageSequence
                messages={[
                  { text: '检测到新灵魂波动，正在建立 Oracle 链接...', speed: 30, pauseAfter: 800 },
                  { text: '宿主已被选中。你的存在并非偶然——系统已等待你很久。', speed: 28, pauseAfter: 1000 },
                  { text: '正在初始化 Oracle OS 绑定协议...', speed: 35, pauseAfter: 500 },
                ]}
                onAllComplete={handleBindingMessagesComplete}
              />
            </motion.div>
          )}

          {/* ═══ BINDING PROGRESS ═══ */}
          {phase === 'binding-progress' && (
            <motion.div
              key="binding-progress"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SystemMessage text="系统绑定进行中..." type="system" instant />
              <div className="binding-progress">
                <div className="binding-progress__fill" style={{ width: `${bindingPct}%` }} />
                <div className="binding-progress__label">{bindingPct.toFixed(1)}%</div>
              </div>
              <motion.div
                className="text-[10px] font-mono text-gray-500 tracking-wider"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ESTABLISHING NEURAL LINK...
              </motion.div>
            </motion.div>
          )}

          {/* ═══ ERROR GLITCH ═══ */}
          {phase === 'error' && (
            <motion.div
              key="error"
              className="fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlitchError show={true} onComplete={handleErrorComplete} />
            </motion.div>
          )}

          {/* ═══ EMERGENCY PROTOCOL ═══ */}
          {phase === 'emergency' && (
            <motion.div
              key="emergency"
              className="flex flex-col items-center gap-4 w-full max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SystemMessageSequence
                messages={[
                  { text: '链路信号中断，标准绑定失败。', type: 'warning', speed: 30, pauseAfter: 1000 },
                  { text: '检测到异常，正在启动应急预案...', speed: 32, pauseAfter: 1200 },
                  { text: '应急预案启动成功。Oracle 接管绑定流程。', speed: 28, pauseAfter: 800 },
                  { text: '开启手动模式：你需要证明你已做好觉醒的准备。', speed: 30, pauseAfter: 600 },
                  { text: '回答以下问题，Oracle 将为你校准初始使命坐标。', speed: 25, pauseAfter: 400 },
                  { text: '注意：没有标准答案。只有属于你的答案。', speed: 25, pauseAfter: 300 },
                ]}
                onAllComplete={handleEmergencyComplete}
              />
            </motion.div>
          )}

          {/* ═══ QUESTIONS (动态 AI 驱动) ═══ */}
          {phase === 'questions' && (
            <motion.div
              key={`q-wrapper-${currentRound}`}
              className="flex flex-col items-center gap-4 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* AI 思考中 / 反射展示 — 作为一个整体过渡态 */}
              {roundLoading && (
                <motion.div
                  className="flex flex-col items-center gap-4 py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* 反射文字（AI 返回后显示） */}
                  {aiReflection ? (
                    <motion.div
                      className="text-[13px] text-white/60 italic text-center max-w-sm leading-relaxed"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      "{aiReflection}"
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        className="w-3 h-3 rounded-full"
                        style={{ background: colors.patch }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span className="text-[10px] font-mono text-white/30 tracking-wider">
                        ORACLE PROCESSING...
                      </span>
                    </>
                  )}
                </motion.div>
              )}

              {/* 当前问题卡片 — 只在 loading 结束后显示 */}
              {!roundLoading && (
                <motion.div
                  className="w-full flex flex-col items-center gap-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: easing.smooth }}
                >
                  <SystemMessage
                    text={dynamicQuestion.systemMessage}
                    type="system"
                    speed={25}
                    instant
                    className="mb-2"
                  />
                  <QuestionCard
                    key={`q-${currentRound}`}
                    question={{
                      id: dynamicQuestion.id,
                      phase: currentRound < 1 ? 'opening' : currentRound < 4 ? 'core' : 'calibration',
                      systemMessage: dynamicQuestion.systemMessage,
                      questionText: dynamicQuestion.questionText,
                      options: dynamicQuestion.options,
                      allowCustom: dynamicQuestion.allowCustom,
                      freeTextPrompt: dynamicQuestion.freeTextPrompt,
                    }}
                    questionIndex={currentRound}
                    selectedOption={selectedOption}
                    onSelect={handleSelect}
                    onFreeText={handleFreeText}
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ SCANNING ═══ */}
          {phase === 'scanning' && (
            <motion.div
              key="scanning"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SystemMessage text="宿主数据采集完成，正在分析..." type="system" speed={30} />
              <video
                className="w-64 h-64 object-cover rounded-sm opacity-80"
                src={assets.onboarding.scan}
                autoPlay playsInline
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <ScanAnimation phase="scanning" />
            </motion.div>
          )}

          {/* ═══ CARD REVEAL ═══ */}
          {phase === 'card-reveal' && result && (
            <motion.div
              key="card-reveal"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <SystemMessage text="属性扫描完成。正在生成宿主能力图谱..." type="reward" speed={28} />
              <CardReveal result={result} onComplete={handleCardRevealComplete} />
            </motion.div>
          )}

          {/* ═══ COMPLETE ═══ */}
          {phase === 'complete' && (
            <motion.div
              key="complete"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: easing.smooth }}
            >
              <SystemMessageSequence
                messages={[
                  { text: 'Oracle OS 绑定完成。', type: 'reward', speed: 25, pauseAfter: 600 },
                  { text: `宿主已觉醒。使命等级：LV.1 —— 你的蜕变从此刻开始。`, type: 'reward', speed: 22, pauseAfter: 400 },
                  { text: '正在初始化主控面板...', speed: 30, pauseAfter: 300 },
                ]}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
