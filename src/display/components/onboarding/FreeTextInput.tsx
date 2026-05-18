/**
 * FreeTextInput — HUD 风格的自由文本输入框
 *
 * 用于 Onboarding 中允许自定义回答的问题。
 * 视觉风格：发光边框 + 光标闪烁 + 字数计数器
 */

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { colors, easing } from '../../../design-system'

interface FreeTextInputProps {
  placeholder?: string
  hint?: string
  maxLength?: number
  minLength?: number
  onSubmit: (text: string) => void
}

export default function FreeTextInput({
  placeholder = '用你自己的话描述...',
  hint,
  maxLength = 200,
  minLength = 10,
  onSubmit,
}: FreeTextInputProps) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = text.trim().length >= minLength

  useEffect(() => {
    // Auto-focus on mount
    setTimeout(() => textareaRef.current?.focus(), 300)
  }, [])

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(text.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      className="free-text-input"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easing.smooth }}
      style={{
        borderColor: focused
          ? 'rgba(34, 211, 238, 0.35)'
          : 'rgba(34, 211, 238, 0.12)',
        boxShadow: focused
          ? '0 0 12px rgba(34, 211, 238, 0.08), inset 0 0 6px rgba(34, 211, 238, 0.03)'
          : 'none',
      }}
    >
      {hint && (
        <div className="free-text-input__hint">{hint}</div>
      )}

      <textarea
        ref={textareaRef}
        className="free-text-input__field"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        rows={3}
        maxLength={maxLength}
      />

      <div className="free-text-input__footer">
        <span className="free-text-input__count" style={{
          color: text.length >= maxLength
            ? colors.danger
            : text.length >= minLength
            ? 'rgba(34, 211, 238, 0.6)'
            : 'rgba(226, 232, 240, 0.3)',
        }}>
          {text.length}/{maxLength}
        </span>

        <motion.button
          className="free-text-input__submit"
          disabled={!canSubmit}
          onClick={handleSubmit}
          whileHover={canSubmit ? { scale: 1.03 } : undefined}
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          style={{
            opacity: canSubmit ? 1 : 0.4,
            borderColor: canSubmit ? 'rgba(34, 211, 238, 0.4)' : 'rgba(226, 232, 240, 0.1)',
            color: canSubmit ? colors.patch : 'rgba(226, 232, 240, 0.3)',
          }}
        >
          确认 ↵
        </motion.button>
      </div>
    </motion.div>
  )
}
