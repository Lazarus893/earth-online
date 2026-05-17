# Animation Event System - Code Reference

Quick index of important code locations and snippets.

## File Locations

```
useGameState.ts
├─ Line 77-83      GameEvent interface definition
├─ Line 225        pendingEvents state initialization
├─ Line 226        eventQueueRef definition
├─ Line 265-315    addExp() method (event generation + queue flush)
├─ Line 236-262    checkUnlocks() method (unlock event generation)
├─ Line 360-363    consumeEvent() callback
└─ Line 392        currentEvent computed property

App.tsx
├─ Line 82         notification state
├─ Line 88         hpWarning state
├─ Line 239        currentEvent read from hook
├─ Line 325-341    LevelUpEffect & UnlockReveal rendering
├─ Line 344-348    HpWarningEffect rendering
└─ Line 351-358    NotificationBanner rendering

LevelUpEffect.tsx
├─ Line 33-41      Video element with onEnded callback
├─ Line 43-66      Animation sequences (text, number, line)
└─ Line 39-40      onComplete both onEnded and onError

UnlockReveal.tsx
├─ Line 31-39      Video element with onEnded callback
├─ Line 42-66      Animation sequences (text, dimension key, line)
└─ Line 37-38      onComplete both onEnded and onError

NotificationBanner.tsx
├─ Line 27         videoPlaying state
├─ Line 36-41      Auto-dismiss useEffect
├─ Line 56-65      Video element (with onPlay instead of onEnded)
└─ Line 68-89      Framer motion animations

HpWarningEffect.tsx
├─ Line 29         Video with mix-blend-screen
├─ Line 40-44      Red border flash animation
├─ Line 47-63      Warning text animation
└─ Line 35-36      onComplete both onEnded and onError
```

---

## Key Code Snippets

### GameEvent Interface
```typescript
// File: src/hooks/useGameState.ts, Lines 77-83
export interface GameEvent {
  type: 'level-up' | 'unlock'
  dimensionKey: DimensionKey
  newLevel?: number
  dimensionLabel?: string
  dimensionColor?: string
}
```

### Queue State Setup
```typescript
// File: src/hooks/useGameState.ts, Lines 225-226
const [pendingEvents, setPendingEvents] = useState<GameEvent[]>([])
const eventQueueRef = useRef<GameEvent[]>([])
```

### Event Generation (Level-Up)
```typescript
// File: src/hooks/useGameState.ts, Lines 278-289
while (newExp >= newExpMax) {
  newExp -= newExpMax
  newLevel++
  newExpMax = expForLevel(newLevel)
  eventQueueRef.current.push({
    type: 'level-up',
    dimensionKey: dim.key,
    newLevel,
    dimensionColor: dim.color,
  })
}
```

### Event Generation (Unlock)
```typescript
// File: src/hooks/useGameState.ts, Lines 248-255
if (met) {
  changed = true
  eventQueueRef.current.push({
    type: 'unlock',
    dimensionKey: dim.key,
    dimensionLabel: dim.label,
    dimensionColor: dim.color,
  })
  return { ...dim, locked: false, level: 1, exp: 0, expMax: expForLevel(1), score: 30 }
}
```

### Queue Flush
```typescript
// File: src/hooks/useGameState.ts, Lines 307-310
if (eventQueueRef.current.length > 0) {
  setPendingEvents([...eventQueueRef.current])
  eventQueueRef.current = []
}
```

### Event Consumption
```typescript
// File: src/hooks/useGameState.ts, Lines 361-363
const consumeEvent = useCallback(() => {
  setPendingEvents(prev => prev.slice(1))
}, [])
```

### Current Event Access
```typescript
// File: src/hooks/useGameState.ts, Line 392
const currentEvent = pendingEvents[0] ?? null
```

### Animation Rendering in App
```typescript
// File: src/App.tsx, Lines 327-341
<LevelUpEffect
  show={currentEvent?.type === 'level-up'}
  newLevel={currentEvent?.newLevel ?? 0}
  dimensionColor={currentEvent?.dimensionColor}
  onComplete={game.consumeEvent}
/>

<UnlockReveal
  show={currentEvent?.type === 'unlock'}
  dimensionKey={currentEvent?.dimensionKey ?? 'social'}
  dimensionLabel={currentEvent?.dimensionLabel ?? ''}
  dimensionColor={currentEvent?.dimensionColor ?? ''}
  onComplete={game.consumeEvent}
/>
```

### Video End Handler
```typescript
// File: src/display/components/LevelUpEffect.tsx, Lines 33-41
<video
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[50vw] max-h-[80vh] object-contain"
  src={assets.effects.levelUp}
  autoPlay
  playsInline
  preload="metadata"
  onEnded={onComplete}
  onError={onComplete}
/>
```

### Animation Sequence Example
```typescript
// File: src/display/components/LevelUpEffect.tsx, Lines 43-66
<motion.div
  className="relative flex flex-col items-center gap-2"
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
>
  <HudText variant="system" color={colors.exp}>LEVEL UP</HudText>
  <motion.div
    className="text-7xl font-bold font-mono"
    style={{ color, textShadow: `0 0 30px ${color}88, 0 0 60px ${color}44` }}
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ duration: 0.8, delay: 0.5 }}
  >
    {newLevel}
  </motion.div>
  <motion.div
    className="h-[1px] w-32"
    style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    initial={{ scaleX: 0 }}
    animate={{ scaleX: 1 }}
    transition={{ delay: 0.6, duration: 0.4 }}
  />
</motion.div>
```

### Independent Animation (Notification)
```typescript
// File: src/display/components/NotificationBanner.tsx, Lines 36-41
useEffect(() => {
  if (show && autoDismissMs > 0) {
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }
}, [show, autoDismissMs, onDismiss])
```

### Z-Index Layers
```typescript
// File: src/App.tsx, Lines 324-358
// z-[60] - LevelUpEffect
<LevelUpEffect ... />

// z-[60] - UnlockReveal
<UnlockReveal ... />

// z-[55] - NotificationBanner
<NotificationBanner ... />

// z-[54] - HpWarningEffect
<HpWarningEffect ... />
```

---

## Data Flow Trace

### Step 1: Quest Completion
**File:** `src/App.tsx`
```typescript
// Line 227-236
const handleQuestComplete = useCallback((questId: string) => {
  const quest = game.quests.find(q => q.id === questId)
  if (!quest || quest.done) return
  game.completeQuest(questId)  // ← Triggers chain
  setNotification(...)
}, [game])
```

### Step 2: Add Experience
**File:** `src/hooks/useGameState.ts`
```typescript
// Line 318-357
const completeQuest = useCallback((questId: string) => {
  // ... update streak ...
  setTimeout(() => addExp(quest.dimension, quest.exp), 0)  // ← Async call
}, [...])
```

### Step 3: Event Generation & Queueing
**File:** `src/hooks/useGameState.ts`
```typescript
// Line 265-315
const addExp = useCallback((dimensionKey: DimensionKey, amount: number) => {
  setDimensions(prev => {
    // ... accumulate events in eventQueueRef ...
    if (eventQueueRef.current.length > 0) {
      setPendingEvents([...eventQueueRef.current])  // ← Flush to state
      eventQueueRef.current = []
    }
    return dims
  })
}, [...])
```

### Step 4: Animation Rendering
**File:** `src/App.tsx`
```typescript
// Line 239, 327-341
const currentEvent = game.currentEvent

<LevelUpEffect
  show={currentEvent?.type === 'level-up'}
  onComplete={game.consumeEvent}
/>
```

### Step 5: Animation Completion
**File:** `src/display/components/LevelUpEffect.tsx`
```typescript
// Line 39
onEnded={onComplete}  // → game.consumeEvent() in App
```

### Step 6: Queue Advance
**File:** `src/hooks/useGameState.ts`
```typescript
// Line 361-363
const consumeEvent = useCallback(() => {
  setPendingEvents(prev => prev.slice(1))  // ← Next event becomes current
}, [])
```

**Back to Step 4** if more events exist, otherwise animation stops.

---

## Search Patterns

To find references to:

**Event queue logic:**
```bash
grep -n "eventQueueRef\|pendingEvents" src/hooks/useGameState.ts
```

**Animation rendering:**
```bash
grep -n "currentEvent\|LevelUpEffect\|UnlockReveal" src/App.tsx
```

**Animation completion:**
```bash
grep -n "onEnded\|onComplete" src/display/components/*.tsx
```

**Z-index definitions:**
```bash
grep -n "z-\[5" src/display/components/*.tsx
```

**Independent state:**
```bash
grep -n "notification\|hpWarning" src/App.tsx
```

---

## State Tree

```
App Component State
├─ currentView: 'onboarding' | 'plan-selection' | 'dashboard' | 'dimension'
├─ notification: { message, sub, type } | null
├─ hpWarning: boolean
├─ chatOpen: boolean
├─ transitioning: boolean
└─ selectedDimension: DimensionKey | null

useGameState Hook
├─ dimensions: DimensionData[]
├─ quests: Quest[]
├─ streak: number
├─ onboardingDone: boolean
├─ playerLevel: number
├─ playerExp: number
├─ playerExpMax: number
├─ currentEvent: GameEvent | null    ← Primary animation driver
├─ pendingEvents: GameEvent[]        ← Queue state
├─ eventQueueRef: GameEvent[]        ← Accumulator (useRef, not reactive)
├─ consumeEvent: () => void
├─ completeQuest: (questId) => void
├─ addExp: (dimensionKey, amount) => void
└─ completeOnboarding: (scores) => void
```

---

## Performance Notes

- **Queue processing**: O(1) for consume (slice creates new array, but only removes first)
- **Event generation**: O(n) where n = number of levels gained
- **Render performance**: Conditional rendering via `show` prop reduces DOM nodes
- **Animation frames**: Framer Motion handles 60fps internally; video playback is separate

---

## Testing Checklist

- [ ] Single level-up: Animation plays, completes, queue empty
- [ ] Multiple level-ups: Sequential animations, proper timing
- [ ] Level-up + Unlock: Queue transitions correctly
- [ ] Notification + Level-up: Independent animations visible together
- [ ] Notification + Warning: Both visible, z-index correct
- [ ] Triple stack: All three visible, proper layering
- [ ] onError fallback: Video failure triggers next animation
- [ ] Rapid addExp calls: Events don't drop (check if batched correctly)

---

Generated: 2026-05-17
References: Verified against source code commits up to 2026-05-17
