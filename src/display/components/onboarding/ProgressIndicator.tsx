import { motion } from 'framer-motion'

interface ProgressIndicatorProps {
  total: number
  current: number
  onStepClick?: (index: number) => void
}

// HUD 风格进度条: 几何方块序列，不是小圆点
export default function ProgressIndicator({ total, current, onStepClick }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current
        const isCompleted = i < current
        const color = isActive ? '#06B6D4' : isCompleted ? '#06B6D4' : '#1f2937'

        return (
          <motion.button
            key={i}
            className="relative"
            style={{
              width: isActive ? 28 : 12,
              height: 4,
              background: color,
              opacity: isActive ? 1 : isCompleted ? 0.6 : 0.3,
              clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
              cursor: isCompleted ? 'pointer' : 'default',
            }}
            animate={{
              width: isActive ? 28 : 12,
              opacity: isActive ? 1 : isCompleted ? 0.6 : 0.3,
            }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => isCompleted && onStepClick?.(i)}
          />
        )
      })}

      {/* 数字指示 */}
      <span className="ml-2 text-[10px] font-mono text-gray-500 tracking-wider">
        {String(current + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
      </span>
    </div>
  )
}
