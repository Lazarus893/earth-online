# Earth Online

> 把你的人生变成一场 RPG。一个将日常习惯、目标和成长转化为沉浸式游戏体验的个人发展系统。

Earth Online 是一个单页 Web 应用，将个人成长重新定义为一场大型多人在线游戏。在五个人生维度中追踪进度、完成日志、升级技能，并从 Oracle（你的 AI 伙伴）获取个性化指导。

## 功能亮点

- **5 大人生维度** — 体力、精力、职业、社交、金钱，独立升级与技能树
- **层级目标体系** — 目标 > 计划 > 任务 > 行动，AI 自动生成发展方案
- **Oracle AI 对话** — 理解你当前状态的 AI 伙伴，提供场景感知的个性化建议
- **动态 Onboarding** — AI 驱动的 6 轮对话式评估，每轮根据你的回答动态生成下一个问题
- **日记式任务系统** — 从层级目标树中智能选取每日行动，记录而非打卡
- **Oracle 主动关怀** — 检测状态下滑、连续缺勤等场景，主动发起对话
- **世界补丁系统** — 每日从真实天气/新闻拉取数据，生成游戏内"版本更新"
- **升级 & 解锁动画** — 全屏 RPG 风格的里程碑特效
- **AI 层级编辑器** — 选中目标树节点，让 Oracle 帮你优化和重构
- **云端同步** — 可选 Supabase 集成，跨设备状态同步
- **BGM & 音频** — 环境背景音乐，一键开关

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 |
| 构建工具 | Vite 8 |
| 样式 | Tailwind CSS 4 + 自定义 CSS (BEM) |
| 动画 | Framer Motion 12 |
| AI 后端 | OpenClaw Gateway (OpenAI 兼容 API) |
| AI 备用 | ZhipuAI GLM API |
| 云存储 | Supabase (可选) |
| 语言 | TypeScript 6 |
| Markdown | react-markdown |

## 前置要求

- **Node.js** >= 18.0
- **npm** >= 9.0
- **AI 后端**（任选其一）：
  - [OpenClaw](https://github.com/nicepkg/openclaw) 本地网关（推荐）
  - 任何 OpenAI 兼容 API 端点
  - ZhipuAI GLM API Key（聊天备用）

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/Lazarus893/earth-online.git
cd earth-online

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API Key（见下方环境变量说明）

# 4. 启动开发服务器
npm run dev

# 5. 打开 http://localhost:5173
```

## 环境变量

在项目根目录创建 `.env.local` 文件（可参考 `.env.example`）：

| 变量 | 必须 | 说明 |
|------|------|------|
| `VITE_OPENCLAW_GATEWAY_URL` | 是 | OpenClaw 网关地址。默认: `/api/openclaw`（开发模式代理） |
| `VITE_OPENCLAW_API_KEY` | 是 | OpenClaw 网关 API Key |
| `VITE_OPENCLAW_MODEL` | 否 | 模型标识。默认: `openclaw/codex` |
| `VITE_GLM_API_KEY` | 否 | ZhipuAI API Key（聊天备用）。获取地址: [open.bigmodel.cn](https://open.bigmodel.cn/) |
| `VITE_GLM_ENDPOINT` | 否 | GLM API 端点。默认: `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| `VITE_GLM_MODEL` | 否 | GLM 模型名。默认: `glm-4-flash` |
| `VITE_SUPABASE_URL` | 否 | Supabase 项目 URL（云同步用） |
| `VITE_SUPABASE_ANON_KEY` | 否 | Supabase 匿名 Key |

### OpenClaw 网关配置

应用需要一个 OpenAI 兼容 API。开发模式下，Vite 会将 `/api/openclaw` 代理到 `http://localhost:18789`。本地运行 OpenClaw：

```bash
# 在默认端口启动 OpenClaw
openclaw serve --port 18789
```

生产环境或自定义配置，将 `VITE_OPENCLAW_GATEWAY_URL` 设为完整 API 端点（如 `https://your-api.example.com/v1`）。

## 脚本命令

```bash
npm run dev      # 启动开发服务器（Vite，热更新）
npm run build    # 类型检查 + 生产构建
npm run preview  # 本地预览生产构建
```

## 项目结构

```
src/
├── App.tsx                    # 根组件，路由，全局状态
├── main.tsx                   # 入口
├── design-system.ts           # 设计令牌（颜色、缓动、时长）
├── index.css                  # 全局样式 + 组件 CSS (BEM)
│
├── core/                      # 核心游戏逻辑（无 UI）
│   ├── hierarchy.ts           # 目标层级数据模型 & 持久化
│   ├── scoring.ts             # Onboarding 评分算法
│   ├── contextEngine.ts       # 动态上下文引擎（场景感知提示词）
│   ├── memorySeeds.ts         # 记忆种子（onboarding 自由文本持久化）
│   └── interactionSummary.ts  # 交互摘要（短期对话记忆）
│
├── data/
│   ├── questions.ts           # Onboarding 问题数据
│   ├── dimensionStatus.ts     # 维度状态文案 & 颜色
│   └── checkinMessages.ts     # Oracle 主动关怀消息模板
│
├── hooks/                     # React Hooks
│   ├── useGameState.ts        # 核心游戏状态管理
│   ├── useChatSystem.ts       # Oracle AI 对话（流式）
│   ├── useAnimationQueue.ts   # 全屏动画优先级队列
│   ├── useAudioSystem.ts      # BGM 播放管理
│   ├── useDimensionAdvisor.ts # 维度 AI 顾问
│   ├── useWorldPatch.ts       # 每日世界补丁获取
│   ├── useSceneContext.ts     # 场景上下文派生
│   └── useProactiveCheckin.ts # Oracle 主动关怀触发
│
├── services/                  # API & 外部服务集成
│   ├── onboardingAI.ts        # 动态 Onboarding 对话引擎
│   ├── journalGenerator.ts    # AI 每日日志生成
│   ├── journalReflection.ts   # AI 日记反思
│   ├── agent.ts               # OpenClaw Agent 调用
│   ├── glm.ts                 # ZhipuAI GLM API（同步 + 流式）
│   ├── planGenerator.ts       # AI 方案生成（目标/计划/任务）
│   ├── hierarchyEditor.ts     # AI 层级节点编辑
│   ├── worldPatch.ts          # 真实数据 → 游戏修正值
│   ├── shortcuts.ts           # 快捷 AI 操作
│   ├── supabase.ts            # Supabase 客户端
│   └── cloudSync.ts           # 云同步操作
│
├── display/
│   ├── assets.ts              # 资源路径注册
│   ├── pages/
│   │   ├── Dashboard.tsx      # 主游戏面板
│   │   ├── DimensionDetail.tsx # 维度详情 + 层级树
│   │   ├── Onboarding.tsx     # AI 动态对话评估
│   │   └── PlanSelection.tsx  # 觉醒路径三选一
│   │
│   └── components/
│       ├── JournalPanel.tsx        # 日记式每日记录面板
│       ├── HierarchyTree.tsx       # 交互式目标树（可选中）
│       ├── HierarchyEditDialog.tsx # AI 编辑对话框（流式）
│       ├── ChatPanel.tsx           # Oracle 终端聊天 UI
│       ├── DimensionCard.tsx       # 维度状态卡片
│       ├── WorldPatchBanner.tsx    # 每日世界更新展示
│       ├── LevelUpEffect.tsx       # 全屏升级动画
│       ├── UnlockReveal.tsx        # 维度解锁动画
│       ├── HpWarningEffect.tsx     # 低状态警告特效
│       ├── NotificationBanner.tsx  # Toast 通知
│       └── ui/                     # 可复用 UI 基础组件
│           ├── OracleOrb.tsx
│           ├── MarkdownContent.tsx
│           ├── StatBar.tsx
│           ├── GeometricPanel.tsx
│           ├── AudioToggle.tsx
│           └── ...
│
└── demo/                      # 演示/录屏工具
```

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                   React UI                       │
│  Dashboard · DimensionDetail · Onboarding       │
├─────────────────────────────────────────────────┤
│              Hooks（状态层）                      │
│  useGameState · useChatSystem · useAnimationQueue│
├─────────────────────────────────────────────────┤
│             Services（API 层）                    │
│  onboardingAI · journalGenerator · worldPatch    │
├─────────────────────────────────────────────────┤
│          Core（纯逻辑层）                        │
│  hierarchy · scoring · contextEngine             │
├─────────────────────────────────────────────────┤
│           外部服务                               │
│  OpenClaw Gateway · ZhipuAI · Supabase          │
└─────────────────────────────────────────────────┘
```

## 游戏机制

- **经验 & 等级**：完成行动获取 EXP，每个维度独立升级（1-99 级）
- **连续天数**：连续活跃天数提供 EXP 加成
- **世界修正**：真实天气/新闻数据影响 EXP 倍率（如晴天 = 体力 EXP +20%）
- **解锁系统**：随着等级提升逐步解锁新维度
- **AI 指导**：Oracle 根据你的状态、连续天数和目标动态调整建议
- **主动关怀**：Oracle 检测到状态异常时主动发起对话

## License

MIT
