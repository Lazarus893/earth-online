import type { CSSProperties } from 'react'
import { colors, typography } from '../../../design-system'

type HudVariant = 'label' | 'value' | 'title' | 'system'

interface HudTextProps {
  children: React.ReactNode
  variant?: HudVariant
  color?: string
  className?: string
  style?: CSSProperties
}

const variantStyles: Record<HudVariant, CSSProperties> = {
  label: {
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },
  value: {
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: colors.white,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: colors.white,
  },
  system: {
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: colors.patch,
  },
}

/**
 * HUD 风格文本 — 统一所有文字样式
 */
export default function HudText({ children, variant = 'label', color, className = '', style }: HudTextProps) {
  return (
    <span
      className={className}
      style={{
        ...variantStyles[variant],
        ...(color ? { color } : {}),
        ...style,
      }}
    >
      {children}
    </span>
  )
}
