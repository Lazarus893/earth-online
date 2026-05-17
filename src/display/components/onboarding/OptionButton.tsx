import { motion } from 'framer-motion'

interface OptionButtonProps {
  text: string
  index: number
  color?: string
  selected?: boolean
  disabled?: boolean
  onClick: () => void
}

// Persona 5 风格: 斜切几何按钮，不是圆角卡片
export default function OptionButton({
  text,
  index,
  color = '#06B6D4',
  selected = false,
  disabled = false,
  onClick,
}: OptionButtonProps) {
  // 每个选项有不同的斜切角度，产生动态错位感
  const skewDeg = index % 2 === 0 ? -1.5 : 1.5

  return (
    <motion.button
      className="relative w-full text-left overflow-hidden group"
      style={{
        transform: `skewX(${skewDeg}deg)`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
      }}
      whileHover={!disabled ? {
        x: 12,
        transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
      } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={() => !disabled && onClick()}
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: disabled ? 0.35 : 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* 主体背景 — 深色块，不是玻璃态 */}
      <div
        className="relative px-5 py-4"
        style={{
          background: selected ? color : '#111827',
          clipPath: 'polygon(0 0, 100% 0, 98% 100%, 2% 100%)',
        }}
      >
        {/* 选中时的对角高光条 */}
        {selected && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)`,
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          />
        )}

        {/* 左侧标记块 */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: selected ? '#fff' : color }}
          animate={{ scaleY: selected ? 1 : 0 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        />

        {/* 序号 + 文本 */}
        <div className="flex items-center gap-3" style={{ transform: `skewX(${-skewDeg}deg)` }}>
          <span
            className="text-[10px] font-mono font-bold tracking-widest opacity-50"
            style={{ color: selected ? '#fff' : color }}
          >
            {String.fromCharCode(65 + index)}
          </span>
          <span
            className="text-sm font-medium leading-snug"
            style={{ color: selected ? '#fff' : '#e2e8f0' }}
          >
            {text}
          </span>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        className="h-[1px] w-full"
        style={{
          background: `linear-gradient(90deg, ${color}44, transparent)`,
        }}
      />
    </motion.button>
  )
}
