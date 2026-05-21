import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage } from '../../hooks/useChatSystem'
import { colors, easing, duration, typography } from '../../design-system'
import { assets } from '../assets'
import MarkdownContent from './ui/MarkdownContent'
import OracleOrb from './ui/OracleOrb'
import ResourceCard, { parseResources } from './chat/ResourceCard'

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  loading: boolean
  streamingContent?: string
  onSend: (text: string) => void
  onClear: () => void
}

/**
 * 系统终端对话面板
 * 从底部滑出的全宽面板，游戏系统终端风格
 */
export default function ChatPanel({ open, onClose, messages, loading, streamingContent, onSend, onClear }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    onSend(text)
  }, [input, loading, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSend, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="chat-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: easing.sharp }}
          >
            {/* Header */}
            <div className="chat-panel__header">
              <div className="chat-panel__title">
                <OracleOrb size={28} />
                <span>ORACLE 通讯</span>
              </div>
              <div className="chat-panel__actions">
                <button
                  className="chat-panel__btn chat-panel__btn--clear"
                  onClick={() => {
                    if (messages.length === 0) return
                    if (window.confirm('遗忘这段对话？')) onClear()
                  }}
                  title="遗忘对话"
                >
                  🗑
                </button>
                <button
                  className="chat-panel__btn"
                  onClick={onClose}
                  title="关闭 (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-panel__messages">
              {messages.length === 0 && !loading && (
                <div className="chat-panel__empty">
                  <span className="chat-panel__empty-icon">⬡</span>
                  <span>[系统] 宿主有何指示？</span>
                </div>
              )}

              {messages.map(msg => {
                const parsed = msg.role === 'system' ? parseResources(msg.content) : null
                return (
                  <motion.div
                    key={msg.id}
                    className={`chat-msg ${msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--system'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="chat-msg__prefix">
                      {msg.role === 'user' ? '[宿主]' : <OracleOrb size={32} />}
                    </span>
                    <div className="chat-msg__content">
                      {msg.role === 'system' ? (
                        <>
                          <MarkdownContent content={parsed ? parsed.text : msg.content} />
                          {parsed && <ResourceCard resources={parsed.resources} />}
                        </>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {/* Streaming message — 流式输出中 */}
              {streamingContent && (
                <motion.div
                  className="chat-msg chat-msg--system"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <span className="chat-msg__prefix"><OracleOrb size={32} /></span>
                  <div className="chat-msg__content">
                    <MarkdownContent content={streamingContent} />
                    <span className="chat-msg__streaming-cursor" />
                  </div>
                </motion.div>
              )}

              {/* Typing indicator — 等待响应开始 */}
              {loading && !streamingContent && (
                <motion.div
                  className="chat-msg chat-msg--system"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="chat-msg__prefix"><OracleOrb size={32} /></span>
                  <motion.span
                    className="chat-msg__typing"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    Oracle 正在回应...
                  </motion.span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-panel__input-area">
              <input
                ref={inputRef}
                type="text"
                className="chat-panel__input"
                placeholder="对 Oracle 说点什么..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="chat-panel__send"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                传达
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
