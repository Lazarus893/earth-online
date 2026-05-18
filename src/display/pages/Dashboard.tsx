import { motion } from 'framer-motion'
import type { DimensionData, DimensionKey } from '../../App'
import type { Quest } from '../../hooks/useGameState'
import type { WorldPatch } from '../../hooks/useWorldPatch'
import { colors, easing, duration } from '../../design-system'
import WorldPatchBanner from '../components/WorldPatchBanner'
import CharacterDisplay from '../components/CharacterDisplay'
import DimensionCard from '../components/DimensionCard'
import JournalPanel from '../components/JournalPanel'
import AchievementTicker from '../components/AchievementTicker'
import StatBar from '../components/ui/StatBar'
import HudText from '../components/ui/HudText'
import { assets } from '../assets'

interface DashboardProps {
  dimensions: DimensionData[]
  quests: Quest[]
  playerLevel: number
  playerExp: number
  playerExpMax: number
  streak: number
  patch: WorldPatch | null
  patchLoading: boolean
  journalLoading?: boolean
  onDimensionClick: (key: DimensionKey) => void
  onQuestComplete: (questId: string) => void
}

const orbitClasses: Record<DimensionKey, string> = {
  physical: 'dashboard-node--physical',
  energy: 'dashboard-node--energy',
  career: 'dashboard-node--career',
  social: 'dashboard-node--social',
  finance: 'dashboard-node--finance',
}

export default function Dashboard({ dimensions, quests, playerLevel, playerExp, playerExpMax, streak, patch, patchLoading, journalLoading, onDimensionClick, onQuestComplete }: DashboardProps) {

  return (
    <motion.div
      className="relative w-full h-full flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.slow }}
    >
      {/* 动态背景：VD-DASH-LOOP 粒子星云循环 */}
      <div className="absolute inset-0 z-0">
        <video
          className="w-full h-full object-cover"
          src={assets.backgrounds.dashboardLoop}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        {/* 静态 fallback — 仅在视频加载失败时可见 */}
        <img
          src={assets.backgrounds.dashboard}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.25 }}
          onLoad={(e) => { e.currentTarget.style.display = 'none' }}
          onError={(e) => { e.currentTarget.style.display = 'block' }}
        />
      </div>
      {/* 暗色遮罩确保文字可读 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(34, 211, 238, 0.13), transparent 28%), linear-gradient(180deg, rgba(3, 7, 18, 0.5), rgba(3, 7, 18, 0.86) 72%, #040711)',
        }}
      />

      {/* HUD 框架装饰 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* 左上角 */}
        <div className="absolute top-4 left-4 w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: `${colors.patch}22` }} />
          <div className="absolute top-0 left-0 w-[1px] h-full" style={{ background: `${colors.patch}22` }} />
        </div>
        {/* 右上角 */}
        <div className="absolute top-4 right-4 w-12 h-12">
          <div className="absolute top-0 right-0 w-full h-[1px]" style={{ background: `${colors.patch}22` }} />
          <div className="absolute top-0 right-0 w-[1px] h-full" style={{ background: `${colors.patch}22` }} />
        </div>
        {/* 左下角 */}
        <div className="absolute bottom-4 left-4 w-12 h-12">
          <div className="absolute bottom-0 left-0 w-full h-[1px]" style={{ background: `${colors.patch}22` }} />
          <div className="absolute bottom-0 left-0 w-[1px] h-full" style={{ background: `${colors.patch}22` }} />
        </div>
        {/* 右下角 */}
        <div className="absolute bottom-4 right-4 w-12 h-12">
          <div className="absolute bottom-0 right-0 w-full h-[1px]" style={{ background: `${colors.patch}22` }} />
          <div className="absolute bottom-0 right-0 w-[1px] h-full" style={{ background: `${colors.patch}22` }} />
        </div>
      </div>

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 顶部 Patch Banner */}
        <WorldPatchBanner patch={patch} loading={patchLoading} streak={streak} />

        {/* 角色状态舱：中心角色 + 环绕维度 */}
        <div className="dashboard-stage">
          <div className="dashboard-orbit-rings" aria-hidden="true">
            <div className="dashboard-ring dashboard-ring--outer" />
            <div className="dashboard-ring dashboard-ring--inner" />
            <div className="dashboard-axis dashboard-axis--horizontal" />
            <div className="dashboard-axis dashboard-axis--vertical" />
          </div>

          <motion.div
            className="dashboard-core"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: duration.slow, ease: easing.smooth }}
          >
            <CharacterDisplay />
            <div className="dashboard-core-copy">
              <HudText variant="label" color={colors.patch}>PLAYER CORE</HudText>
              <HudText variant="title" className="dashboard-level-title">LEVEL {playerLevel}</HudText>
              <div className="dashboard-exp-bar">
                <StatBar current={playerExp} max={playerExpMax || 1} color={colors.exp} height={10} glow />
              </div>
              <HudText variant="label" color={colors.textDim}>{playerExp} / {playerExpMax} EXP</HudText>
            </div>
          </motion.div>

          <div className="dashboard-orbit-nodes" aria-label="dimension status">
            {dimensions.map((dim, i) => (
              <motion.div
                key={dim.key}
                className={`dashboard-node ${orbitClasses[dim.key]}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.8 + i * 0.12,
                  duration: duration.normal,
                  ease: easing.smooth,
                }}
              >
                <DimensionCard dimension={dim} onClick={() => onDimensionClick(dim.key)} />
              </motion.div>
            ))}
          </div>

          <motion.div
            className="dashboard-bottom-panels"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: duration.normal, ease: easing.smooth }}
          >
            <JournalPanel
              entries={quests as any}
              dimensions={dimensions}
              onLog={onQuestComplete}
              loading={journalLoading}
            />
            <AchievementTicker />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
