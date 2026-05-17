# Animation Event System - Flow Diagrams

## 1. Event Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Mechanics                        │
│  • completeQuest → addExp('career', 20)                     │
│  • Multiple level-ups trigger in loop                        │
│  • Unlock conditions checked                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              useGameState Hook (useRef phase)                │
│                                                              │
│  eventQueueRef.current = []  (accumulator)                  │
│                                                              │
│  Loop: while (exp >= expMax)                                │
│    → eventQueueRef.current.push({                           │
│        type: 'level-up',                                    │
│        newLevel,                                            │
│        dimensionColor                                       │
│      })                                                      │
│                                                              │
│  checkUnlocks() → more events pushed to ref                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ setPendingEvents([...eventQueueRef.current])
┌─────────────────────────────────────────────────────────────┐
│          useGameState Hook (useState phase)                  │
│                                                              │
│  pendingEvents = [                                          │
│    { type: 'level-up', newLevel: 2, ... },                 │
│    { type: 'level-up', newLevel: 3, ... },                 │
│    { type: 'unlock', dimensionKey: 'social', ... }         │
│  ]                                                          │
│                                                              │
│  currentEvent = pendingEvents[0]  (FIFO)                   │
│  consumeEvent = () => setPendingEvents(prev => prev.slice(1))
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ currentEvent changes
┌─────────────────────────────────────────────────────────────┐
│                  App.tsx Render                              │
│                                                              │
│  currentEvent = {                                           │
│    type: 'level-up',                                        │
│    newLevel: 2,                                             │
│    dimensionColor: '#FF6B35'                               │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
         │                          │                    │
         │                          │                    │
         ▼                          ▼                    ▼
    ┌────────────────┐    ┌──────────────────┐  ┌──────────────────┐
    │ LevelUpEffect  │    │  UnlockReveal    │  │ HpWarningEffect  │
    │ show={true}    │    │  show={false}    │  │ show={false}     │
    │ z-[60]         │    │  z-[60]          │  │ z-[54]           │
    │                │    │                  │  │                  │
    │ ↓ Video plays  │    │ ↓ Hidden         │  │ ↓ Hidden         │
    │ ↓ 2.5 seconds  │    │                  │  │                  │
    │ ↓ onEnded fires│    │                  │  │                  │
    │ → consumeEvent()    │                  │  │                  │
    └────────────────┘    └──────────────────┘  └──────────────────┘
         │
         ▼ consumeEvent() called
    pendingEvents.slice(1)
         │
         ▼ State updates
    currentEvent = {
      type: 'level-up',
      newLevel: 3,
      dimensionColor: '#FF6B35'
    }
         │
         ▼ Re-render
    LevelUpEffect shows NEW level (3)
    │
    ▼ 2.5 seconds later, onEnded again...
    (repeat until queue empty)
```

---

## 2. Complete Event Lifecycle

```
START
  │
  ├─ User Action: completeQuest('quest-1')
  │
  ├─ Game State Update: addExp('career', 100)
  │    │
  │    ├─ [REF PHASE] Accumulate events in eventQueueRef
  │    │    ├─ Loop through exp: 100 >= 100 (first level-up)
  │    │    │  └─ push { type: 'level-up', newLevel: 2 }
  │    │    │
  │    │    └─ Check unlocks
  │    │       └─ (no unlocks triggered)
  │    │
  │    ├─ [STATE PHASE] Flush ref to state
  │    │    └─ setPendingEvents([{ type: 'level-up', newLevel: 2 }])
  │    │
  │    └─ eventQueueRef = [] (clear ref)
  │
  ├─ [RENDER PHASE] currentEvent = { type: 'level-up', newLevel: 2 }
  │
  ├─ [COMPONENT PHASE] LevelUpEffect mounts and animates
  │    │
  │    ├─ t=0.0s: AnimatePresence animates opacity 0→1
  │    ├─ t=0.0s: video autoPlay
  │    ├─ t=0.3s: "LEVEL UP" text animates in
  │    ├─ t=0.5s: Level number animates
  │    ├─ t=0.6s: Horizontal line animates
  │    │
  │    └─ t=2.5s: video onEnded event fires
  │         │
  │         └─ onEnded={onComplete} → onComplete()
  │              │
  │              └─ consumeEvent() called
  │
  ├─ [QUEUE UPDATE PHASE] consumeEvent() executes
  │    │
  │    └─ setPendingEvents(prev => prev.slice(1))
  │         │
  │         └─ pendingEvents now = [] (empty)
  │
  ├─ [RENDER PHASE] currentEvent = null
  │
  ├─ [COMPONENT PHASE] LevelUpEffect unmounts
  │    │
  │    └─ AnimatePresence triggers exit animation
  │
  └─ END (queue empty, back to normal state)

NEXT EVENT (if queue had 2+ events):
  ├─ After consumeEvent(), pendingEvents was [event2]
  ├─ currentEvent = event2
  ├─ LevelUpEffect re-mounts with new event
  ├─ Animation plays again
  └─ ... (repeat)
```

---

## 3. Simultaneity & Layering

```
┌───────────────────────────────────────────────────────────────────────┐
│                          App.tsx Render                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ z-[60] ┌─────────────────────────────────────────────────────────┐   │
│        │ LevelUpEffect or UnlockReveal (Queue-Based, Mutually    │   │
│        │ Exclusive)                                               │   │
│        │                                                          │   │
│        │ show = (currentEvent?.type === 'level-up') OR            │   │
│        │         (currentEvent?.type === 'unlock')                │   │
│        │                                                          │   │
│        │ → Can't be true for both at same time (same state)      │   │
│        └─────────────────────────────────────────────────────────┘   │
│                                                                        │
│ z-[55] ┌─────────────────────────────────────────────────────────┐   │
│        │ NotificationBanner (State-Based, Independent)           │   │
│        │                                                          │   │
│        │ show = !!notification                                    │   │
│        │                                                          │   │
│        │ Can be true WHILE z-[60] is animating                  │   │
│        │ Auto-dismisses after 4000ms                             │   │
│        └─────────────────────────────────────────────────────────┘   │
│                                                                        │
│ z-[54] ┌─────────────────────────────────────────────────────────┐   │
│        │ HpWarningEffect (State-Based, Independent)              │   │
│        │                                                          │   │
│        │ show = hpWarning                                         │   │
│        │                                                          │   │
│        │ Can be true WHILE both z-[55] and z-[60] are active    │   │
│        └─────────────────────────────────────────────────────────┘   │
│                                                                        │
│ z-40s  │ Dashboard / Main UI                                     │   │
│        └─────────────────────────────────────────────────────────┘   │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘

EXAMPLE SCENARIO AT t=1.5s:
  • LevelUpEffect playing (z-[60]) → 1 second into animation
  • NotificationBanner visible (z-[55]) → slides in with text
  • HpWarningEffect playing (z-[54]) → red border flashing
  • Dashboard behind everything
  
Result: All three animations visible simultaneously (stacked by z-index)
```

---

## 4. Event Generation Triggers

```
┌──────────────────────────────────┐
│   Two Event Generation Points     │
└──────────────────────────────────┘
        │
        ├─ Trigger 1: completeQuest(questId)
        │    │
        │    ├─ Mark quest done
        │    └─ Call addExp(dimension, questExp)
        │        │
        │        ├─ [Ref phase] Accumulate level-up events
        │        │
        │        └─ [Ref phase] Call checkUnlocks()
        │             │
        │             └─ Generate unlock events
        │
        └─ Trigger 2: addExp(dimensionKey, amount)
             │
             ├─ Apply streak multiplier
             │
             ├─ [Ref phase] Loop: while (exp >= expMax)
             │    └─ Generate level-up events
             │
             ├─ [Ref phase] Call checkUnlocks()
             │    └─ Generate unlock events
             │
             └─ [State phase] Flush ref to state

Multiple calls to addExp in quick succession:
  addExp('career', 100)   ─┐
  addExp('career', 100)   ─┼─ Each updates state independently
  addExp('career', 100)   ─┘
  
  Problem: Last one "wins" if they execute in same batch
  Solution: Events are still queued correctly within addExp,
            but multiple rapid calls might race
```

---

## 5. Queue Processing Timeline

```
User gains 250 EXP (level 1, exp 0)
  ↓
addExp('career', 250)
  ├─ newExp = 0 + 250 = 250
  ├─ newLevel = 1
  │
  ├─ WHILE LOOP - Iteration 1:
  │  ├─ 250 >= 100 ✓
  │  ├─ newExp = 250 - 100 = 150
  │  ├─ newLevel = 2
  │  └─ eventQueueRef.push({ type: 'level-up', newLevel: 2 })
  │
  ├─ WHILE LOOP - Iteration 2:
  │  ├─ 150 >= 115 ✓ (115 = expForLevel(2))
  │  ├─ newExp = 150 - 115 = 35
  │  ├─ newLevel = 3
  │  └─ eventQueueRef.push({ type: 'level-up', newLevel: 3 })
  │
  ├─ WHILE LOOP - Iteration 3:
  │  ├─ 35 >= 132 ✗ (132 = expForLevel(3))
  │  └─ Exit loop
  │
  ├─ checkUnlocks()
  │  └─ (no unlocks triggered)
  │
  └─ setPendingEvents([
       { type: 'level-up', newLevel: 2 },
       { type: 'level-up', newLevel: 3 }
     ])

Timeline on screen:
  t=0.0s     currentEvent = { type: 'level-up', newLevel: 2 }
  t=0.0s     LevelUpEffect renders with "LEVEL UP 2"
  t=0.0s     Video starts playing
  
  t=2.5s     Video ends → onEnded fires
  t=2.5s     consumeEvent() → pendingEvents.slice(1)
  t=2.5s     currentEvent = { type: 'level-up', newLevel: 3 }
  t=2.5s     LevelUpEffect re-renders with "LEVEL UP 3"
  t=2.5s     NEW video starts playing
  
  t=5.0s     Video ends → onEnded fires
  t=5.0s     consumeEvent() → pendingEvents.slice(1)
  t=5.0s     currentEvent = null
  t=5.0s     LevelUpEffect hidden
  
  Total animation time: ~5 seconds for 2 level-ups
```

---

## 6. Event Queue State Machine

```
                    ┌─────────────────────┐
                    │  Queue Empty        │
                    │ currentEvent = null │
                    │ No animations       │
                    └──────────┬──────────┘
                               │
                      (addExp triggers events)
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Queue: [Event1]    │
                    │ currentEvent = E1   │
                    │ Animation 1 plays   │
                    │ (2.5 seconds)       │
                    └──────────┬──────────┘
                               │
                      (onComplete fires after video)
                               │
                      (consumeEvent called)
                               │
                      (If more events existed)
                               ▼
                    ┌─────────────────────┐
                    │  Queue: [Event2]    │
                    │ currentEvent = E2   │
                    │ Animation 2 plays   │
                    │ (2.5 seconds)       │
                    └──────────┬──────────┘
                               │
                      (onComplete fires after video)
                               │
                      (consumeEvent called)
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Queue Empty        │
                    │ currentEvent = null │
                    │ No animations       │
                    └─────────────────────┘
```

---

## 7. Component Mount/Unmount Cycle

```
                    Animation Shows
                         │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    Mount         Animation Play      Listen for End
    │             │                   │
    ├─ create     ├─ video autoPlay   ├─ onEnded handler
    │ ref         ├─ framer-motion    ├─ onError fallback
    │ component   │ sequences start   │
    │             │                   │
    ▼             ▼                   ▼
  Show with   Animations Run      Callback Fires
  opacity     ~2.5 seconds        consumeEvent()
  animation                            │
                                       ▼
                               Unmount Phase
                                       │
                         ┌─────────────┼──────────────┐
                         │             │              │
                         ▼             ▼              ▼
                    Exit Animation   Remove DOM   Check for
                    y: 0 → -100      from tree    next event
                    opacity: 1 → 0                     │
                                                       ▼
                                              If queue not empty:
                                                Re-enter cycle
                                              Else:
                                                Remain empty
```

