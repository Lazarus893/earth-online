import { motion, AnimatePresence } from 'framer-motion'
import type { Question, QuestionOption } from '../../../data/questions'
import OptionButton from './OptionButton'
import FreeTextInput from './FreeTextInput'

interface QuestionCardProps {
  question: Question
  questionIndex: number
  selectedOption: QuestionOption | null
  onSelect: (option: QuestionOption) => void
  onFreeText?: (questionId: string, text: string) => void
}

// 阶段色 — 对比强烈，不是渐变过渡
const PHASE_COLORS: Record<string, string> = {
  opening: '#06B6D4',
  core: '#7C3AED',
  calibration: '#FBBF24',
}

// Persona 5 斜切过渡
const cardVariants = {
  enter: { opacity: 0, x: 60, skewX: -3 },
  center: { opacity: 1, x: 0, skewX: 0 },
  exit: { opacity: 0, x: -60, skewX: 3 },
}

export default function QuestionCard({
  question,
  questionIndex,
  selectedOption,
  onSelect,
  onFreeText,
}: QuestionCardProps) {
  const phaseColor = PHASE_COLORS[question.phase]

  return (
    <motion.div
      className="w-full max-w-lg flex flex-col gap-5"
      key={question.id}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* 系统消息 — HUD 终端风格 */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* 小色块标记 */}
        <div className="w-2 h-2" style={{ background: phaseColor, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
        <span
          className="text-[11px] font-mono tracking-[0.2em] uppercase"
          style={{ color: phaseColor }}
        >
          {question.systemMessage}
        </span>
      </motion.div>

      {/* 问题文本 — 大号加粗，有存在感 */}
      <motion.h2
        className="text-xl font-bold text-white leading-tight tracking-tight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        {question.questionText}
      </motion.h2>

      {/* 分隔线 — 锐利的对角线 */}
      <motion.div
        className="h-[2px] w-24"
        style={{
          background: `linear-gradient(90deg, ${phaseColor}, transparent)`,
          clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)',
        }}
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* 选项列表 — 错位斜切排布 */}
      <div className="flex flex-col gap-2 mt-1">
        {question.options.map((option, i) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.2 + i * 0.06,
              duration: 0.25,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <OptionButton
              text={option.text}
              index={i}
              color={phaseColor}
              selected={selectedOption?.id === option.id}
              disabled={selectedOption !== null && selectedOption.id !== option.id}
              onClick={() => onSelect(option)}
            />
          </motion.div>
        ))}
      </div>

      {/* 自由文本输入区 — 仅 allowCustom 的问题显示，预先展开 */}
      {question.allowCustom && question.freeTextPrompt && onFreeText && !selectedOption && (
        <motion.div
          className="mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <div className="text-[11px] font-mono tracking-wide text-white/25 mb-2 text-center">
            ── 或者用自己的话 ──
          </div>
          <FreeTextInput
            placeholder={question.freeTextPrompt}
            hint={question.freeTextHint}
            onSubmit={(text) => onFreeText(question.id, text)}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
