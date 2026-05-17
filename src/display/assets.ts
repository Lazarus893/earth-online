import type { DimensionKey } from '../App'

export const assets = {
  backgrounds: {
    dashboard: '/IMG-DASH-BG.png',
    /** VD-DASH-LOOP 粒子星云循环 — Dashboard 动态背景 */
    dashboardLoop: '/VD-DASH-LOOP.mp4',
    /** VD10 代码雨 — DimensionDetail 动态背景 */
    codeRain: '/VD10.mp4',
    dimension: {
      physical: '/BG03.png',
      energy: '/BG04.png',
      career: '/BG05.png',
      social: '/BG06.png',
      finance: '/BG07.png',
    } satisfies Record<DimensionKey, string>,
  },
  character: {
    idleLoop: '/VD04.mp4',
  },
  onboarding: {
    creation: '/ON01.png',
    /** VD-BIND 系统绑定开篇 — 从虚空中醒来 */
    bindingIntro: '/VD-BIND.mp4',
    /** VD-ERROR 绑定失败闪烁 */
    errorGlitch: '/VD-ERROR.mp4',
    /** VD-SCAN 属性扫描光线 */
    scan: '/VD-SCAN.mp4',
    /** VD-INIT 系统初始化 — 面板飞入 */
    init: '/VD-INIT.mp4',
    /** IMG-BIND-BG 绑定背景 — 深空数据流 */
    bindingBg: '/IMG-BIND-BG.png',
  },
  transition: {
    earthZoom: '/VD01.mp4',
    personaCut: '/VD09.mp4',
    /** VD-TRANSITION 通用页面转场 — 数据隧道 */
    dataZoom: '/VD-TRANSITION.mp4',
    /** VD12 反向缩放 — 退出转场 */
    exitZoom: '/VD12.mp4',
    personaStill: {
      physical: '/TR04.png',
      energy: '/TR05.png',
      career: '/TR06.png',
      social: '/TR04.png',
      finance: '/TR06.png',
    } satisfies Record<DimensionKey, string>,
  },
  effects: {
    /** VD-LEVELUP 升级特效 — 能量爆发 */
    levelUp: '/VD-LEVELUP.mp4',
    /** VD-UNLOCK 维度解锁 — 锁链碎裂 */
    unlock: '/VD-UNLOCK.mp4',
    patchArrival: '/VD06.mp4',
    /** VD07 XP条填充动画 */
    expFill: '/VD07.mp4',
    /** VD08 HP条警告闪烁 */
    hpWarning: '/VD08.mp4',
  },
  ui: {
    radarFrame: '/UI05.png',
    /** VD11 雷达图扫描动画 */
    radarScan: '/VD11.mp4',
    /** IMG-CHAT-BG 对话面板背景 */
    chatBg: '/IMG-CHAT-BG.png',
  },
  audio: {
    /** BGM — 主界面背景音乐循环 (用户自选) */
    bgm: '/BGM.mp3',
  },
} as const
