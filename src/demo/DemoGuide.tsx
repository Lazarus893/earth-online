import { motion, AnimatePresence } from 'framer-motion'

interface DemoGuideProps {
  show: boolean
  text: string
  position?: 'center' | 'bottom' | 'top'
}

/**
 * Demo 引导弹窗 — 在交互点提示用户下一步操作
 */
export default function DemoGuide({ show, text, position = 'center' }: DemoGuideProps) {
  const posClass = position === 'bottom' ? 'bottom-24' : position === 'top' ? 'top-20' : 'top-1/2 -translate-y-1/2'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed left-1/2 -translate-x-1/2 ${posClass} z-[9990] pointer-events-none`}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="demo-guide">
            <div className="demo-guide__arrow" />
            <span className="demo-guide__text">{text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
