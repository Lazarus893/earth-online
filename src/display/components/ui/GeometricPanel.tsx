import type { ReactNode, CSSProperties } from 'react'
import { colors, geometry } from '../../../design-system'

interface GeometricPanelProps {
  children: ReactNode
  /** accent 颜色（用于边线） */
  accent?: string
  /** clip-path 形状，默认 skewCard */
  shape?: keyof typeof geometry | string
  /** 是否显示角标 */
  cornerMarks?: boolean
  /** 额外 className */
  className?: string
  /** 额外 style */
  style?: CSSProperties
}

/**
 * 通用几何面板 — 替代所有 glassmorphism / rounded div
 * 纯深色实心底 + 斜切 clip-path + 可选 accent 线
 */
export default function GeometricPanel({
  children,
  accent,
  shape = 'skewCard',
  cornerMarks = false,
  className = '',
  style,
}: GeometricPanelProps) {
  const clipPath = shape in geometry ? geometry[shape as keyof typeof geometry] : shape

  return (
    <div
      className={`relative isolate ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: colors.panel,
          clipPath,
        }}
      />

      {/* 底部 accent 线 */}
      {accent && (
        <div
          className="absolute bottom-0 left-[2%] right-[2%] h-[1px]"
          style={{ background: `${accent}44` }}
        />
      )}

      {/* HUD 角标 */}
      {cornerMarks && (
        <>
          <div className="absolute top-1 left-1 w-2 h-2">
            <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: `${accent || colors.patch}33` }} />
            <div className="absolute top-0 left-0 w-[1px] h-full" style={{ background: `${accent || colors.patch}33` }} />
          </div>
          <div className="absolute top-1 right-1 w-2 h-2">
            <div className="absolute top-0 right-0 w-full h-[1px]" style={{ background: `${accent || colors.patch}33` }} />
            <div className="absolute top-0 right-0 w-[1px] h-full" style={{ background: `${accent || colors.patch}33` }} />
          </div>
        </>
      )}

      {children}
    </div>
  )
}
