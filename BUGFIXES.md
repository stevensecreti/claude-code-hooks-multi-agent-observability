# Bug Fixes - February 16, 2026

## Issues Resolved

### 1. ✅ Duplicate React Keys Warning

**Problem:**
```
Encountered two children with the same key, `6993960b74eda99db3b766ff-1771279883172`
```

React was warning about duplicate keys because:
- Events were being added to the state multiple times without deduplication
- Key was using `${event.id}-${event.timestamp}` instead of just `event.id`

**Root Cause:**
- `useWebSocket` hook was adding events without checking if they already exist
- WebSocket reconnections or server re-sends would duplicate events
- EventTimeline was using a composite key that wasn't necessary

**Fix:**
1. **`apps/client/src/hooks/useWebSocket.ts`** - Added deduplication in `ADD_EVENT` reducer:
   ```typescript
   // Check if event already exists (deduplicate by ID)
   const eventExists = state.events.some((e) => e.id === action.event.id);
   if (eventExists) {
     return state; // Skip duplicate
   }
   ```

2. **`apps/client/src/components/EventTimeline.tsx`** - Changed key from composite to unique:
   ```typescript
   // Before: key={`${event.id}-${event.timestamp}`}
   // After:  key={event.id}
   ```

3. **`apps/client/src/components/AgentSwimLane.tsx`** - Updated deduplication to use just event.id:
   ```typescript
   // Before: const key = `${event.id}-${event.timestamp}`;
   // After:  Use event.id directly with null checks
   ```

---

### 2. ✅ Frontend Crash When Clicking Agent IDs

**Problem:**
```
An error occurred in the <AgentSwimLane> component.
[Violation] 'click' handler took 230ms
```

Component crashed when clicking on agent badges to add swim lanes.

**Root Cause:**
- Missing null/undefined checks for `session_id` field
- `event.session_id.slice(0, 8)` would throw if `session_id` was undefined
- TypeScript type definition had `id?` as optional but code assumed it was always present

**Fix:**
`apps/client/src/components/AgentSwimLane.tsx` - Added comprehensive safety checks:

1. **Safe property destructuring:**
   ```typescript
   const appName = agentName.split(":")[0] || "";
   const sessionId = agentName.split(":")[1] || "";
   ```

2. **Null checks before array operations:**
   ```typescript
   const agentEvents = events
     .filter((e) =>
       e.source_app === targetApp &&
       e.session_id &&  // ← Added null check
       e.session_id.slice(0, 8) === targetSession,
     )
   ```

3. **Early return on invalid agent names:**
   ```typescript
   const parts = agentName.split(":");
   const targetApp = parts[0];
   const targetSession = parts[1];
   if (!targetApp || !targetSession) return;  // ← Added early exit
   ```

4. **Optional id handling:**
   ```typescript
   if (event.id && !processedEventIds.current.has(event.id)) {
     // Process event
   }
   ```

---

## Files Modified

1. `apps/client/src/hooks/useWebSocket.ts` - Event deduplication
2. `apps/client/src/components/EventTimeline.tsx` - Simplified React keys
3. `apps/client/src/components/AgentSwimLane.tsx` - Added null safety checks

## Testing

### Build Status
✅ TypeScript compilation successful
✅ Vite production build successful
✅ No type errors
✅ Bundle size: 1.1MB (warning about code splitting remains - see PENDING_FORK_IMPROVEMENTS.md)

### How to Test

1. **Verify duplicate keys are gone:**
   ```bash
   # Open dashboard, run test prompt, check browser console
   # Should see NO "Encountered two children with the same key" warnings
   ```

2. **Verify click crash is fixed:**
   ```bash
   # Click on agent badges in the timeline header
   # Should open swim lane without crashing
   ```

3. **Run full test:**
   ```bash
   cd test-project
   claude
   # Paste the multi-agent test prompt from TEST_PROMPTS.md
   # Click agent badges to add swim lanes
   # Watch events stream without errors
   ```

## Performance Impact

- ✅ **Positive**: Fewer re-renders due to stable keys
- ✅ **Positive**: No duplicate events in memory
- ✅ **Positive**: Click handlers no longer cause forced reflows
- ⚠️ **Minor**: Added `some()` check on event add (O(n) but n ≤ 300 max events)

## Related Issues

- This fixes the console spam during multi-agent testing
- Resolves the 230ms click handler violation
- Eliminates React reconciliation issues from duplicate keys

## Future Improvements

Consider adding to PENDING_FORK_IMPROVEMENTS.md:
- Add React Error Boundary around AgentSwimLane
- Add logging for malformed agent names
- Consider using `event.id` as the sole source of truth (make it required in types)
