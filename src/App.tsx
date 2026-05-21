import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './display/pages/Dashboard'
import DimensionDetail from './display/pages/DimensionDetail'
import Onboarding from './display/pages/Onboarding'
import PlanSelection from './display/pages/PlanSelection'
import Transition from './display/components/Transition'
import ExitTransition from './display/components/ExitTransition'
import LevelUpEffect from './display/components/LevelUpEffect'
import UnlockReveal from './display/components/UnlockReveal'
import NotificationBanner from './display/components/NotificationBanner'
import HpWarningEffect from './display/components/HpWarningEffect'
import ChatPanel from './display/components/ChatPanel'
import AudioToggle from './display/components/ui/AudioToggle'
import { useGameState } from './hooks/useGameState'
import { useAnimationQueue } from './hooks/useAnimationQueue'
import { useChatSystem } from './hooks/useChatSystem'
import { useAudioSystem } from './hooks/useAudioSystem'
import { useWorldPatch } from './hooks/useWorldPatch'
import { useSceneContext } from './hooks/useSceneContext'
import { useProactiveCheckin } from './hooks/useProactiveCheckin'
import { getPatchModifiers } from './services/worldPatch'
import { getDailyJournal } from './services/journalGenerator'
import { loadSelectedScheme } from './core/hierarchy'
import { assets } from './display/assets'
import type { OnboardingResult } from './core/scoring'

export type DimensionKey = 'physical' | 'energy' | 'career' | 'social' | 'finance'

export interface DimensionData {
  key: DimensionKey
  label: string
  labelEn: string
  icon: string
  color: string
  level: number
  exp: number
  expMax: number
  score: number
  locked: boolean
}

type AppView = 'onboarding' | 'plan-selection' | 'dashboard' | 'dimension'

// ─── 数据版本控制：清理旧数据，确保干净开始 ───
const DATA_VERSION = 'v7'
if (localStorage.getItem('earth-online-data-version') !== DATA_VERSION) {
  localStorage.removeItem('earth-online-game-state')
  localStorage.removeItem('earth-online-onboarding-done')
  localStorage.removeItem('earth-online-scores')
  localStorage.removeItem('earth-online-chat-history')
  localStorage.removeItem('earth-online-beginner-done')
  localStorage.removeItem('earth-online-difficulty')
  localStorage.removeItem('earth-online-priority')
  localStorage.removeItem('earth-online-selected-scheme')
  localStorage.setItem('earth-online-data-version', DATA_VERSION)
}

function getInitialView(onboardingDone: boolean): AppView {
  if (!onboardingDone) return 'onboarding'
  const scheme = loadSelectedScheme()
  if (!scheme) return 'plan-selection'
  return 'dashboard'
}

function App() {
  // World Patch — 提升到 App 层以供 game state 和 Dashboard 共享
  const { patch, loading: patchLoading } = useWorldPatch()
  const patchMods = patch ? getPatchModifiers(patch) : undefined

  const game = useGameState(patchMods)

  // Audio system — BGM 管理
  const audio = useAudioSystem(assets.audio.bgm)

  // 统一动画队列 — 所有全屏动画按优先级顺序播放
  const animQueue = useAnimationQueue()

  const [currentView, setCurrentView] = useState<AppView>(
    getInitialView(game.onboardingDone)
  )
  const [selectedDimension, setSelectedDimension] = useState<DimensionKey | null>(null)
  const [beginnerQuestShown, setBeginnerQuestShown] = useState(
    () => !!localStorage.getItem('earth-online-beginner-done')
  )
  const [chatOpen, setChatOpen] = useState(false)
  const [journalLoading, setJournalLoading] = useState(false)
  // 转场动画状态
  const [showEnterTransition, setShowEnterTransition] = useState(false)
  const [showExitTransition, setShowExitTransition] = useState(false)
  const pendingDimensionRef = useRef<DimensionKey | null>(null)

  // Scene context — 场景感知，供 chat 系统使用
  const sceneContext = useSceneContext(currentView, selectedDimension)

  // Chat system
  const chat = useChatSystem({
    dimensions: game.dimensions,
    quests: game.quests,
    streak: game.streak,
    playerLevel: game.playerLevel,
    scene: sceneContext,
  })

  // Proactive check-in — 检测阈值触发 Oracle 主动关心
  const checkin = useProactiveCheckin(
    game.dimensions,
    game.quests,
    game.streak,
    game.onboardingDone
  )

  // ─── 辅助：入队通知 ───
  const enqueueNotification = useCallback((msg: { message: string; sub?: string; type: 'info' | 'success' | 'warning' }) => {
    animQueue.enqueue({
      type: 'notification',
      payload: msg,
    })
  }, [animQueue])

  // ─── 监听 game events → 入队动画 ───
  const lastEventRef = useRef<string | null>(null)
  useEffect(() => {
    const event = game.currentEvent
    if (!event) return
    const eventKey = `${event.type}-${event.dimensionKey}-${event.newLevel}`
    if (lastEventRef.current === eventKey) return
    lastEventRef.current = eventKey

    if (event.type === 'level-up') {
      animQueue.enqueue({ type: 'level-up', payload: event })
    } else if (event.type === 'unlock') {
      animQueue.enqueue({ type: 'unlock', payload: event })
    }
    game.consumeEvent()
  }, [game.currentEvent])

  // ─── 监听 proactive check-in → 入队通知 ───
  useEffect(() => {
    if (checkin.pendingCheckin && currentView === 'dashboard') {
      animQueue.enqueue({
        type: 'checkin',
        payload: checkin.pendingCheckin,
      })
    }
  }, [checkin.pendingCheckin, currentView])

  // Global Cmd+K shortcut to toggle chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setChatOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── AI 日志生成（新一天时从 hierarchy 中智能选择条目） ───
  const journalGenRef = useRef(false)
  useEffect(() => {
    if (currentView !== 'dashboard' || journalGenRef.current) return
    if (!game.onboardingDone) return

    // 检查是否需要生成（quests 为空或日期过期由 useGameState 内部处理，
    // 这里只负责尝试用 AI 替换随机生成的 fallback）
    journalGenRef.current = true
    setJournalLoading(true)

    getDailyJournal(game.dimensions).then(entries => {
      if (entries.length > 0) {
        // 将 JournalEntry 转为 Quest 兼容格式
        const quests = entries.map(e => ({
          ...e,
          done: e.logged,
        }))
        game.replaceQuests(quests)
      }
    }).catch(() => {
      // AI 失败 — 保持 useGameState 内部生成的 fallback quests
    }).finally(() => {
      setJournalLoading(false)
    })
  }, [currentView, game.onboardingDone])

  // Onboarding 完成
  const handleOnboardingComplete = useCallback((result: OnboardingResult) => {
    game.completeOnboarding(result.scores)
    localStorage.setItem('earth-online-difficulty', result.difficulty)
    localStorage.setItem('earth-online-priority', result.priority)
    setCurrentView('plan-selection')
  }, [game])

  // Plan selection 完成
  const handlePlanSelectionComplete = useCallback(() => {
    setCurrentView('dashboard')

    // 触发新手引导任务 (首次打卡奖励)
    if (!beginnerQuestShown) {
      setTimeout(() => {
        enqueueNotification({
          message: '[系统] 宿主，你终于来了。系统已等候多时。',
          sub: '完成任意操作即可领取觉醒奖励 +50 EXP',
          type: 'info',
        })
        setTimeout(() => {
          game.dimensions.filter(d => !d.locked).forEach(dim => {
            game.addExp(dim.key, 50)
          })
          localStorage.setItem('earth-online-beginner-done', 'true')
          setBeginnerQuestShown(true)
          enqueueNotification({
            message: '[系统] 恭喜宿主完成初次觉醒！',
            sub: '全维度 +50 EXP',
            type: 'success',
          })
        }, 5000)
      }, 2000)
    }
  }, [game, beginnerQuestShown, enqueueNotification])

  // 维度点击 → 播放 VD01 入场转场动画
  const handleDimensionClick = (key: DimensionKey) => {
    const dim = game.dimensions.find(d => d.key === key)
    if (dim?.locked) return
    pendingDimensionRef.current = key
    setShowEnterTransition(true)
  }

  // VD01 入场转场完成 → 切换到维度详情
  const handleEnterTransitionComplete = () => {
    setSelectedDimension(pendingDimensionRef.current)
    setCurrentView('dimension')
    setShowEnterTransition(false)
  }

  // 维度返回 → 播放 VD12 出场转场动画
  const handleDimensionBack = () => {
    setShowExitTransition(true)
  }

  // VD12 出场转场完成 → 回到仪表盘
  const handleExitTransitionComplete = () => {
    setShowExitTransition(false)
    setCurrentView('dashboard')
    setSelectedDimension(null)
  }

  // 任务完成
  const handleQuestComplete = useCallback((questId: string) => {
    const quest = game.quests.find(q => q.id === questId)
    if (!quest || quest.done) return
    game.completeQuest(questId)
    enqueueNotification({
      message: `[系统] 完成「${quest.text}」`,
      sub: `+${quest.exp} EXP → ${quest.dimension.toUpperCase()}`,
      type: 'success',
    })
  }, [game, enqueueNotification])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Onboarding */}
        {currentView === 'onboarding' && (
          <Onboarding
            key="onboarding"
            onComplete={handleOnboardingComplete}
          />
        )}

        {/* Plan Selection */}
        {currentView === 'plan-selection' && (
          <PlanSelection
            key="plan-selection"
            dimensions={game.dimensions}
            onComplete={handlePlanSelectionComplete}
          />
        )}

        {/* 主面板 */}
        {currentView === 'dashboard' && (
          <Dashboard
            key="dashboard"
            dimensions={game.dimensions}
            quests={game.quests}
            playerLevel={game.playerLevel}
            playerExp={game.playerExp}
            playerExpMax={game.playerExpMax}
            streak={game.streak}
            patch={patch}
            patchLoading={patchLoading}
            journalLoading={journalLoading}
            onDimensionClick={handleDimensionClick}
            onQuestComplete={handleQuestComplete}
          />
        )}

        {/* 维度详情页 — 简单淡入淡出 */}
        {currentView === 'dimension' && selectedDimension && (
          <motion.div
            key="dimension-detail"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DimensionDetail
              dimension={game.dimensions.find(d => d.key === selectedDimension)!}
              allDimensions={game.dimensions}
              onBack={handleDimensionBack}
              onAddExp={(dimKey, amount) => game.addExp(dimKey, amount)}
              onInjectChat={chat.injectMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── VD01 GTA5风格入场转场 ─── */}
      <AnimatePresence>
        {showEnterTransition && pendingDimensionRef.current && (
          <Transition
            key="enter-transition"
            dimension={pendingDimensionRef.current}
            onComplete={handleEnterTransitionComplete}
          />
        )}
      </AnimatePresence>

      {/* ─── VD12 出场转场 ─── */}
      <AnimatePresence>
        {showExitTransition && (
          <ExitTransition
            key="exit-transition"
            onComplete={handleExitTransitionComplete}
          />
        )}
      </AnimatePresence>

      {/* ─── 统一动画队列层（一次只播一个） ─── */}
      <LevelUpEffect
        show={animQueue.currentEvent?.type === 'level-up'}
        newLevel={animQueue.currentEvent?.type === 'level-up' ? animQueue.currentEvent.payload.newLevel : 0}
        dimensionColor={animQueue.currentEvent?.type === 'level-up' ? animQueue.currentEvent.payload.dimensionColor : undefined}
        onComplete={animQueue.dequeue}
      />

      <UnlockReveal
        show={animQueue.currentEvent?.type === 'unlock'}
        dimensionKey={animQueue.currentEvent?.type === 'unlock' ? animQueue.currentEvent.payload.dimensionKey : 'social'}
        dimensionLabel={animQueue.currentEvent?.type === 'unlock' ? animQueue.currentEvent.payload.dimensionLabel : ''}
        dimensionColor={animQueue.currentEvent?.type === 'unlock' ? animQueue.currentEvent.payload.dimensionColor : ''}
        onComplete={animQueue.dequeue}
      />

      <HpWarningEffect
        show={animQueue.currentEvent?.type === 'hp-warning'}
        message={animQueue.currentEvent?.type === 'hp-warning' ? animQueue.currentEvent.payload.message : 'DIMENSION STATUS LOW'}
        onComplete={animQueue.dequeue}
      />

      <NotificationBanner
        show={animQueue.currentEvent?.type === 'notification'}
        message={animQueue.currentEvent?.type === 'notification' ? animQueue.currentEvent.payload.message : ''}
        subMessage={animQueue.currentEvent?.type === 'notification' ? animQueue.currentEvent.payload.sub : undefined}
        type={animQueue.currentEvent?.type === 'notification' ? animQueue.currentEvent.payload.type : 'info'}
        onDismiss={animQueue.dequeue}
        autoDismissMs={4000}
      />

      {/* ─── Proactive Check-in (Oracle 主动关心) ─── */}
      <NotificationBanner
        show={animQueue.currentEvent?.type === 'checkin'}
        message={animQueue.currentEvent?.type === 'checkin' ? `✦ ${animQueue.currentEvent.payload.message}` : ''}
        subMessage="点击回应 Oracle"
        type="info"
        onDismiss={() => {
          // 点击通知 → 打开聊天 + 注入 Oracle 消息
          if (animQueue.currentEvent?.type === 'checkin') {
            const msg = animQueue.currentEvent.payload.message
            setChatOpen(true)
            chat.injectMessage({ role: 'system', content: msg })
            checkin.dismissCheckin()
          }
          animQueue.dequeue()
        }}
        autoDismissMs={12000}
      />

      {/* ─── 系统终端对话 ─── */}
      {currentView !== 'onboarding' && currentView !== 'plan-selection' && (
        <button
          className="chat-trigger"
          onClick={() => setChatOpen(true)}
          title="Oracle 通讯 (⌘K)"
        >
          ⬡
          <span className="chat-trigger__hint">⌘K</span>
        </button>
      )}

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chat.messages}
        loading={chat.loading}
        streamingContent={chat.streamingContent}
        onSend={chat.sendMessage}
        onClear={chat.clearHistory}
      />

      {/* ─── BGM 常驻静音控制 ─── */}
      <AudioToggle muted={audio.muted} onToggle={audio.toggleMute} />
    </div>
  )
}

export default App
