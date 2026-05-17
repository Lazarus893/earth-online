import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import type { DimensionKey } from '../../App'
import { assets } from '../assets'

interface TransitionProps {
  dimension: DimensionKey
  onComplete: () => void
}

const colorMap: Record<DimensionKey, string> = {
  physical: '#FF6B35',
  energy: '#7C3AED',
  career: '#06B6D4',
  social: '#F59E0B',
  finance: '#10B981',
}

type Phase = 'zoom' | 'persona-video' | 'persona-cut' | 'reveal'

export default function Transition({ dimension, onComplete }: TransitionProps) {
  const [phase, setPhase] = useState<Phase>('zoom')
  const videoRef = useRef<HTMLVideoElement>(null)
  const personaVideoRef = useRef<HTMLVideoElement>(null)
  const completedRef = useRef(false)
  const color = colorMap[dimension]
  const personaBg = assets.transition.personaStill[dimension]

  // 安全总超时 — 确保所有 phase 有足够时间走完
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, 15000)

    return () => window.clearTimeout(timer)
  }, [onComplete])

  // Phase 1 保底：如果 VD01 的 onEnded 没触发，8秒后强制推进到 Phase 2
  useEffect(() => {
    if (phase !== 'zoom') return
    const fallback = window.setTimeout(() => {
      if (phase === 'zoom') {
        setPhase('persona-video')
      }
    }, 8000)
    return () => window.clearTimeout(fallback)
  }, [phase])

  // Phase 2 保底：如果 VD09 的 onEnded 没触发，3秒后强制推进
  useEffect(() => {
    if (phase !== 'persona-video') return
    const fallback = window.setTimeout(() => {
      if (phase === 'persona-video') {
        handlePersonaVideoEnd()
      }
    }, 3000)
    return () => window.clearTimeout(fallback)
  }, [phase])

  // Phase 1: VD01 宇宙缩放视频结束
  const handleZoomEnd = () => {
    setPhase('persona-video')
  }

  // Phase 2: VD09 Persona切割视频结束
  const handlePersonaVideoEnd = () => {
    if (completedRef.current) return
    setPhase('persona-cut')
    setTimeout(() => setPhase('reveal'), 500)
    setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, 2000)
  }

  // 视频加载失败时跳过继续
  const handleVideoError = () => {
    if (phase === 'zoom') {
      setPhase('persona-video')
    } else {
      handlePersonaVideoEnd()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: '#0A0E1A' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Phase 1: VD01 GTA5 太空→城市 转场视频 */}
      <AnimatePresence>
        {phase === 'zoom' && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              src={assets.transition.earthZoom}
              autoPlay
              playsInline
              preload="metadata"
              onEnded={handleZoomEnd}
              onError={handleVideoError}
              onLoadedData={(e) => {
                const v = e.currentTarget
                v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
              }}
            />

            {/* 维度色彩叠加 */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${color}11, transparent)` }}
              animate={{ opacity: [0, 0.4, 0.2] }}
              transition={{ duration: 2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2: VD09 Persona5 对角切割视频 */}
      <AnimatePresence>
        {phase === 'persona-video' && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <video
              ref={personaVideoRef}
              className="w-full h-full object-cover"
              src={assets.transition.personaCut}
              autoPlay
              playsInline
              preload="metadata"
              onEnded={handlePersonaVideoEnd}
              onError={handleVideoError}
              onLoadedData={(e) => {
                const v = e.currentTarget
                v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
              }}
            />

            {/* 维度色彩叠加 — 让 VD09 的几何切割带上维度色 */}
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{ background: `${color}33` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Persona 色块切割静帧 */}
      <AnimatePresence>
        {(phase === 'persona-cut' || phase === 'reveal') && (
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${personaBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
            animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Phase 4: 维度揭示 — 光爆 + 文字 */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* 光爆 */}
            <motion.div
              className="absolute w-4 h-4 rounded-full"
              style={{ background: color, boxShadow: `0 0 100px 50px ${color}66` }}
              animate={{ scale: [1, 30], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* 维度文字 */}
            <motion.div
              className="relative text-5xl font-bold tracking-[0.3em] font-mono"
              style={{ color, textShadow: `0 0 30px ${color}88, 0 0 60px ${color}44` }}
              initial={{ opacity: 0, scale: 0.7, letterSpacing: '0em' }}
              animate={{ opacity: 1, scale: 1, letterSpacing: '0.3em' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {dimension.toUpperCase()}
            </motion.div>

            {/* 扫描线 */}
            <motion.div
              className="absolute bottom-[40%] left-[20%] right-[20%] h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 角落装饰 */}
      <div className="absolute top-4 left-4 w-16 h-16 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: `${color}66` }} />
        <div className="absolute top-0 left-0 w-[1px] h-full" style={{ background: `${color}66` }} />
      </div>
      <div className="absolute bottom-4 right-4 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-[1px]" style={{ background: `${color}66` }} />
        <div className="absolute bottom-0 right-0 w-[1px] h-full" style={{ background: `${color}66` }} />
      </div>

      <motion.div
        className="absolute top-4 right-20 text-xs font-mono"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
      >
        NAVIGATING...
      </motion.div>
    </motion.div>
  )
}
