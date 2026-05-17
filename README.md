# Earth Online

> Turn your life into an RPG. A gamified personal development system that transforms daily habits, goals, and growth into an immersive game experience.

Earth Online is a single-page web application that reframes personal development as a massively multiplayer online game. Track progress across five life dimensions, complete quests, level up skills, and get AI-powered coaching from "Oracle" — your in-game AI companion.

## Features

- **5 Life Dimensions** — Physical, Energy, Career, Social, Finance — each with independent leveling and skill trees
- **Hierarchical Goal System** — Goals > Plans > Tasks > Actions, with AI-generated development schemes
- **Oracle AI Chat** — An empathetic AI companion that understands your game state and provides personalized guidance
- **World Patch System** — Daily "game updates" pulled from real-world weather and news data
- **Onboarding Assessment** — Initial questionnaire to calibrate your starting stats
- **Level Up & Unlock Animations** — Full-screen RPG-style effects for progression milestones
- **AI Hierarchy Editor** — Select nodes in your goal tree and ask Oracle to optimize/restructure them with cascading modifications
- **Cloud Sync** — Optional Supabase integration for cross-device state persistence
- **BGM & Audio** — Ambient background music with toggle control

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 + Custom CSS (BEM) |
| Animation | Framer Motion 12 |
| AI Backend | OpenClaw Gateway (OpenAI-compatible API) |
| AI Fallback | ZhipuAI GLM API |
| Cloud Storage | Supabase (optional) |
| Language | TypeScript 6 |
| Markdown | react-markdown |

## Prerequisites

- **Node.js** >= 18.0
- **npm** >= 9.0
- **AI Backend** (one of the following):
  - [OpenClaw](https://github.com/nicepkg/openclaw) gateway running locally (recommended)
  - Any OpenAI-compatible API endpoint
  - ZhipuAI GLM API key (fallback for chat)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Lazarus893/earth-online.git
cd earth-online

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Variables below)

# 4. Start development server
npm run dev

# 5. Open http://localhost:5173
```

## Environment Variables

Create a `.env.local` file in the project root (use `.env.example` as template):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OPENCLAW_GATEWAY_URL` | Yes | OpenClaw gateway URL. Default: `/api/openclaw` (proxied in dev) |
| `VITE_OPENCLAW_API_KEY` | Yes | API key for the OpenClaw gateway |
| `VITE_OPENCLAW_MODEL` | No | Model identifier. Default: `openclaw/codex` |
| `VITE_GLM_API_KEY` | No | ZhipuAI API key (for fallback chat). Get one at [open.bigmodel.cn](https://open.bigmodel.cn/) |
| `VITE_GLM_ENDPOINT` | No | GLM API endpoint. Default: `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| `VITE_GLM_MODEL` | No | GLM model name. Default: `glm-4-flash` |
| `VITE_SUPABASE_URL` | No | Supabase project URL (for cloud sync) |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anonymous key |

### OpenClaw Gateway Setup

The app expects an OpenAI-compatible API at the gateway URL. In development, Vite proxies `/api/openclaw` to `http://localhost:18789`. If running OpenClaw locally:

```bash
# Start OpenClaw on default port
openclaw serve --port 18789
```

For production or custom setups, set `VITE_OPENCLAW_GATEWAY_URL` to your full API endpoint (e.g., `https://your-api.example.com/v1`).

## Scripts

```bash
npm run dev      # Start dev server (Vite, hot reload)
npm run build    # Type-check + production build
npm run preview  # Preview production build locally
```

## Project Structure

```
src/
├── App.tsx                    # Root component, routing, global state
├── main.tsx                   # Entry point
├── design-system.ts           # Design tokens (colors, easing, durations)
├── index.css                  # Global styles + component CSS (BEM)
│
├── core/                      # Core game logic (no UI)
│   ├── hierarchy.ts           # Goal hierarchy data model & persistence
│   └── scoring.ts             # Onboarding scoring algorithm
│
├── data/
│   └── questions.ts           # Onboarding questionnaire data
│
├── hooks/                     # React hooks
│   ├── useGameState.ts        # Central game state management
│   ├── useChatSystem.ts       # Oracle AI chat with streaming
│   ├── useAnimationQueue.ts   # Sequential full-screen animation queue
│   ├── useAudioSystem.ts      # BGM playback management
│   ├── useDimensionAdvisor.ts # Per-dimension AI advisor
│   └── useWorldPatch.ts       # Daily world patch fetching
│
├── services/                  # API & external service integrations
│   ├── agent.ts               # OpenClaw agent calls
│   ├── glm.ts                 # ZhipuAI GLM API (sync + streaming)
│   ├── planGenerator.ts       # AI scheme generation (Goals/Plans/Tasks)
│   ├── hierarchyEditor.ts     # AI-powered hierarchy node editing
│   ├── worldPatch.ts          # Real-world data → game modifiers
│   ├── shortcuts.ts           # Quick AI action shortcuts
│   ├── supabase.ts            # Supabase client setup
│   └── cloudSync.ts           # Cloud sync operations
│
├── display/
│   ├── assets.ts              # Asset paths registry
│   ├── pages/
│   │   ├── Dashboard.tsx      # Main game dashboard
│   │   ├── DimensionDetail.tsx # Dimension deep-dive + hierarchy tree
│   │   ├── Onboarding.tsx     # Initial assessment flow
│   │   └── PlanSelection.tsx  # AI-generated plan picker
│   │
│   └── components/
│       ├── HierarchyTree.tsx       # Interactive goal tree with selection
│       ├── HierarchyEditDialog.tsx # AI edit dialog with streaming
│       ├── ChatPanel.tsx           # Oracle terminal chat UI
│       ├── DimensionCard.tsx       # Dimension stat card
│       ├── QuestPanel.tsx          # Daily quest list
│       ├── WorldPatchBanner.tsx    # Daily world update display
│       ├── LevelUpEffect.tsx       # Full-screen level up animation
│       ├── UnlockReveal.tsx        # Dimension unlock animation
│       ├── HpWarningEffect.tsx     # Low-stat warning effect
│       ├── NotificationBanner.tsx  # Toast notifications
│       └── ui/                     # Reusable UI primitives
│           ├── OracleOrb.tsx
│           ├── MarkdownContent.tsx
│           ├── StatBar.tsx
│           ├── GeometricPanel.tsx
│           ├── AudioToggle.tsx
│           └── ...
│
└── demo/                      # Demo/recording utilities
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   React UI                       │
│  Dashboard · DimensionDetail · Onboarding       │
├─────────────────────────────────────────────────┤
│              Hooks (State Layer)                  │
│  useGameState · useChatSystem · useAnimationQueue│
├─────────────────────────────────────────────────┤
│             Services (API Layer)                  │
│  agent · planGenerator · worldPatch · glm        │
├─────────────────────────────────────────────────┤
│          Core (Pure Logic Layer)                  │
│  hierarchy · scoring                             │
├─────────────────────────────────────────────────┤
│           External Services                      │
│  OpenClaw Gateway · ZhipuAI · Supabase          │
└─────────────────────────────────────────────────┘
```

## Game Mechanics

- **EXP & Levels**: Complete actions to earn EXP. Each dimension levels independently (1-99).
- **Streaks**: Consecutive daily activity multiplies EXP gains.
- **World Modifiers**: Real weather/news data affects EXP rates (e.g., sunny day = +20% Physical EXP).
- **Unlock System**: Dimensions unlock progressively as you level up.
- **AI Coaching**: Oracle adapts its advice based on your current stats, streaks, and goals.

## License

MIT
