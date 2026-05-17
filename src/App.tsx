import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './display/pages/Dashboard'
import DimensionDetail from './display/pages/DimensionDetail'
import Onboarding from './display/pages/Onboarding'
import PlanSelection from './display/pages/PlanSelection'
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
import { getPatchModifiers } from './services/worldPatch'
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
const DATA_VERSION = 'v6'
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

  // Chat system
  const chat = useChatSystem({
    dimensions: game.dimensions,
    quests: game.quests,
    streak: game.streak,
    playerLevel: game.playerLevel,
  })

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
          message: '[系统] 检测到宿主首次上线',
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

  // 维度点击 → 直接切换（不用 Persona 转场）
  const handleDimensionClick = (key: DimensionKey) => {
    const dim = game.dimensions.find(d => d.key === key)
    if (dim?.locked) return
    setSelectedDimension(key)
    setCurrentView('dimension')
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
              onBack={() => {
                setCurrentView('dashboard')
                setSelectedDimension(null)
              }}
              onAddExp={(dimKey, amount) => game.addExp(dimKey, amount)}
              onInjectChat={chat.injectMessage}
            />
          </motion.div>
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

      {/* ─── 系统终端对话 ─── */}
      {currentView !== 'onboarding' && currentView !== 'plan-selection' && (
        <button
          className="chat-trigger"
          onClick={() => setChatOpen(true)}
          title="系统终端 (⌘K)"
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
