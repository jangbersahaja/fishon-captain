# Video List API Polling Optimization Plan

## Current Behavior Analysis

### Issue

The `/api/videos/list` endpoint is being called excessively and continuously:

- Called every 5 seconds while **any** video is not in "ready" state
- Continues even when user is inactive
- No distinction between active upload vs waiting for external worker callback
- Triggers on every video status change, causing cascade of calls

### Current Implementation (`VideoManager.tsx`)

```typescript
useEffect(() => {
  const hasPending = videos.some((v) => v.processStatus !== "ready");

  if (!hasPending) return;
  const t = setInterval(load, 5000); // Poll every 5 seconds
  return () => clearInterval(t);
}, [videos, load]);
```

**Triggers:**

1. ✅ Initial page load
2. ✅ After upload completion (via `refreshToken` increment)
3. ✅ After delete operation
4. ❌ **CONTINUOUS:** Every 5s while status = queued/processing
5. ❌ **NO STOP:** Continues indefinitely even without user activity

---

## Optimization Strategy

### Goal

Reduce API calls by **70-80%** while maintaining responsive UI updates.

### Proposed Behavior

| Event               | Action         | Polling Interval           | Stop Condition                    |
| ------------------- | -------------- | -------------------------- | --------------------------------- |
| **Page Load**       | Initial call   | None                       | -                                 |
| **Upload Start**    | Immediate call | 3s for 30s, then 10s       | Upload complete + processing done |
| **Upload Complete** | Immediate call | 10s (waiting for callback) | All videos ready                  |
| **Delete Video**    | Immediate call | None (one-time)            | -                                 |
| **Upload Failed**   | Immediate call | None (manual retry)        | -                                 |
| **No Activity**     | Stop polling   | -                          | After 2 minutes idle              |
| **User Returns**    | Resume polling | 10s                        | All videos ready                  |

---

## Implementation Plan

### Phase 1: Smart Polling Strategy

**Update `VideoManager.tsx` polling logic:**

1. **Dynamic Intervals Based on Status**

   - Active upload (0-30s after upload): 3s interval
   - Processing/waiting for callback: 10s interval
   - No pending videos: stop polling

2. **Activity Detection**

   - Track last upload time
   - Track last user interaction (delete/retry/capture thumb)
   - Stop polling after 2 minutes of inactivity
   - Resume on visibility change (tab focus)

3. **Event-Driven Triggers**
   - Immediate refresh on upload complete
   - Immediate refresh on delete
   - Immediate refresh on retry
   - Stop on all videos ready

### Phase 2: Optimized State Management

**Prevent Cascade Refreshes:**

1. **Debounce `refreshToken` increments**

   - Batch multiple upload completions within 2s
   - Prevent redundant calls from simultaneous uploads

2. **Memoize video comparison**
   - Only trigger parent callbacks on actual changes
   - Skip re-renders when data is identical

### Phase 3: Backend Optimization (Future)

**Server-Sent Events (SSE) or WebSocket (Optional):**

- Real-time status updates instead of polling
- Only poll as fallback when connection drops
- Reduces polling to near-zero for most cases

---

## Detailed Implementation

### VideoManager.tsx Changes

```typescript
// Add activity tracking
const [lastActivity, setLastActivity] = useState(Date.now());
const [isVisible, setIsVisible] = useState(true);

// Track upload completion time for smart intervals
const uploadTimestamps = useRef<Record<string, number>>({});

// Page visibility tracking
useEffect(() => {
  const handleVisibility = () => {
    setIsVisible(!document.hidden);
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () =>
    document.removeEventListener("visibilitychange", handleVisibility);
}, []);

// Smart polling with dynamic intervals
useEffect(() => {
  const hasPending = videos.some((v) => v.processStatus !== "ready");

  if (!hasPending) return; // Stop if all ready

  // Check inactivity timeout (2 minutes)
  const inactiveMs = Date.now() - lastActivity;
  if (inactiveMs > 2 * 60 * 1000 && !isVisible) {
    return; // Stop polling if inactive and tab hidden
  }

  // Determine interval based on video states
  const hasRecentUpload = videos.some((v) => {
    const uploadTime = uploadTimestamps.current[v.id];
    return uploadTime && Date.now() - uploadTime < 30000; // 30s
  });

  const interval = hasRecentUpload ? 3000 : 10000; // 3s or 10s

  const t = setInterval(load, interval);
  return () => clearInterval(t);
}, [videos, load, lastActivity, isVisible]);

// Track activity on user actions
const trackActivity = () => setLastActivity(Date.now());

const remove = async (id: string) => {
  trackActivity();
  await fetch(`/api/videos/${id}`, { method: "DELETE" });
  setDeleteConfirm(null);
  load(); // Immediate refresh
};

const retry = async (id: string) => {
  trackActivity();
  // ...existing retry logic
};
```

### MediaPricingStep.tsx Changes

```typescript
// Debounce refreshToken updates
const refreshDebounceRef = useRef<NodeJS.Timeout>();

const handleVideoUploaded = useCallback(() => {
  // Clear previous debounce timer
  if (refreshDebounceRef.current) {
    clearTimeout(refreshDebounceRef.current);
  }

  // Debounce to batch multiple uploads
  refreshDebounceRef.current = setTimeout(() => {
    setRefreshToken((t) => t + 1);
  }, 2000); // Wait 2s for batch
}, []);
```

---

## Expected Results

### Before Optimization

- **Scenario:** 3 videos uploading/processing for 5 minutes
- **API Calls:** 60 calls (every 5 seconds)
- **Network Load:** High

### After Optimization

- **Scenario:** Same 3 videos
- **API Calls:**
  - Initial: 1 call
  - Active upload (first 30s): 10 calls (3s interval)
  - Processing (4.5 min): 27 calls (10s interval)
  - **Total: ~38 calls (37% reduction)**

### With Inactivity Detection

- **Scenario:** User uploads then switches tabs
- **API Calls:**
  - Active upload: 10 calls
  - Processing (visible): 12 calls (2 min visible)
  - Tab hidden: 0 calls (stops after 2 min)
  - **Total: ~22 calls (63% reduction)**

---

## Migration Steps

### Step 1: Implement Smart Polling (Low Risk)

- Add dynamic intervals based on upload age
- Add inactivity detection
- Test with single video upload

### Step 2: Add Debouncing (Medium Risk)

- Debounce refreshToken increments
- Test with multiple simultaneous uploads
- Verify no race conditions

### Step 3: Add Visibility API (Low Risk)

- Stop polling on tab hide + inactivity
- Resume on tab focus
- Test across browsers

### Step 4: Monitor & Tune (Ongoing)

- Track actual API call reduction in production
- Adjust intervals based on worker callback timing
- Consider SSE/WebSocket if further reduction needed

---

## Testing Checklist

- [ ] Single video upload: polls appropriately, stops when ready
- [ ] Multiple videos: batched refresh, independent status tracking
- [ ] Delete operation: immediate refresh, no extra polls
- [ ] Retry operation: immediate refresh, resume smart polling
- [ ] Tab hidden: stops polling after inactivity timeout
- [ ] Tab focus: resumes polling if videos pending
- [ ] Network error: polling continues with exponential backoff
- [ ] All videos ready: polling stops completely
- [ ] Page reload: restarts polling from fresh state

---

## Rollback Plan

If issues arise:

1. Keep dynamic intervals but revert to 5s baseline
2. Remove inactivity detection
3. Remove debouncing
4. Monitor for any missed status updates

Each change is independent and can be rolled back separately.
