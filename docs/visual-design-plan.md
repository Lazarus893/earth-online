# Earth Online - Visual Design & Asset Production Plan

## Art Direction: "Neon Cosmos" (霓虹宇宙)

### 风格定位
融合三种视觉语言，形成独特的 Earth Online 美学：

| 参考来源 | 提取元素 | 用在哪里 |
|----------|----------|----------|
| **Persona 5** | 高对比色块、斜切几何形转场、角色姿态展示 | 菜单转场、状态面板 |
| **GTA5** | 卫星视角缩放、角色切换的上帝视角 | 维度切换转场 |
| **赛博朋克 HUD** | 霓虹辉光、全息半透明面板、粒子数据流 | 状态数值显示、世界Patch公告 |
| **原神** | 元素配色体系、技能树视觉、解锁动画 | 五维配色、技能树页面 |

### 色彩体系

```
主色调 (Dark Base):
  背景: #0A0E1A (深空蓝黑)
  面板: #111827 (暗灰蓝) + 20% opacity blur

五维专属色:
  Physical (体力): #FF6B35 (烈焰橙)    - 力量、活力
  Energy (精力):   #7C3AED (电光紫)    - 精神、神秘  
  Career (职业):   #06B6D4 (数据青)    - 科技、专业
  Social (社交):   #F59E0B (暖阳金)    - 温暖、连接 [锁定态: 灰色]
  Finance (金钱):  #10B981 (翡翠绿)    - 增长、财富 [锁定态: 灰色]

辅助色:
  经验值/升级: #FBBF24 (金色)
  危险/衰减: #EF4444 (红色)
  成就/解锁: #8B5CF6 → #EC4899 (紫粉渐变)
  世界Patch: #22D3EE (冰蓝)
```

### 字体方案
- 标题/数值: 等宽像素风 (如 Press Start 2P 或 Silkscreen)
- 正文: 思源黑体 / Noto Sans CJK
- 强调: 斜切变形的无衬线体 (Persona 5 风格)

---

## Page 1: 综合状态仪表盘 (Main Dashboard)

### 布局设计
```
┌──────────────────────────────────────────────────────────┐
│ [World Patch Banner] ← 顶部横幅，显示当前版本/天气/事件   │
│  "Patch v2026.05.12 | ☀ 28°C | Career +10% | Streak: 7" │
├──────────────────────────────────────────────────────────┤
│                                                          │
│    ┌─────────────────────────────────┐                   │
│    │                                 │   ┌────────────┐  │
│    │      [角色 / 头像区域]           │   │ Level 12   │  │
│    │      全息投影风格的              │   │ ████████░  │  │
│    │      人物立绘/3D头像            │   │ 2340/3000  │  │
│    │                                 │   └────────────┘  │
│    └─────────────────────────────────┘                   │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐ ┌───┐      │
│  │Physical │ │ Energy  │ │ Career  │ │🔒 │ │🔒 │      │
│  │  ⚔ 65  │ │  ⚡ 45  │ │  🎯 72  │ │   │ │   │      │
│  │ ██████░ │ │ ████░░░ │ │ ███████ │ │   │ │   │      │
│  │  Lv.4   │ │  Lv.3   │ │  Lv.5   │ │   │ │   │      │
│  └─────────┘ └─────────┘ └─────────┘ └───┘ └───┘      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ [Today's Quests]          │ [Achievement Ticker]         │
│  □ 30min 有氧运动         │  🏆 七日连胜 达成!          │
│  □ 完成技术日报           │  🏆 下一个: 全维觉醒        │
│  ■ 冥想10分钟 ✓          │                              │
└──────────────────────────────────────────────────────────┘
```

### 视觉细节
- 背景: 缓慢旋转的星空粒子 + 微弱的网格线
- 维度卡片: 悬浮感 (subtle shadow + glassmorphism)
- 数值变化时: 数字滚动 + 微粒子爆发
- 锁定维度: 灰度 + 静态噪点覆盖 + "解锁条件"悬浮提示

---

## Page 2: 转场系统设计 (Transition System)

### 转场类型

#### Type A: 维度切换 (GTA5 式卫星缩放)
```
当前维度面板 
  → 画面急速拉远 (zoom out)
  → 进入卫星/上帝视角 (看到整个"地球")
  → 地球上五个维度区域发光
  → 画面急速推进目标维度 (zoom in)  
  → 目标维度详情页展开
  
时长: 1.5-2秒
缓动: ease-in-out-cubic
```

#### Type B: 层级深入 (Persona 5 式几何切割)
```
Status 面板
  → 斜切色块从两侧滑入覆盖
  → 色块为目标维度的专属色
  → 色块裂开/散开
  → 显示 Goals 列表页
  
时长: 0.8-1.2秒
风格: 锐利、有节奏感
```

#### Type C: 版本更新 (Patch Reveal)
```
正常界面
  → 画面轻微震动 + 扫描线效果
  → 顶部滑入 "INCOMING PATCH" 横幅
  → 全息面板展开显示 Patch Note
  → 背景切换为对应场景 (如天气变化)
  → 数值实时变动动画
  
时长: 3-5秒 (可跳过)
风格: 电影感、史诗感
```

#### Type D: 升级/解锁 (Achievement Reveal)
```
任务完成
  → 经验条快速填充
  → 到达满格时：屏幕白闪 + 粒子爆发
  → "LEVEL UP" 大字从中心放大
  → 数值飞入更新
  → 如果触发解锁：额外的解锁揭示动画
  
时长: 2-3秒
风格: 华丽、有成就感
```

---

## 素材生产清单 (Asset Checklist)

### 一、静态图片 (GPT-Image-2 生成)

#### 1. 背景图

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| BG-01 | 主面板背景 | Dashboard 底图 | `Dark space background with subtle blue grid lines and floating particles, deep navy blue (#0A0E1A) base color, scattered small stars and nebula wisps, slight holographic scan lines, futuristic game HUD aesthetic, 1920x1080, ultra clean, minimal` |
| BG-02 | 地球卫星视图 | 转场中间帧 | `Earth viewed from low orbit at night, city lights glowing in neon cyan and orange, thin atmosphere glow on the edge, dark space background, cinematic angle, photorealistic, 4K quality, wide shot` |
| BG-03 | Physical维度场景 | Physical详情页背景 | `Futuristic gym interior with holographic displays showing body stats, neon orange (#FF6B35) accent lighting, dark environment, floating data particles, cyberpunk fitness aesthetic, wide angle, cinematic` |
| BG-04 | Energy维度场景 | Energy详情页背景 | `Meditative zen space merged with cyberpunk technology, purple (#7C3AED) energy orbs floating, neural network visualization in background, dark room with bioluminescent elements, serene yet futuristic` |
| BG-05 | Career维度场景 | Career详情页背景 | `Futuristic command center workspace with multiple holographic screens showing code and data, cyan (#06B6D4) accent lighting, dark high-tech environment, floating UI elements, professional and ambitious mood` |
| BG-06 | Social维度场景 (锁定态) | 锁定页面 | `Same as social scene but entirely in grayscale with static noise overlay, a glowing golden lock icon in center, mysterious and locked away feeling, dark atmosphere with hints of what's behind` |
| BG-07 | Finance维度场景 (锁定态) | 锁定页面 | `Same as finance scene but entirely in grayscale with static noise overlay, a glowing green lock icon in center, mysterious vault-like feeling, dark atmosphere, encrypted data streams in background` |

#### 2. 角色/头像相关

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| AV-01 | 默认角色全息投影 | 主面板角色展示 | `Full body holographic projection of a human silhouette, glowing cyan and purple edges, standing in a confident pose, translucent with visible data particles inside, dark background, sci-fi game character select screen style, centered composition` |
| AV-02 | 角色升级态 | 升级动画关键帧 | `Same holographic human figure but surrounded by explosive golden particles and energy rings, power-up moment, dramatic lighting, level up visual effect, radiant and triumphant, dark background` |
| AV-03 | 角色低能量态 | 衰减警告时 | `Holographic human figure with flickering/glitching effect, red warning indicators, some body parts fading out, low energy depleted visual, dark background, concerning but not alarming` |

#### 3. 维度图标

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| IC-01 | Physical 图标 | 维度标识 | `Game icon design: a flaming fist with orange neon glow (#FF6B35), minimalist geometric style, dark background, sharp edges, glowing particles, 512x512, flat icon with depth from lighting` |
| IC-02 | Energy 图标 | 维度标识 | `Game icon design: a glowing brain with electric purple aura (#7C3AED), neural connections visible, minimalist geometric style, dark background, 512x512, mystical and powerful` |
| IC-03 | Career 图标 | 维度标识 | `Game icon design: a rising arrow merged with a circuit board pattern, cyan neon glow (#06B6D4), minimalist geometric style, dark background, 512x512, professional and ambitious` |
| IC-04 | Social 图标 | 维度标识 | `Game icon design: two connected nodes forming a handshake shape, warm golden glow (#F59E0B), minimalist geometric style, dark background, 512x512, warm and connecting` |
| IC-05 | Finance 图标 | 维度标识 | `Game icon design: a growing crystal/gem with emerald green glow (#10B981), geometric facets reflecting light, minimalist style, dark background, 512x512, valuable and growing` |
| IC-06 | Locked 图标 | 锁定维度覆盖 | `Game icon design: an elegant digital lock with holographic chains, grayscale with slight blue glow, mysterious encrypted feeling, dark background, 512x512, tempting to unlock` |

#### 4. UI 组件素材

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| UI-01 | 经验条框架 | 各处经验条 | `Futuristic progress bar frame design, elongated hexagonal shape, metallic dark edges with subtle neon glow seam, empty interior for fill, sci-fi game HUD element, transparent background, horizontal, clean vector style` |
| UI-02 | Patch公告框 | World Patch展示 | `Holographic notification panel frame, rectangular with glowing cyan (#22D3EE) edges, slight transparency, floating in space with small particles, sci-fi game announcement board style, dark background, 800x400` |
| UI-03 | 成就徽章框架 | 成就系统 | `Hexagonal badge frame with golden (#FBBF24) metallic edges, laurel wreath subtle pattern, empty center for icon, premium game achievement style, dark background with slight radiance, 256x256` |
| UI-04 | 任务卡片背景 | 任务列表 | `Dark glassmorphism card background with very subtle blue border glow, rounded corners, slight frosted glass effect, minimal, suitable for text overlay, 600x120, horizontal game quest card` |
| UI-05 | 雷达图底板 | 五维展示 | `Pentagonal radar chart background with subtle grid lines in dark blue, each vertex has a different colored glow point (orange, purple, cyan, gold, green), sci-fi holographic style, dark background, 600x600` |

#### 5. 转场关键帧

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| TR-01 | 地球远景 (转场起始) | GTA式转场第1帧 | `Earth from far space, entire planet visible, city lights as tiny neon dots, surrounded by darkness and stars, cinematic wide shot, slightly tilted angle, photorealistic, high contrast` |
| TR-02 | 大陆视角 (转场中间) | GTA式转场中间帧 | `Zooming into East Asia from space, China coastline visible with bright city clusters, clouds partially visible, neon-colored city grids, transitioning from space to atmosphere, motion blur on edges` |
| TR-03 | 城市视角 (转场末尾) | GTA式转场最后帧 | `Overhead view of a futuristic city at night, glowing neon grid streets, buildings as dark rectangles with lit windows, cyberpunk aesthetic, about to zoom into a specific building, slight radial motion blur` |
| TR-04 | 色块切割 (Persona风) | 层级转场素材 | `Abstract geometric composition: sharp diagonal shapes in deep orange (#FF6B35) and dark navy, clean edges, bold color blocking, Persona 5 inspired menu transition style, graphic design aesthetic, 1920x1080` |
| TR-05 | 紫色色块切割 | Energy层级转场 | `Abstract geometric composition: sharp diagonal shapes in electric purple (#7C3AED) and dark navy, clean edges, bold color blocking, Persona 5 inspired menu transition style, graphic design aesthetic, 1920x1080` |
| TR-06 | 青色色块切割 | Career层级转场 | `Abstract geometric composition: sharp diagonal shapes in cyan (#06B6D4) and dark navy, clean edges, bold color blocking, Persona 5 inspired menu transition style, graphic design aesthetic, 1920x1080` |

#### 6. 引导问卷素材

| # | 素材名称 | 用途 | GPT-Image-2 Prompt |
|---|----------|------|---------------------|
| ON-01 | 角色创建开场 | 问卷第一页背景 | `A futuristic character creation screen, holographic body scan in progress, cyan scan lines moving over a silhouette, dark room with floating UI panels, "INITIALIZING..." text suggestion, game character select aesthetic` |
| ON-02 | 属性扫描动画帧 | 问卷过程 | `Holographic radar/pentagon chart being drawn in real-time, each vertex lighting up one by one in different colors (orange, purple, cyan, gold, green), dark background, scanning/analyzing feeling, game stat allocation` |
| ON-03 | 扫描完成 | 问卷结果页 | `Completed character status screen with all five stats revealed, glowing pentagon radar chart fully lit, holographic panels showing numbers, triumphant reveal moment, "SCAN COMPLETE" feeling, dark background, cinematic` |

---

### 二、视频/动画 (Seedance 生成)

| # | 素材名称 | 时长 | 用途 | Seedance Prompt |
|---|----------|------|------|-----------------|
| VD-01 | 地球卫星缩放转场 | 3-4s | 维度切换 | `Cinematic camera movement: starting from far space viewing Earth, rapidly zooming in through atmosphere to a neon-lit city at night, continuous smooth motion, dark space to bright city transition, GTA5 character switch style, sci-fi, 4K` |
| VD-02 | 升级粒子爆发 | 2s | 升级动画 | `Golden particles exploding outward from center then forming a ring, dark background, celebratory energy burst effect, game level-up visual, sparkling and radiant, smooth 60fps motion` |
| VD-03 | 解锁揭示动画 | 3s | 新维度解锁 | `A grayscale locked panel cracking with light seeping through cracks, then shattering to reveal vibrant colored scene behind, dramatic lighting, game unlock reveal moment, dark to bright transition` |
| VD-04 | 全息扫描循环 | 4s loop | 主面板角色区 | `Holographic human figure slowly rotating with cyan scan lines moving up and down, floating data particles around, subtle pulse effect, dark background, seamless loop, sci-fi character display` |
| VD-05 | 星空粒子背景循环 | 10s loop | 主面板背景 | `Slowly drifting star particles and subtle nebula wisps on dark navy background, very gentle movement, faint blue grid lines pulsing, ambient and calm, perfect loop, minimal and clean` |
| VD-06 | Patch到达动画 | 2-3s | 版本更新提示 | `Screen slight glitch/shake effect, then a holographic cyan banner slides in from top with scan line effects, notification arrival feeling, futuristic alert, dark background, impactful but not alarming` |
| VD-07 | 经验条填充 | 1.5s | 任务完成 | `A horizontal progress bar filling from left to right with glowing golden liquid/energy, reaching the end with a small burst of particles, satisfying completion feeling, dark background, game XP bar` |
| VD-08 | 维度衰减警告 | 2s | 衰减提醒 | `A holographic bar slowly depleting with red warning pulses, slight flicker effect, declining energy visual, urgent but not panicking, red accent on dark background, game health bar losing` |
| VD-09 | Persona风斜切转场 | 1s | 菜单切换 | `Sharp diagonal color blocks (orange and dark navy) sliding in rapidly from both sides, meeting in the middle then splitting apart to reveal new scene, bold geometric motion, smooth and stylish, 60fps` |
| VD-10 | 数据流背景 | 6s loop | Patch/Career页面 | `Vertical streams of glowing cyan data/code characters falling slowly like Matrix rain but more elegant and sparse, dark background, holographic feel, subtle and ambient, seamless loop` |
| VD-11 | 五角星雷达图绘制 | 2s | 引导完成时 | `A pentagon/radar chart being drawn vertex by vertex, each point lighting up in a different color (orange→purple→cyan→gold→green), lines connecting them, dark background, satisfying reveal animation` |
| VD-12 | 城市到太空拉远 | 3s | 退出维度详情 | `Reverse cinematic zoom: starting from a neon city rooftop view, rapidly pulling back through clouds and atmosphere into space until Earth is a small sphere, smooth continuous motion, GTA5 style, dark space` |

---

### 三、UI动效规范 (CSS/Framer Motion 实现)

这些不需要生成素材，用代码实现：

| 动效 | 触发条件 | 参数 |
|------|----------|------|
| 数字滚动 | 分数变化时 | duration: 0.6s, easing: spring |
| 卡片悬浮 | hover | translateY: -4px, shadow增强 |
| 脉冲发光 | 活跃维度 | 边框glow pulse, 2s cycle |
| 扫描线 | 加载中 | 水平线从上到下移动, 0.8s |
| 粒子散射 | 点击确认 | 从点击点向外散射20个粒子 |
| 斜切滑入 | 页面元素出现 | skewX(-3deg) + slideIn |
| 抖动 | 错误/警告 | shake 0.3s |

---

## TODO List (素材生产清单)

### Phase 1A: 核心静态素材 (优先级最高)

- [ ] **BG-01** 主面板背景 (深空星空)
- [ ] **BG-02** 地球卫星视图 (转场用)
- [ ] **AV-01** 默认角色全息投影
- [ ] **IC-01** Physical 图标 (橙)
- [ ] **IC-02** Energy 图标 (紫)
- [ ] **IC-03** Career 图标 (青)
- [ ] **IC-06** Locked 图标
- [ ] **UI-01** 经验条框架
- [ ] **UI-04** 任务卡片背景
- [ ] **UI-05** 雷达图底板

### Phase 1B: 转场关键帧

- [ ] **TR-01** 地球远景
- [ ] **TR-02** 大陆视角
- [ ] **TR-03** 城市视角
- [ ] **TR-04** 橙色色块切割 (Physical)
- [ ] **TR-05** 紫色色块切割 (Energy)
- [ ] **TR-06** 青色色块切割 (Career)

### Phase 1C: 引导问卷素材

- [ ] **ON-01** 角色创建开场
- [ ] **ON-02** 属性扫描动画帧
- [ ] **ON-03** 扫描完成

### Phase 2A: 核心视频素材

- [ ] **VD-01** 地球卫星缩放转场
- [ ] **VD-02** 升级粒子爆发
- [ ] **VD-04** 全息扫描循环
- [ ] **VD-05** 星空粒子背景循环
- [ ] **VD-07** 经验条填充
- [ ] **VD-09** Persona风斜切转场
- [ ] **VD-11** 五角星雷达图绘制

### Phase 2B: 辅助视频素材

- [ ] **VD-03** 解锁揭示动画
- [ ] **VD-06** Patch到达动画
- [ ] **VD-08** 维度衰减警告
- [ ] **VD-10** 数据流背景
- [ ] **VD-12** 城市到太空拉远

### Phase 3: 扩展素材

- [ ] **BG-03** Physical维度场景
- [ ] **BG-04** Energy维度场景
- [ ] **BG-05** Career维度场景
- [ ] **BG-06** Social维度场景 (锁定)
- [ ] **BG-07** Finance维度场景 (锁定)
- [ ] **AV-02** 角色升级态
- [ ] **AV-03** 角色低能量态
- [ ] **IC-04** Social 图标 (金)
- [ ] **IC-05** Finance 图标 (绿)
- [ ] **UI-02** Patch公告框
- [ ] **UI-03** 成就徽章框架

---

## 素材规格要求

### 图片
- 背景: 1920×1080 或 2560×1440 (16:9)
- 图标: 512×512 (PNG, 透明背景优先)
- UI组件: 按实际尺寸，保留透明度
- 格式: PNG (需要透明) 或 WebP (背景)

### 视频
- 分辨率: 1920×1080 最低
- 帧率: 30fps (循环背景) / 60fps (转场动画)
- 格式: MP4 (H.264) 或 WebM
- 循环视频需要首尾无缝衔接

---

## 统计

| 类型 | 数量 | 工具 |
|------|------|------|
| 静态图片 | 22张 | GPT-Image-2 |
| 视频动画 | 12条 | Seedance |
| 代码动效 | 7种 | CSS/Framer Motion |
| **总计** | **41项素材** | |

---

*生产建议: 按 Phase 顺序推进，Phase 1 (19张图) 完成后即可开始前端开发，Phase 2 视频可并行制作。*
