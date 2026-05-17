import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUESTIONS } from '../../data/questions'
import type { QuestionOption } from '../../data/questions'
import type { OnboardingResult } from '../../core/scoring'
import { computeOnboardingResult } from '../../core/scoring'
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
  | 'intro-video'       // VD-BIND 视频播放
  | 'binding-messages'  // 系统绑定消息序列
  | 'binding-progress'  // 绑定进度条 (将在 99.7% 失败)
  | 'error'            // GlitchError 动画
  | 'emergency'        // 应急预案消息
  | 'questions'        // 问卷
  | 'scanning'         // VD-SCAN / 计算动画
  | 'card-reveal'      // 卡片揭晓
  | 'complete'         // 绑定完成

interface OnboardingProps {
  onComplete: (result: OnboardingResult) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<OnboardingPhase>('intro-video')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(QuestionOption | null)[]>(
    Array(QUESTIONS.length).fill(null)
  )
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
  // 模拟进度条：快速到 87%，慢到 92%，极慢到 99.7%，然后失败
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
        // 在 99.7% 触发 ERROR
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

  const handleSelect = useCallback((option: QuestionOption) => {
    setSelectedOption(option)
    const newAnswers = [...answers]
    newAnswers[currentQ] = option
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1)
        setSelectedOption(null)
      } else {
        setPhase('scanning')
        setTimeout(() => {
          const validAnswers = newAnswers.filter(Boolean) as QuestionOption[]
          const computedResult = computeOnboardingResult(validAnswers)
          setResult(computedResult)
          setPhase('card-reveal')
        }, 2500)
      }
    }, 500)
  }, [currentQ, answers])

  const handleStepClick = useCallback((index: number) => {
    setCurrentQ(index)
    setSelectedOption(answers[index])
  }, [answers])

  const handleCardRevealComplete = useCallback(() => {
    setPhase('complete')
    // 短暂显示完成消息后触发主流程
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
      {/* 背景层 — 使用 IMG-BIND-BG 深空数据流 */}
      <div className="absolute inset-0">
        <img
          src={assets.onboarding.bindingBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        {/* 暗色遮罩 */}
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
              total={QUESTIONS.length}
              current={currentQ}
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
                  // 先尝试带声音播放，浏览器阻止则 muted 重试
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
              {/* EARTH ONLINE 标题 */}
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

              {/* 系统消息序列 */}
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
              <SystemMessage
                text="系统绑定进行中..."
                type="system"
                instant
              />

              {/* 进度条 */}
              <div className="binding-progress">
                <div
                  className="binding-progress__fill"
                  style={{ width: `${bindingPct}%` }}
                />
                <div className="binding-progress__label">
                  {bindingPct.toFixed(1)}%
                </div>
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
              <GlitchError
                show={true}
                onComplete={handleErrorComplete}
              />
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

          {/* ═══ QUESTIONS ═══ */}
          {phase === 'questions' && (
            <motion.div
              key={`q-wrapper-${currentQ}`}
              className="flex flex-col items-center gap-4 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 当前题目的系统提示 */}
              <SystemMessage
                text={QUESTIONS[currentQ].systemMessage}
                type="system"
                speed={25}
                instant
                className="mb-2"
              />
              <QuestionCard
                key={`q-${currentQ}`}
                question={QUESTIONS[currentQ]}
                questionIndex={currentQ}
                selectedOption={selectedOption}
                onSelect={handleSelect}
              />
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
              <SystemMessage
                text="宿主数据采集完成，正在分析..."
                type="system"
                speed={30}
              />
              {/* 尝试播放 VD-SCAN，失败则用 ScanAnimation */}
              <video
                className="w-64 h-64 object-cover rounded-sm opacity-80"
                src={assets.onboarding.scan}
                autoPlay
                playsInline
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
              <SystemMessage
                text="属性扫描完成。正在生成宿主能力图谱..."
                type="reward"
                speed={28}
              />
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
