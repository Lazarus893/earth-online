# System Architecture - Earth Online

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Dashboard │  │Onboarding│  │ Timeline │  │  Patch   │       │
│  │   Page   │  │  Flow    │  │   View   │  │  Notes   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       └──────────────┴──────────────┴──────────────┘             │
│                           │                                       │
├───────────────────────────┼───────────────────────────────────────┤
│                    LOGIC LAYER                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                   Hierarchy Engine                          │   │
│  │  Status ← Goals ← Plans ← Tasks ← Actions                │   │
│  └─────────────────────────┬─────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────┐  ┌──────────┼──────────┐  ┌──────────────────┐   │
│  │Progression│  │  State   │  Machine  │  │   World Patch    │   │
│  │  System  │  │          │           │  │     Engine       │   │
│  └──────────┘  └──────────┴──────────┘  └──────────────────┘   │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │User State│  │World State│  │  History │  │ Artifacts│       │
│  │  (JSON)  │  │  (Cache) │  │(Snapshots)│  │ (Files)  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│                    EXTERNAL LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Weather  │  │ Economy  │  │   News   │  │  Notion  │       │
│  │   API    │  │   Data   │  │   Feed   │  │   MCP    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Onboarding Flow
```
User Input (Psychology Questions)
  → GLM Analysis (Sentiment + Dimension Scoring)
    → Initial State Generation
      → First Goals Recommendation
        → Plan Generation
          → Task Queue Creation
```

### 2. Daily Loop
```
Morning:
  World Patch Check → Generate Patch Note → Adjust Task Priorities
  → Present Today's Tasks → User Confirms/Adjusts

During Day:
  User Completes Actions → Record → Calculate EXP → Check Level Up
  → Check Unlock Conditions → Update State

Evening:
  Daily Summary → Snapshot State → Archive Artifacts
  → Generate Tomorrow's Preview
```

### 3. World Patch Flow
```
External APIs → Data Collection → Patch Analysis
  → Impact Assessment (which dimensions affected?)
    → Modifier Calculation
      → State Adjustment
        → User Notification (Patch Note)
```

## Context Chain (上下文链)

核心设计原则：每一层的决策都必须能追溯到上一层的依据

```
STATUS: Physical Score = 45/100
  ↓ derives
GOAL: "提升基础体能到 60 分" (因为 Physical 偏低)
  ↓ derives  
PLAN: "4周基础体能训练计划" (因为目标是提升15分)
  ↓ derives
TASK: "周一: 30分钟有氧 + 15分钟拉伸" (因为计划要求每周3次)
  ↓ derives
ACTION: 
  - AI: 生成今日训练视频推荐列表
  - Human: 去健身房完成训练并打卡

WORLD PATCH IMPACT:
  如果天气 Patch 显示暴雨 → Task 自动调整为室内训练
  Context: STATUS(Physical低) → GOAL(提升体能) → PLAN(4周训练) 
           → TASK(原:户外跑步) → PATCH(暴雨) → TASK(改:室内HIIT)
```

## State Persistence Strategy

```
Write Path:
  Action Complete → Calculate Changes → Update Memory Cache
    → Debounced Write to JSON (500ms) → Snapshot if significant change

Read Path:
  Request State → Check Memory Cache → Cache Hit? Return
    → Cache Miss? Read JSON → Populate Cache → Return

Recovery:
  App Start → Read all JSON state files → Populate cache
  → Validate integrity → Apply any pending patches
```
