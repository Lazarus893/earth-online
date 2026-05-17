import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import type { DimensionKey } from '../../../App'
import type { OnboardingResult } from '../../../core/scoring'
import { colors, geometry, typography } from '../../../design-system'
import HudText from '../ui/HudText'
import StatBar from '../ui/StatBar'

interface CardRevealProps {
  result: OnboardingResult
  onComplete: () => void
}

const DIMENSIONS: { key: DimensionKey; label: string; labelEn: string; icon: string; color: string }[] = [
  { key: 'physical', label: '体力', labelEn: 'PHYSICAL', icon: '⚔', color: '#FF6B35' },
  { key: 'energy', label: '精力', labelEn: 'ENERGY', icon: '⚡', color: '#7C3AED' },
  { key: 'career', label: '职业', labelEn: 'CAREER', icon: '🎯', color: '#06B6D4' },
  { key: 'social', label: '社交', labelEn: 'SOCIAL', icon: '🤝', color: '#F59E0B' },
  { key: 'finance', label: '金钱', labelEn: 'FINANCE', icon: '💎', color: '#10B981' },
]

const LOCKED_DIMS: DimensionKey[] = ['social', 'finance']

// ─── Pentagon SVG 五角形版图 ───────────────────────────────
function PentagonMap({ revealedCount }: { revealedCount: number }) {
  const size = 200
  const center = size / 2
  const radius = 72

  // 五个顶点坐标
  const getPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
  }

  const points = Array.from({ length: 5 }, (_, i) => getPoint(i))
  const isComplete = revealedCount >= 5

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* 背景网格辐射线 */}
      {points.map((p, i) => (
        <line
          key={`axis-${i}`}
          x1={center} y1={center}
          x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />
      ))}

      {/* 五角形边 — 逐步亮起 */}
      {points.map((p, i) => {
        const next = points[(i + 1) % 5]
        const isRevealed = i < revealedCount
        const dimColor = DIMENSIONS[i].color

        return (
          <motion.line
            key={`edge-${i}`}
            x1={p.x} y1={p.y}
            x2={next.x} y2={next.y}
            stroke={isRevealed ? dimColor : 'rgba(255,255,255,0.12)'}
            strokeWidth={isRevealed ? 2 : 1}
            strokeDasharray={isRevealed ? 'none' : '4 4'}
            initial={false}
            animate={{
              stroke: isRevealed ? dimColor : 'rgba(255,255,255,0.12)',
              strokeWidth: isRevealed ? 2 : 1,
              filter: isRevealed ? `drop-shadow(0 0 6px ${dimColor}88)` : 'none',
            }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        )
      })}

      {/* 内部填充 — 完成后出现 */}
      <motion.polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(6,182,212,0.06)"
        initial={{ opacity: 0 }}
        animate={{ opacity: isComplete ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* 完成时 pulse */}
      {isComplete && (
        <motion.polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={colors.patch}
          strokeWidth="2"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      )}

      {/* 顶点标记 */}
      {points.map((p, i) => {
        const isRevealed = i < revealedCount
        const dimColor = DIMENSIONS[i].color
        return (
          <motion.g key={`vertex-${i}`}>
            <motion.rect
              x={p.x - 5}
              y={p.y - 5}
              width={10}
              height={10}
              fill={isRevealed ? dimColor : 'rgba(255,255,255,0.1)'}
              stroke={isRevealed ? dimColor : 'rgba(255,255,255,0.2)'}
              strokeWidth={1}
              transform={`rotate(45 ${p.x} ${p.y})`}
              animate={{
                fill: isRevealed ? dimColor : 'rgba(255,255,255,0.1)',
                scale: isRevealed ? 1 : 0.7,
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
            {/* 维度缩写 */}
            <text
              x={p.x + (p.x > center ? 14 : p.x < center ? -14 : 0)}
              y={p.y + (p.y > center ? 16 : p.y < center ? -12 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isRevealed ? dimColor : 'rgba(255,255,255,0.2)'}
              fontSize="8"
              fontFamily={typography.mono}
              letterSpacing="0.1em"
            >
              {DIMENSIONS[i].labelEn.slice(0, 3)}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

// ─── 单张卡牌 ─────────────────────────────────────────────
function DimensionCard({
  dim,
  score,
  isRevealed,
  isLocked,
  isCurrent,
}: {
  dim: typeof DIMENSIONS[number]
  score: number
  isRevealed: boolean
  isLocked: boolean
  isCurrent: boolean
}) {
  return (
    <div
      className="relative"
      style={{
        width: 160,
        height: 210,
        perspective: '1000px',
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* 背面 — 未翻转时可见 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{
            backfaceVisibility: 'hidden',
            background: '#111827',
            border: `1px solid ${isCurrent ? dim.color + '66' : 'rgba(255,255,255,0.08)'}`,
            clipPath: 'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)',
          }}
        >
          {/* 菱形 "?" 图案 */}
          <motion.div
            className="w-12 h-12 flex items-center justify-center"
            style={{
              border: `2px solid ${isCurrent ? dim.color + '88' : 'rgba(255,255,255,0.15)'}`,
              clipPath: geometry.diamond,
            }}
            animate={isCurrent ? { scale: [1, 1.1, 1], borderColor: [`${dim.color}88`, `${dim.color}ff`, `${dim.color}88`] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <span className="text-xl font-mono" style={{ color: isCurrent ? dim.color : 'rgba(255,255,255,0.3)' }}>?</span>
          </motion.div>
          <div className="text-[9px] font-mono tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            DIMENSION
          </div>

          {/* 扫描线动画 — 当前卡激活时 */}
          {isCurrent && (
            <motion.div
              className="absolute left-[10%] right-[10%] h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${dim.color}, transparent)` }}
              animate={{ top: ['20%', '80%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* 正面 — 翻转后可见 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: isLocked ? '#0d1117' : `linear-gradient(180deg, ${dim.color}11, ${dim.color}05)`,
            border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : dim.color + '55'}`,
            clipPath: 'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)',
            boxShadow: isLocked ? 'none' : `inset 0 0 30px ${dim.color}11, 0 0 20px ${dim.color}22`,
          }}
        >
          {/* 维度图标 */}
          <div
            className="w-14 h-14 flex items-center justify-center text-2xl"
            style={{
              background: isLocked ? 'rgba(255,255,255,0.03)' : `${dim.color}18`,
              border: `1px solid ${isLocked ? 'rgba(255,255,255,0.08)' : dim.color + '44'}`,
              clipPath: geometry.diamond,
            }}
          >
            {isLocked ? '🔒' : dim.icon}
          </div>

          {/* 维度名 */}
          <div className="text-center">
            <div
              className="text-xs font-mono font-bold tracking-[0.15em]"
              style={{ color: isLocked ? 'rgba(255,255,255,0.3)' : dim.color }}
            >
              {dim.labelEn}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{dim.label}</div>
          </div>

          {/* 分数 */}
          {isLocked ? (
            <div className="text-[10px] font-mono text-gray-600 tracking-wider">LOCKED</div>
          ) : (
            <div className="w-full flex flex-col items-center gap-1.5">
              <div className="w-[80%]">
                <StatBar current={score} max={100} color={dim.color} delay={0.3} height={6} />
              </div>
              <motion.div
                className="text-2xl font-mono font-bold"
                style={{ color: dim.color, textShadow: `0 0 12px ${dim.color}44` }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {score}
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── 主组件 ───────────────────────────────────────────────
export default function CardReveal({ result, onComplete }: CardRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'revealing' | 'complete'>('idle')

  // 开始揭牌
  useEffect(() => {
    const startTimer = setTimeout(() => setPhase('revealing'), 800)
    return () => clearTimeout(startTimer)
  }, [])

  // 揭牌流程: 展示背面 → 翻转 → 停留看分数 → 下一张
  useEffect(() => {
    if (phase !== 'revealing') return

    if (!flipped) {
      // 背面展示 0.6s 后翻转
      const flipTimer = setTimeout(() => setFlipped(true), 600)
      return () => clearTimeout(flipTimer)
    } else {
      // 翻转后停留 1.2s 让用户看到分数，然后切到下一张
      const nextTimer = setTimeout(() => {
        setRevealedCount(currentIndex + 1)
        if (currentIndex < 4) {
          setFlipped(false)
          setCurrentIndex(prev => prev + 1)
        } else {
          setPhase('complete')
        }
      }, 1200)
      return () => clearTimeout(nextTimer)
    }
  }, [phase, flipped, currentIndex])

  const isComplete = phase === 'complete'

  return (
    <motion.div
      className="w-full max-w-lg flex flex-col items-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 标题 */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <HudText variant="system" color={colors.patch}>
          {isComplete ? 'SCAN COMPLETE' : 'DIMENSION SCAN'}
        </HudText>
      </motion.div>

      {/* 五角形版图 */}
      <PentagonMap revealedCount={revealedCount} />

      {/* 当前正在揭晓的卡片 — 中心放大展示 */}
      <div className="relative h-[220px] w-[170px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex items-center gap-2"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5" style={{ background: colors.patch, clipPath: geometry.diamond }} />
                <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500">INITIALIZING</span>
              </motion.div>
            </motion.div>
          )}

          {phase === 'revealing' && (
            <motion.div
              key={`card-${currentIndex}`}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <DimensionCard
                dim={DIMENSIONS[currentIndex]}
                score={result.scores[DIMENSIONS[currentIndex].key]}
                isRevealed={flipped}
                isLocked={LOCKED_DIMS.includes(DIMENSIONS[currentIndex].key)}
                isCurrent={!flipped}
              />
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              key="complete"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <DimensionCard
                dim={DIMENSIONS[result.scores.physical >= result.scores.energy && result.scores.physical >= result.scores.career ? 0 : result.scores.energy >= result.scores.career ? 1 : 2]}
                score={Math.max(result.scores.physical, result.scores.energy, result.scores.career)}
                isRevealed={true}
                isLocked={false}
                isCurrent={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部进度指示器 — 菱形点 */}
      <div className="flex items-center gap-3">
        {DIMENSIONS.map((dim, i) => {
          const isActive = i < revealedCount
          const isCurrent = i === revealedCount && phase === 'revealing'
          return (
            <motion.div
              key={dim.key}
              className="w-3 h-3 flex items-center justify-center"
              animate={{
                scale: isCurrent ? 1.3 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="w-2 h-2"
                style={{
                  background: isActive ? dim.color : isCurrent ? dim.color + '88' : 'rgba(255,255,255,0.12)',
                  clipPath: geometry.diamond,
                  boxShadow: isActive ? `0 0 6px ${dim.color}66` : 'none',
                }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* 已揭晓的小卡片列表 */}
      <div className="flex items-center gap-2 min-h-[40px]">
        <AnimatePresence>
          {DIMENSIONS.slice(0, revealedCount).map((dim, i) => {
            const isLocked = LOCKED_DIMS.includes(dim.key)
            const score = result.scores[dim.key]
            return (
              <motion.div
                key={dim.key}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
                style={{
                  background: 'rgba(17,24,39,0.8)',
                  border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : dim.color + '33'}`,
                  clipPath: 'polygon(6% 0, 94% 0, 100% 6%, 100% 94%, 94% 100%, 6% 100%, 0% 94%, 0% 6%)',
                }}
                initial={{ opacity: 0, scale: 0, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <span className="text-xs">{isLocked ? '🔒' : dim.icon}</span>
                <span
                  className="text-[9px] font-mono font-bold"
                  style={{ color: isLocked ? 'rgba(255,255,255,0.3)' : dim.color }}
                >
                  {isLocked ? '--' : score}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 完成后的"开始冒险"按钮 */}
      <AnimatePresence>
        {isComplete && (
          <motion.button
            className="relative w-full max-w-xs py-4 text-center font-bold text-sm tracking-wider uppercase overflow-hidden"
            style={{
              background: colors.patch,
              color: '#0A0E1A',
              clipPath: 'polygon(3% 0, 100% 0, 97% 100%, 0% 100%)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            onClick={onComplete}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            />
            <span className="relative z-10">开始冒险</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
