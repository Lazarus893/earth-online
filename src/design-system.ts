// ═══════════════════════════════════════════════════════
//  EARTH ONLINE — Design System Tokens
//  所有组件必须引用此文件，不允许 hardcode 样式值
// ═══════════════════════════════════════════════════════

// ─── Easing ───────────────────────────────────────────
export const easing = {
  /** Persona 5 锐利切入 — 用于几何转场、元素入场 */
  sharp: [0.76, 0, 0.24, 1] as const,
  /** 流畅回弹 — 用于 hover、交互反馈 */
  smooth: [0.23, 1, 0.32, 1] as const,
  /** 线性 — 用于持续旋转、扫描线 */
  linear: [0, 0, 1, 1] as const,
}

// ─── Duration ─────────────────────────────────────────
export const duration = {
  /** 按钮反馈、tooltip */
  fast: 0.15,
  /** 标准过渡 */
  normal: 0.25,
  /** 页面切换、大区域变化 */
  slow: 0.4,
  /** 戏剧性揭示 */
  dramatic: 0.6,
}

// ─── Colors ───────────────────────────────────────────
export const colors = {
  bg: '#0A0E1A',
  panel: '#111827',
  panelLight: '#1a2235',

  physical: '#FF6B35',
  energy: '#7C3AED',
  career: '#06B6D4',
  social: '#F59E0B',
  finance: '#10B981',

  exp: '#FBBF24',
  danger: '#EF4444',
  patch: '#22D3EE',

  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#4b5563',
  white: '#ffffff',
}

// ─── Geometry (clip-path 预设) ─────────────────────────
export const geometry = {
  /** 标准斜切卡片 */
  skewCard: 'polygon(2% 0, 100% 0, 98% 100%, 0% 100%)',
  /** 按钮斜切 */
  skewButton: 'polygon(3% 0, 100% 0, 97% 100%, 0% 100%)',
  /** 宽幅面板 */
  skewPanel: 'polygon(1% 0, 100% 0, 99% 100%, 0% 100%)',
  /** 菱形 */
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  /** 六边形 */
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  /** 五角形 */
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  /** 进度条斜切 */
  barSlice: 'polygon(0 0, calc(100% - 4px) 0, 100% 100%, 0 100%)',
}

// ─── Typography ───────────────────────────────────────
export const typography = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  display: "'Inter', 'Noto Sans SC', system-ui, sans-serif",
  body: "'Noto Sans SC', 'Inter', system-ui, sans-serif",
}

// ─── Spacing ──────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

// ─── Motion Presets (Framer Motion transition 对象) ────
export const motion = {
  /** 标准入场 */
  enter: {
    duration: duration.normal,
    ease: easing.smooth,
  },
  /** 锐利切入 */
  sharpEnter: {
    duration: duration.normal,
    ease: easing.sharp,
  },
  /** stagger 子元素 */
  stagger: (i: number, base = 0.15) => ({
    delay: base + i * 0.06,
    duration: duration.normal,
    ease: easing.smooth,
  }),
  /** 快速反馈 */
  tap: {
    scale: 0.97,
  },
  /** hover 偏移 */
  hoverShift: {
    x: 8,
    transition: { duration: duration.fast, ease: easing.smooth },
  },
}
