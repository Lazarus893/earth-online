# Animation Event System - Deep Dive Analysis

## Overview
The Earth Online project implements a **queue-based animation event system** for game mechanics like level-up, unlock, HP warnings, and notifications. This document explores how events are generated, queued, consumed, and rendered.

---

## 1. Event Generation and Queueing (`useGameState.ts`)

### 1.1 Event Structure
```typescript
export interface GameEvent {
  type: 'level-up' | 'unlock'
  dimensionKey: DimensionKey
  newLevel?: number
  dimensionLabel?: string
  dimensionColor?: string
}
```

### 1.2 Event Queue Implementation
- **Ref-based queue**: `eventQueueRef = useRef<GameEvent[]>([])`
- **State-based pending events**: `pendingEvents = useState<GameEvent[]>([])`
- **Current event**: `currentEvent = pendingEvents[0] ?? null`

**Key insight**: Events are accumulated in a ref (eventQueueRef), then flushed into state (pendingEvents) only when the state update completes. This prevents rapid event batching issues.

### 1.3 Event Queueing Flow

#### When adding experience (`addExp`):
1. Calculate actual exp with streak multiplier
2. Level-up loop: while newExp >= expMax:
   - Increment newLevel
   - **Push level-up event to eventQueueRef**
   - Calculate new expMax
3. Check unlock conditions → push unlock events to eventQueueRef
4. **After all calculations, flush eventQueueRef into pendingEvents state**

```typescript
// Lines 265-314 in useGameState.ts
while (newExp >= newExpMax) {
  newExp -= newExpMax
  newLevel++
  newExpMax = expForLevel(newLevel)
  eventQueueRef.current.push({  // ← Queue accumulation
    type: 'level-up',
    dimensionKey: dim.key,
    newLevel,
    dimensionColor: dim.color,
  })
}

// Check for unlocks
dims = checkUnlocks(dims)

// Flush the queue into state
if (eventQueueRef.current.length > 0) {
  setPendingEvents([...eventQueueRef.current])  // ← State update
  eventQueueRef.current = []
}
```

#### When unlocking dimensions (`checkUnlocks`):
1. For each locked dimension, check if unlock conditions are met
2. If met:
   - Push unlock event to eventQueueRef
   - Update dimension: locked=false, level=1, exp=0, score=30
3. Return updated dimensions

```typescript
// Lines 236-262
if (met) {
  changed = true
  eventQueueRef.current.push({  // ← Queue unlock
    type: 'unlock',
    dimensionKey: dim.key,
    dimensionLabel: dim.label,
    dimensionColor: dim.color,
  })
  return { ...dim, locked: false, level: 1, exp: 0, expMax: expForLevel(1), score: 30 }
}
```

### 1.4 Event Consumption
```typescript
// Lines 360-362
const consumeEvent = useCallback(() => {
  setPendingEvents(prev => prev.slice(1))  // ← Remove first event
}, [])
```

**Simple pattern**: Each animation component calls `consumeEvent()` when its animation ends. This removes the current event and exposes the next one.

---

## 2. Animation Component System (`App.tsx` & Components)

### 2.1 Event-Triggered Animation Layers
All animations are rendered in a fixed z-index stack:

```typescript
// Lines 324-358 in App.tsx
{/* 升级特效 - z-[60] */}
<LevelUpEffect
  show={currentEvent?.type === 'level-up'}
  newLevel={currentEvent?.newLevel ?? 0}
  dimensionColor={currentEvent?.dimensionColor}
  onComplete={game.consumeEvent}  // ← Trigger next event
/>

{/* 解锁特效 - z-[60] */}
<UnlockReveal
  show={currentEvent?.type === 'unlock'}
  dimensionKey={currentEvent?.dimensionKey ?? 'social'}
  dimensionLabel={currentEvent?.dimensionLabel ?? ''}
  dimensionColor={currentEvent?.dimensionColor ?? ''}
  onComplete={game.consumeEvent}  // ← Trigger next event
/>

{/* HP警告 - z-[54] */}
<HpWarningEffect
  show={hpWarning}
  message="DIMENSION STATUS LOW"
  onComplete={() => setHpWarning(false)}
/>

{/* 通知横幅 - z-[55] */}
<NotificationBanner
  show={!!notification}
  message={notification?.message ?? ''}
  subMessage={notification?.sub}
  type={notification?.type ?? 'info'}
  onDismiss={() => setNotification(null)}
  autoDismissMs={4000}
/>
```

### 2.2 Z-Index Hierarchy (Fixed Layering)
- **z-[60]**: LevelUpEffect, UnlockReveal (top priority animations)
- **z-[55]**: NotificationBanner
- **z-[54]**: HpWarningEffect (lowest priority)

### 2.3 Individual Animation Component Structure

#### LevelUpEffect (Lines 16-71 in LevelUpEffect.tsx)
```typescript
// 1. Show condition is independent
show={currentEvent?.type === 'level-up'}

// 2. Internal animation timeline
<video onEnded={onComplete} />     // Video ends first
  ↓
{/* "LEVEL UP" text - delay: 0.3s */}
<motion.div animate={{ scale: 1 }} transition={{ delay: 0.3 }} />
  ↓
{/* Level number - delay: 0.5s */}
<motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ delay: 0.5 }} />
  ↓
{/* Horizontal line - delay: 0.6s */}
<motion.div animate={{ scaleX: 1 }} transition={{ delay: 0.6 }} />

// 3. onComplete fires when video ends (via onEnded or onError)
```

#### UnlockReveal (Lines 18-71 in UnlockReveal.tsx)
```typescript
// Similar structure
<video onEnded={onComplete} />     // Video ends first
  ↓
{/* Unlock text - delay: 1.5s */}
<motion.div animate={{ opacity: 1 }} transition={{ delay: 1.5 }} />
  ↓
{/* Horizontal line - delay: 2.0s */}
<motion.div animate={{ scaleX: 1 }} transition={{ delay: 2.0 }} />

// onComplete fires when video ends
```

#### HpWarningEffect (Lines 16-68 in HpWarningEffect.tsx)
```typescript
// Independent of event queue - state-based
show={hpWarning}

<video onEnded={onComplete} />     // Video ends
  ↓
{/* Red border flash - duration: 1.5s */}
{/* Warning text - delay: 0.3s */}

// onComplete callback sets hpWarning=false
```

#### NotificationBanner (Lines 19-95 in NotificationBanner.tsx)
```typescript
// Independent of event queue - state-based
show={!!notification}

// No video - pure framer-motion
<motion.div animate={{ y: 0 }} />   // Slides in
  ↓
{/* Wait for video to play, then show text */}
{videoPlaying && (
  <motion.div animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
)}

// Auto-dismisses via timer
useEffect(() => {
  if (show && autoDismissMs > 0) {
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }
}, [show, autoDismissMs, onDismiss])
```

---

## 3. Timing and Sequencing Analysis

### 3.1 Animation Sequencing Model

**Queue-based (events):**
```
App loads
  ↓
User completes quest → game.addExp('career', 20)
  ↓
1 level-up event generated → pendingEvents = [LevelUpEvent]
  ↓
<LevelUpEffect show={true} onComplete={consumeEvent} />
  ↓ Video plays (let's say 2.5 seconds total)
LevelUpEffect video ends → onComplete called → consumeEvent()
  ↓
pendingEvents.slice(1) → now pendingEvents = []
  ↓
currentEvent = null
  ↓
<LevelUpEffect show={false} />  (unmounts)
  ↓
If another event was in queue, now shows
```

**Independent (state-based):**
```
setNotification({ message: '...' })
  ↓
<NotificationBanner show={true} />
  ↓ Slides in (0.4s), text appears (delay 0.5s from video start)
  ↓ Auto-dismisses after 4000ms
setNotification(null)
  ↓
<NotificationBanner show={false} />
```

### 3.2 Can Multiple Animations Fire Simultaneously?

**YES - but with caveats:**

#### Independent/State-based animations (CAN run together):
- `HpWarningEffect` (managed by `hpWarning` state)
- `NotificationBanner` (managed by `notification` state)
- These are **always rendered** and can play at the same time

Example sequence in App.tsx:
```typescript
// Demo mode sets notification AND hp warning
demoCtrl.contextValue.registerNotification((msg) => {
  setNotification(msg)
  if (msg.type === 'warning') {
    setHpWarning(true)  // ← Both can be true simultaneously
  }
})
```

#### Queue-based animations (CANNOT run together):
- `LevelUpEffect` (from event queue)
- `UnlockReveal` (from event queue)
- Only one can show at a time because they both check `currentEvent?.type`

```typescript
// These share the same currentEvent state
<LevelUpEffect show={currentEvent?.type === 'level-up'} />     // True OR
<UnlockReveal show={currentEvent?.type === 'unlock'} />        // True
// NOT both true simultaneously
```

### 3.3 Event Queue Timing Example

**Scenario: User gains 250 EXP in 'career' (level 1, exp 0)**
- Required EXP per level: 100, 115, 132, ...
- After 250 EXP: 2 level-ups

```typescript
// addExp calculation:
newExp = 0 + 250 = 250
newLevel = 1

// First loop iteration:
250 >= 100 → true
newExp = 250 - 100 = 150
newLevel = 2
eventQueueRef.current.push({ type: 'level-up', newLevel: 2 })

// Second loop iteration:
150 >= 115 → true
newExp = 150 - 115 = 35
newLevel = 3
eventQueueRef.current.push({ type: 'level-up', newLevel: 3 })

// Exit loop: 35 < 132

// Flush queue:
pendingEvents = [
  { type: 'level-up', newLevel: 2, ... },  // ← shows first
  { type: 'level-up', newLevel: 3, ... },  // ← queued, shows after
]

// Timeline:
t=0s:      LevelUpEffect shows (level 2)
t=2.5s:    Video ends → consumeEvent() → currentEvent becomes level 3
t=2.5s:    LevelUpEffect unmounts, remounts with level 3
t=2.5s:    New video plays (level 3)
t=5.0s:    Video ends → consumeEvent() → pendingEvents = []
t=5.0s:    LevelUpEffect hidden
```

---

## 4. Existing Queue/Sequencing Mechanisms

### 4.1 In the Codebase

| Mechanism | Location | Type | Notes |
|-----------|----------|------|-------|
| Event Queue (Ref) | useGameState.ts:226 | `useRef<GameEvent[]>` | Accumulates events during state update |
| Pending Events (State) | useGameState.ts:225 | `useState<GameEvent[]>` | Flushed from ref, drives animation |
| Current Event | useGameState.ts:392 | Computed: `pendingEvents[0]` | Always first event or null |
| Consume Pattern | useGameState.ts:361-363 | Function | `slice(1)` pattern for FIFO |
| Independent State | App.tsx:82, 88 | `useState` | `notification`, `hpWarning` |

### 4.2 Limitations of Current System

1. **No priority levels** — All events queue in order of generation
2. **No animation parallelization** — Queue-based events must be sequential
3. **No timeout protection** — If animation component never calls onComplete, queue stalls
4. **No batching** — Multiple events always play back-to-back
5. **Inconsistent sequencing** — LevelUpEffect/UnlockReveal vs NotificationBanner use different patterns

### 4.3 Potential Issues

```typescript
// Problem: If onComplete never fires (video fails silently)
<video src={badUrl} onEnded={onComplete} onError={onComplete} />

// The onError fallback exists, so this is handled...
// But if it's something else (e.g., video plays but never fires onEnded in some browsers)
// The queue can stall with orphaned events

// Problem: Rapid successive exp gains
game.addExp('career', 100)
game.addExp('career', 100)
game.addExp('career', 100)

// All three calls fire simultaneously, each event flushes its own ref
// Result: 3 separate pendingEvents updates, but only last one matters
// (they all update the same state, overwriting previous flushes)
```

---

## 5. Animation Stack Summary

### 5.1 Render Layers (z-index)
```
z-[60]  LevelUpEffect    (Fixed overlay, queue-based)
z-[60]  UnlockReveal     (Fixed overlay, queue-based)
z-[55]  NotificationBanner (Top notification, state-based)
z-[54]  HpWarningEffect  (Screen overlay, state-based)
z-40s   Dashboard/UI     (Below animations)
```

### 5.2 Control Flow
```
useGameState.ts
  ├─ Game mechanics trigger events
  ├─ eventQueueRef.current accumulates
  └─ setPendingEvents flushes on state update
       ↓
App.tsx
  ├─ Reads: currentEvent = pendingEvents[0]
  ├─ Renders based on currentEvent type
  └─ Animation onComplete calls consumeEvent()
       ↓
LevelUpEffect/UnlockReveal
  ├─ Video plays
  ├─ Framer motion sequences
  └─ onEnded → onComplete() → consumeEvent()
       ↓
pendingEvents.slice(1)
  └─ Next event becomes currentEvent if exists
```

---

## 6. Key Findings

### ✅ Working Well
1. **Queue pattern is simple and effective** — FIFO with easy consumption
2. **Fallback handling** — onError exists for video failures
3. **Independent animations decoupled** — Notifications/warnings don't block queue
4. **Spatial layout** — Multiple animations can overlap without collision

### ⚠️ Potential Improvements Needed
1. **Event batching** — If multiple level-ups occur, user sees 2-3 animations in a row
2. **Queue monitoring** — No visibility into queue state for debugging
3. **Animation priority** — No way to prioritize "important" events over others
4. **Sequencing clarity** — Mix of queue-based and state-based feels inconsistent
5. **Timing guarantees** — No timeout mechanism if onComplete doesn't fire

---

## 7. Example Sequences

### Sequence 1: Single Level-Up
```
1. User completes quest (+20 EXP)
2. addExp('career', 20)
3. LevelUpEvent pushed to eventQueueRef
4. eventQueueRef flushed → pendingEvents = [LevelUpEvent]
5. currentEvent = LevelUpEvent
6. LevelUpEffect visible
7. Video plays (2-2.5s)
8. onEnded fires → consumeEvent()
9. pendingEvents.slice(1) → [] (empty)
10. currentEvent = null
11. LevelUpEffect hidden
```

### Sequence 2: Double Level-Up + Unlock
```
1. User gains 280 EXP (needs 100 + 115 = 215 for 2 levels in fresh dimension)
2. addExp triggers:
   - Loop 1: 280 >= 100 → LevelUpEvent(2) pushed
   - Loop 2: 180 >= 115 → LevelUpEvent(3) pushed
   - checkUnlocks: dimension meets unlock conditions → UnlockEvent pushed
3. eventQueueRef = [LevelUpEvent(2), LevelUpEvent(3), UnlockEvent]
4. pendingEvents = [LevelUpEvent(2), LevelUpEvent(3), UnlockEvent]
5. Timeline:
   - t=0s:    LevelUpEffect(2) shows
   - t=2.5s:  consumeEvent() → pendingEvents = [LevelUpEvent(3), UnlockEvent]
   - t=2.5s:  LevelUpEffect(3) shows
   - t=5.0s:  consumeEvent() → pendingEvents = [UnlockEvent]
   - t=5.0s:  UnlockReveal shows
   - t=7.5s:  consumeEvent() → pendingEvents = []
   - t=7.5s:  UnlockReveal hidden
```

### Sequence 3: Level-Up + Notification (Independent)
```
1. Quest complete:
   - game.addExp() → LevelUpEvent queued
   - setNotification({ message: '...' })
2. Renders simultaneously:
   - LevelUpEffect(z-[60]) with video + animations
   - NotificationBanner(z-[55]) slides in at top
3. NotificationBanner auto-dismisses at 4s
4. LevelUpEffect continues playing
5. LevelUpEffect onEnded → consumeEvent()
6. Both eventually disappear independently
```

---

## Appendix: Component Animation Timelines

### LevelUpEffect Inner Timeline
```
t=0.0s  opacity: 0 → 1 (ease-out, 0.3s)
t=0.0s  video auto-plays
t=0.3s  LEVEL UP text scale 0.5→1 (0.5s)
t=0.5s  Level number scale 1→1.1→1 (0.8s)
t=0.6s  Horizontal line scaleX 0→1 (0.4s)
t=2.0s+ video continues playing
t=~2.5s video onEnded → onComplete()
```

### UnlockReveal Inner Timeline
```
t=0.0s  opacity: 0 → 1 (ease-out, 0.3s)
t=0.0s  video auto-plays
t=1.5s  DIMENSION UNLOCKED text opacity 0→1 (0.5s)
t=1.5s  Dimension key text appears
t=2.0s  Horizontal line scaleX 0→1 (0.5s)
t=~3.5s video onEnded → onComplete()
```

### NotificationBanner Inner Timeline
```
t=0.0s  slide in y: -100→0 (0.4s, ease-out)
t=0.4s  wait for video to play
t=0.5s  text opacity 0→1 (0.3s, after videoPlaying flag)
t=1.0s+ visible
t=4.0s  auto-dismiss timer fires
t=4.0s  exit animation y: 0→-100 (0.4s)
t=4.4s  onDismiss → show = false
```

