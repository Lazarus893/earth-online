import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Oracle OS — Global Audio System
 *
 * 管理背景音乐(BGM)和过场音效之间的协调：
 * - BGM 持续循环播放
 * - 当过场动画播放时，BGM 自动淡出暂停
 * - 过场结束后 BGM 自动淡入恢复
 * - 用户可随时通过静音按钮切换
 */

export interface AudioSystemState {
  /** BGM 是否静音 (用户控制) */
  muted: boolean
  /** BGM 是否正在播放 */
  playing: boolean
  /** 是否有过场动画正在播放（此时 BGM 暂停） */
  transitionActive: boolean
}

export interface AudioSystemActions {
  /** 切换静音状态 */
  toggleMute: () => void
  /** 设置静音状态 */
  setMuted: (muted: boolean) => void
  /** 通知系统过场动画开始（自动暂停 BGM） */
  onTransitionStart: () => void
  /** 通知系统过场动画结束（自动恢复 BGM） */
  onTransitionEnd: () => void
  /** 手动播放 BGM */
  play: () => void
  /** 手动暂停 BGM */
  pause: () => void
}

const BGM_STORAGE_KEY = 'oracle-os-bgm-muted'
const BGM_VOLUME = 0.35
const FADE_DURATION = 800 // ms

export function useAudioSystem(bgmSrc?: string): AudioSystemState & AudioSystemActions {
  const [muted, setMutedState] = useState(() => {
    const stored = localStorage.getItem(BGM_STORAGE_KEY)
    return stored === 'true'
  })
  const [playing, setPlaying] = useState(false)
  const [transitionActive, setTransitionActive] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeIntervalRef = useRef<number | null>(null)

  // 初始化 Audio 元素
  useEffect(() => {
    if (!bgmSrc) return

    const audio = new Audio(bgmSrc)
    audio.loop = true
    audio.volume = muted ? 0 : BGM_VOLUME
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [bgmSrc])

  // 淡入淡出工具函数
  const fadeTo = useCallback((targetVolume: number, onComplete?: () => void) => {
    const audio = audioRef.current
    if (!audio) return

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }

    const startVolume = audio.volume
    const delta = targetVolume - startVolume
    const steps = 20
    const stepTime = FADE_DURATION / steps
    let currentStep = 0

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      // easeInOutQuad
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      audio.volume = Math.max(0, Math.min(1, startVolume + delta * eased))

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current)
          fadeIntervalRef.current = null
        }
        audio.volume = targetVolume
        onComplete?.()
      }
    }, stepTime)
  }, [])

  // 播放 BGM
  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio || muted) return

    audio.play().then(() => {
      setPlaying(true)
      fadeTo(BGM_VOLUME)
    }).catch(() => {
      // 浏览器可能阻止自动播放，需要用户交互
      setPlaying(false)
    })
  }, [muted, fadeTo])

  // 暂停 BGM
  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    fadeTo(0, () => {
      audio.pause()
      setPlaying(false)
    })
  }, [fadeTo])

  // 切换静音
  const toggleMute = useCallback(() => {
    setMutedState(prev => {
      const newMuted = !prev
      localStorage.setItem(BGM_STORAGE_KEY, String(newMuted))

      const audio = audioRef.current
      if (audio) {
        if (newMuted) {
          fadeTo(0, () => {
            audio.pause()
            setPlaying(false)
          })
        } else if (!transitionActive) {
          audio.volume = 0
          audio.play().then(() => {
            setPlaying(true)
            fadeTo(BGM_VOLUME)
          }).catch(() => {})
        }
      }
      return newMuted
    })
  }, [transitionActive, fadeTo])

  // 设置静音
  const setMuted = useCallback((newMuted: boolean) => {
    setMutedState(newMuted)
    localStorage.setItem(BGM_STORAGE_KEY, String(newMuted))

    const audio = audioRef.current
    if (audio) {
      if (newMuted) {
        fadeTo(0, () => {
          audio.pause()
          setPlaying(false)
        })
      } else if (!transitionActive) {
        audio.volume = 0
        audio.play().then(() => {
          setPlaying(true)
          fadeTo(BGM_VOLUME)
        }).catch(() => {})
      }
    }
  }, [transitionActive, fadeTo])

  // 过场动画开始 → 淡出暂停 BGM
  const onTransitionStart = useCallback(() => {
    setTransitionActive(true)
    const audio = audioRef.current
    if (audio && playing) {
      fadeTo(0, () => {
        audio.pause()
      })
    }
  }, [playing, fadeTo])

  // 过场动画结束 → 恢复 BGM
  const onTransitionEnd = useCallback(() => {
    setTransitionActive(false)
    const audio = audioRef.current
    if (audio && !muted) {
      audio.volume = 0
      audio.play().then(() => {
        setPlaying(true)
        fadeTo(BGM_VOLUME)
      }).catch(() => {})
    }
  }, [muted, fadeTo])

  // 首次用户交互后尝试自动播放
  useEffect(() => {
    if (muted || !bgmSrc) return

    const tryPlay = () => {
      const audio = audioRef.current
      if (audio && !playing && !transitionActive) {
        audio.volume = 0
        audio.play().then(() => {
          setPlaying(true)
          fadeTo(BGM_VOLUME)
        }).catch(() => {})
      }
      // 成功后移除监听
      document.removeEventListener('click', tryPlay)
      document.removeEventListener('keydown', tryPlay)
    }

    document.addEventListener('click', tryPlay, { once: true })
    document.addEventListener('keydown', tryPlay, { once: true })

    return () => {
      document.removeEventListener('click', tryPlay)
      document.removeEventListener('keydown', tryPlay)
    }
  }, [muted, bgmSrc, playing, transitionActive, fadeTo])

  return {
    muted,
    playing,
    transitionActive,
    toggleMute,
    setMuted,
    onTransitionStart,
    onTransitionEnd,
    play,
    pause,
  }
}
