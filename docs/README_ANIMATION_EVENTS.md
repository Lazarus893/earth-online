# Animation Event System Documentation

This directory contains comprehensive documentation of the animation event system used in Earth Online.

## 📚 Document Guide

### 1. **ANIMATION_EVENT_SYSTEM.md** ⭐ START HERE
The main deep-dive document covering:
- Event structure and queueing mechanism
- How `useGameState.ts` generates and flushes events
- How `App.tsx` renders and consumes animations
- Z-index hierarchy and layering
- Complete timing analysis with real examples
- Potential issues and limitations

**Best for**: Understanding the full architecture, debugging issues, extending the system

### 2. **EVENT_FLOW_DIAGRAM.md** 📊 VISUAL REFERENCE
Visual ASCII diagrams showing:
- Event queue architecture (ref → state → render)
- Complete event lifecycle from trigger to completion
- Simultaneity and layering model
- Event generation triggers
- Queue processing timeline with concrete example
- State machine for queue progression
- Component mount/unmount cycle

**Best for**: Visual learners, understanding data flow, explaining to others

### 3. **QUICK_REFERENCE.md** ⚡ FOR QUICK LOOKUP
Quick facts and code snippets:
- TL;DR summary
- Quick facts table
- Key code snippets (generation, consumption, rendering, ending)
- Event flow in plain English
- 5 real-world scenarios with timelines
- Current implementation status
- Ideas for extending the system

**Best for**: Quick lookups, copy-paste code examples, "how do I do X?"

---

## 🎯 Quick Answers

### "How do multiple level-ups work?"
See **QUICK_REFERENCE.md → Scenario 2: Double Level-Up**

The system generates multiple events in a loop, then plays them sequentially. Each animation is ~2.5 seconds, so 2 level-ups = ~5 seconds total.

### "Can animations play at the same time?"
See **ANIMATION_EVENT_SYSTEM.md → Section 3.2: Can Multiple Animations Fire Simultaneously?**

**YES** for independent animations (notifications, warnings) — they use separate state variables and z-index layering.

**NO** for queue-based animations (level-up, unlock) — they share the same `currentEvent` state, so only one can show at a time.

### "Where does the event queue live?"
See **QUICK_REFERENCE.md → Code Snippets → Section 1**

Events are accumulated in `eventQueueRef` (a useRef) in `useGameState.ts`, then flushed into `pendingEvents` state. The first event is always `pendingEvents[0]`.

### "How does an animation end?"
See **QUICK_REFERENCE.md → Code Snippets → Section 4**

Video `onEnded` fires → calls `onComplete()` → calls `consumeEvent()` → removes first event from queue with `slice(1)`.

### "What if an animation never ends?"
See **ANIMATION_EVENT_SYSTEM.md → Section 4.3: Potential Issues**

Currently: The queue stalls (no timeout protection). The system has `onError` fallback for videos, but if something else fails, there's no safety net.

Proposed solution: See **QUICK_REFERENCE.md → If You Need to Extend This System → Add Queue Timeout Protection**

---

## 🔍 Architecture Summary

```
Game Mechanics (completeQuest, addExp)
         ↓
eventQueueRef (accumulate events in useRef)
         ↓
setPendingEvents (flush to React state)
         ↓
currentEvent = pendingEvents[0]
         ↓
App.tsx renders animation components
         ↓
Animation plays video + framer-motion sequences
         ↓
onEnded → consumeEvent() → slice(1)
         ↓
Next event (or null if queue empty)
```

**Z-Index Layers:**
- z-[60]: LevelUpEffect, UnlockReveal (queue-based, one at a time)
- z-[55]: NotificationBanner (independent state, auto-dismisses)
- z-[54]: HpWarningEffect (independent state)
- z-40: Dashboard UI

---

## 🚀 Key Insights

1. **Two-phase queue system**: useRef accumulates → useState flushes
   - Prevents rapid batching issues
   - All events from one `addExp` call processed together

2. **FIFO consumption pattern**: `slice(1)` is simple and effective
   - Remove first event after animation ends
   - Next event automatically becomes `currentEvent`

3. **Independent animations decouple from queue**:
   - Notifications and warnings use separate state
   - Don't block the event queue
   - Can layer on top without conflict

4. **Animation timing is hardcoded**:
   - ~2.5 seconds per video
   - Framer-motion sequences add 0.3-0.6s
   - Multiple events = sequential playback (N × 2.5s)

---

## ⚠️ Known Limitations

| Issue | Impact | Solution |
|-------|--------|----------|
| No queue timeout | Queue can stall if onComplete doesn't fire | Add `setTimeout` safety check |
| No event priority | All events treated equally | Add priority field to events |
| No queue monitoring | Hard to debug stuck queues | Add dev-mode logging |
| Rapid calls race | Multiple addExp in same batch only last one processed | Use batching or debounce |
| No event batching | 3 level-ups = 7.5 seconds of animations | Consider combining events |
| Inconsistent patterns | Queue-based vs state-based feels different | Migrate all to same pattern |

---

## 📝 Implementation Checklist

If you're implementing something similar elsewhere:

- [ ] Create event interface with type + data fields
- [ ] Use useRef to accumulate events (avoid React batching issues)
- [ ] Flush ref to state at end of calculation
- [ ] Expose `currentEvent = events[0]` and `consumeEvent = slice(1)`
- [ ] Render animation components conditionally on currentEvent.type
- [ ] Wire animation onComplete → consumeEvent
- [ ] Add onError fallback for video failures
- [ ] Consider z-index layering for simultaneous animations
- [ ] Add timeout protection (optional but recommended)
- [ ] Document animation timing expectations

---

## 🔗 Related Files

**Source Code:**
- `src/hooks/useGameState.ts` — Event generation and queue
- `src/App.tsx` — Animation rendering and consumption
- `src/display/components/LevelUpEffect.tsx` — Level-up animation
- `src/display/components/UnlockReveal.tsx` — Unlock animation
- `src/display/components/NotificationBanner.tsx` — Notification animation
- `src/display/components/HpWarningEffect.tsx` — Warning animation

**Configuration:**
- `config/game-balance.json` — EXP curves, multipliers
- `config/unlock-rules.json` — Unlock conditions

---

## 📖 How to Use This Documentation

**If you have 5 minutes:**
→ Read **QUICK_REFERENCE.md** TL;DR + one scenario

**If you have 15 minutes:**
→ Read **EVENT_FLOW_DIAGRAM.md** for visual overview + **QUICK_REFERENCE.md** code snippets

**If you have 30+ minutes:**
→ Read **ANIMATION_EVENT_SYSTEM.md** in full, refer to diagrams as needed

**If you're debugging:**
→ Check **ANIMATION_EVENT_SYSTEM.md** Section 4.3 (Potential Issues) + **QUICK_REFERENCE.md** Current Implementation Status

**If you're extending:**
→ See **QUICK_REFERENCE.md** "If You Need to Extend This System" section

---

## ✅ Verified Behaviors

- ✅ Single level-up: ~2.5 seconds animation
- ✅ Multiple level-ups: Sequential, ~2.5s each
- ✅ Level-up + Unlock: Sequential, total ~5-8.5s
- ✅ Level-up + Notification: Independent, layered, both visible
- ✅ Notification + Warning: Independent, layered, both visible
- ✅ Triple stack (all three): All visible simultaneously
- ✅ onError fallback: Video failures handled gracefully
- ✅ Queue clears properly: No orphaned events after animations

---

Generated: 2026-05-17
Last Updated: See document headers for individual file dates
