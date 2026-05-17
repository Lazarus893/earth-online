import { motion } from 'framer-motion'
import type { DimensionKey } from '../../../App'
import type { OnboardingResult } from '../../../core/scoring'

interface ResultRevealProps {
  result: OnboardingResult
  onStart: () => void
}

const DIMENSION_META: Record<DimensionKey, { label: string; labelEn: string; icon: string; color: string }> = {
  physical: { label: '体力', labelEn: 'PHYSICAL', icon: '⚔', color: '#FF6B35' },
  energy: { label: '精力', labelEn: 'ENERGY', icon: '⚡', color: '#7C3AED' },
  career: { label: '职业', labelEn: 'CAREER', icon: '🎯', color: '#06B6D4' },
  social: { label: '社交', labelEn: 'SOCIAL', icon: '🤝', color: '#F59E0B' },
  finance: { label: '金钱', labelEn: 'FINANCE', icon: '💎', color: '#10B981' },
}

const PRIORITY_SUGGESTIONS: Record<DimensionKey, string> = {
  physical: '身体是一切的基础，先把体力值拉上来。',
  energy: '精力是所有行动的燃料，先恢复你的能量池。',
  career: '技能树等着你去点亮，冲刺职业成长。',
  social: '是时候建立你的社交网络了。',
  finance: '开始管理你的财富之旅。',
}

// 锐利几何条形图 — 不是圆角进度条
function StatBar({ score, color, delay }: { score: number; color: string; delay: number }) {
  return (
    <div className="relative h-3 w-full overflow-hidden" style={{ background: '#0d1117' }}>
      {/* 网格刻度线 */}
      {[25, 50, 75].map(tick => (
        <div
          key={tick}
          className="absolute top-0 bottom-0 w-[1px]"
          style={{ left: `${tick}%`, background: 'rgba(255,255,255,0.06)' }}
        />
      ))}
      {/* 填充条 — clip-path 斜切 */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 100%, 0 100%)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ delay, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      />
      {/* 尾部光标 */}
      <motion.div
        className="absolute top-0 bottom-0 w-[2px]"
        style={{ background: '#fff', left: `${score}%` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6] }}
        transition={{ delay: delay + 0.5, duration: 0.3 }}
      />
    </div>
  )
}

// SVG 五角雷达 — 锐利线条风格
function RadarChart({ scores }: { scores: Record<DimensionKey, number> }) {
  const dims: DimensionKey[] = ['physical', 'energy', 'career', 'social', 'finance']
  const size = 180
  const center = size / 2
  const maxR = size / 2 - 24

  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  // 数据多边形路径
  const dataPoints = dims.map((dim, i) => getPoint(i, maxR * (scores[dim] / 100)))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  // 网格
  const gridLevels = [0.33, 0.66, 1]

  return (
    <motion.svg
      width={size}
      height={size}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* 网格五角形 */}
      {gridLevels.map((level, gi) => {
        const pts = dims.map((_, i) => getPoint(i, maxR * level))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
        return <path key={gi} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      })}

      {/* 轴线 */}
      {dims.map((_, i) => {
        const p = getPoint(i, maxR)
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      })}

      {/* 数据区域 — 动画绘制 */}
      <motion.path
        d={dataPath}
        fill="rgba(6,182,212,0.12)"
        stroke="#06B6D4"
        strokeWidth="1.5"
        strokeLinejoin="bevel"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* 顶点 — 菱形标记 */}
      {dataPoints.map((p, i) => (
        <motion.rect
          key={i}
          x={p.x - 3}
          y={p.y - 3}
          width={6}
          height={6}
          fill={DIMENSION_META[dims[i]].color}
          transform={`rotate(45 ${p.x} ${p.y})`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8 + i * 0.08, duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        />
      ))}

      {/* 维度标签 */}
      {dims.map((dim, i) => {
        const p = getPoint(i, maxR + 16)
        return (
          <text
            key={dim}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[8px] font-mono"
            fill={DIMENSION_META[dim].color}
            style={{ letterSpacing: '0.05em' }}
          >
            {DIMENSION_META[dim].labelEn}
          </text>
        )
      })}
    </motion.svg>
  )
}

export default function ResultReveal({ result, onStart }: ResultRevealProps) {
  const { scores, priority, lowestDimension } = result
  const unlockedDims: DimensionKey[] = ['physical', 'energy', 'career']
  const lockedDims: DimensionKey[] = ['social', 'finance']
  const focusDim = priority || lowestDimension

  return (
    <motion.div
      className="w-full max-w-lg flex flex-col items-center gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 标题 — 大字居中，HUD 风格 */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <h2 className="text-2xl font-bold text-white tracking-tight">属性扫描完成</h2>
        <div className="mt-1 h-[2px] w-16 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #06B6D4, transparent)' }} />
      </motion.div>

      {/* 雷达图 */}
      <RadarChart scores={scores} />

      {/* 分数列表 — 锐利条形 */}
      <div className="w-full flex flex-col gap-3">
        {unlockedDims.map((dim, i) => {
          const meta = DIMENSION_META[dim]
          return (
            <motion.div
              key={dim}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 + i * 0.12, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="text-base w-5 text-center">{meta.icon}</span>
              <span className="text-[10px] font-mono tracking-wider w-16 uppercase" style={{ color: meta.color }}>
                {meta.labelEn}
              </span>
              <div className="flex-1">
                <StatBar score={scores[dim]} color={meta.color} delay={1.0 + i * 0.12} />
              </div>
              <motion.span
                className="text-sm font-mono font-bold w-8 text-right"
                style={{ color: meta.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 + i * 0.12 }}
              >
                {scores[dim]}
              </motion.span>
            </motion.div>
          )
        })}

        {/* 锁定维度 */}
        {lockedDims.map((dim, i) => {
          const meta = DIMENSION_META[dim]
          return (
            <motion.div
              key={dim}
              className="flex items-center gap-3 opacity-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1.6 + i * 0.08 }}
            >
              <span className="text-base w-5 text-center grayscale">🔒</span>
              <span className="text-[10px] font-mono tracking-wider w-16 uppercase text-gray-600">
                {meta.labelEn}
              </span>
              <div className="flex-1 h-3" style={{ background: '#0d1117' }} />
              <span className="text-[10px] font-mono text-gray-700 w-8 text-right">--</span>
            </motion.div>
          )
        })}
      </div>

      {/* 系统建议 — 不用卡片，用粗线分隔 */}
      <motion.div
        className="w-full pt-4"
        style={{ borderTop: `2px solid ${DIMENSION_META[focusDim].color}33` }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.3 }}
      >
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-gray-500 mb-1">
          PRIORITY TARGET
        </p>
        <p className="text-base font-bold" style={{ color: DIMENSION_META[focusDim].color }}>
          {DIMENSION_META[focusDim].icon} {DIMENSION_META[focusDim].label} — {PRIORITY_SUGGESTIONS[focusDim]}
        </p>
      </motion.div>

      {/* 开始按钮 — Persona 风格斜切大按钮 */}
      <motion.button
        className="relative w-full py-4 text-center font-bold text-sm tracking-wider uppercase overflow-hidden"
        style={{
          background: DIMENSION_META[focusDim].color,
          color: '#0A0E1A',
          clipPath: 'polygon(3% 0, 100% 0, 97% 100%, 0% 100%)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={onStart}
      >
        {/* 扫光效果 */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
        />
        <span className="relative z-10">开始冒险</span>
      </motion.button>
    </motion.div>
  )
}
