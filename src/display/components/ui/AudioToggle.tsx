import { motion } from 'framer-motion'
import { colors } from '../../../design-system'

interface AudioToggleProps {
  muted: boolean
  onToggle: () => void
}

/**
 * Oracle OS — 常驻音频控制按钮
 * 始终显示在界面左下角，用户可随时切换 BGM
 */
export default function AudioToggle({ muted, onToggle }: AudioToggleProps) {
  return (
    <motion.button
      className="audio-toggle"
      onClick={onToggle}
      title={muted ? '开启背景音乐' : '关闭背景音乐'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.3 }}
    >
      {/* 音波图标 */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 喇叭体 */}
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity={0.3} />

        {/* 音波线 — 非静音时显示 */}
        {!muted && (
          <>
            <motion.path
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.path
              d="M19.07 4.93a10 10 0 0 1 0 14.14"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          </>
        )}

        {/* 静音斜线 */}
        {muted && (
          <motion.line
            x1="23"
            y1="1"
            x2="1"
            y2="23"
            stroke={colors.danger}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </svg>

      {/* 呼吸动画指示器 — BGM 播放时 */}
      {!muted && (
        <motion.div
          className="audio-toggle__pulse"
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  )
}
