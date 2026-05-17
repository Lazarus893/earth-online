import { motion } from 'framer-motion'

interface ScanAnimationProps {
  phase?: 'scanning' | 'complete'
}

// 赛博HUD扫描效果 — 不是通用旋转环
export default function ScanAnimation({ phase = 'scanning' }: ScanAnimationProps) {
  if (phase === 'complete') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 完成: 五角形绽放 */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            className="absolute inset-0"
            style={{
              border: '2px solid #06B6D4',
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
          <motion.div
            className="absolute inset-2"
            style={{
              background: 'rgba(6,182,212,0.1)',
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          />
          {/* 中心确认标记 */}
          <motion.div
            className="text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', bounce: 0.3 }}
          >
            ✓
          </motion.div>
        </div>

        <motion.p
          className="text-xs font-mono tracking-[0.3em] uppercase"
          style={{ color: '#06B6D4' }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.2 }}
        >
          SCAN COMPLETE
        </motion.p>
      </motion.div>
    )
  }

  // 扫描中: 多层几何图形交错旋转 + 扫描线
  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* 外层: 六边形慢速旋转 */}
        <motion.div
          className="absolute inset-0"
          style={{
            border: '1px solid rgba(6,182,212,0.4)',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* 中层: 菱形快速旋转 */}
        <motion.div
          className="absolute inset-4"
          style={{
            border: '1px solid rgba(124,58,237,0.5)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />

        {/* 内层: 三角形 */}
        <motion.div
          className="absolute inset-8"
          style={{
            border: '1px solid rgba(251,191,36,0.4)',
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* 扫描线 — 水平扫过 */}
        <motion.div
          className="absolute left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, #06B6D4, transparent)' }}
          animate={{ top: ['20%', '80%', '20%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* 中心点 - 脉冲 */}
        <motion.div
          className="w-2 h-2"
          style={{
            background: '#06B6D4',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* 状态文字 — 打字机效果 */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-1.5 h-1.5"
          style={{ background: '#06B6D4' }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <span className="text-[11px] font-mono tracking-[0.15em] text-gray-400 uppercase">
          Calculating attributes
        </span>
      </div>
    </motion.div>
  )
}
