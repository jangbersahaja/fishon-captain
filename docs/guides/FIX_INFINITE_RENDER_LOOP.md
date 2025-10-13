# Fix: Maximum Update Depth Exceeded Error

## Issue Description

The application was experiencing a "Maximum update depth exceeded" error caused by an infinite re-render loop in the video upload components. The error occurred when the `onVideoBlockingChange` callback was called repeatedly, causing excessive state updates.

## Root Cause Analysis

### Primary Issue

The `onVideoBlockingChange` callback in `FormSection.tsx` was not memoized, causing it to be recreated on every render:

```tsx
// BEFORE (problematic)
onVideoBlockingChange={(b) => setVideoSectionBlocking(b)}
```

### Secondary Issue

The `VideoManager.tsx` component had a `useEffect` that depended on the callback functions, creating a chain reaction:

1. VideoManager calls `onPendingChange` callback
2. Parent component re-renders due to state update
3. Un-memoized callback is recreated
4. VideoManager's useEffect runs again due to changed dependency
5. Infinite loop continues

## Solution Implementation

### 1. Memoize Callback in FormSection.tsx

Fixed the unmemoized callback by wrapping it with `useCallback`:

```tsx
// AFTER (fixed)
onVideoBlockingChange={useCallback(
  (b: boolean) => setVideoSectionBlocking(b),
  [setVideoSectionBlocking]
)}
```

### 2. Optimize VideoManager.tsx useEffect

Enhanced the VideoManager component to prevent unnecessary callback calls:

- **Added state tracking**: Used `useRef` to track previous values of `pending` state and `videos` array
- **Conditional callbacks**: Only call parent callbacks when values have actually changed
- **Removed unnecessary dependencies**: Excluded callback functions from useEffect dependencies with proper ESLint disable comment
- **Eliminated setTimeout**: Removed the unnecessary `setTimeout` wrapper that was causing additional render cycles

```tsx
// BEFORE (problematic)
useEffect(() => {
  const hasPending = videos.some((v) => v.processStatus !== "ready");
  setTimeout(() => {
    onPendingChange?.(hasPending);
    onVideosChange?.(videos);
  }, 0);
  // ... rest of effect
}, [videos, load, onVideosChange, onPendingChange]);

// AFTER (fixed)
useEffect(() => {
  const hasPending = videos.some((v) => v.processStatus !== "ready");

  // Only notify parent if the pending state has actually changed
  if (prevPendingRef.current !== hasPending) {
    prevPendingRef.current = hasPending;
    onPendingChange?.(hasPending);
  }

  // Only notify parent if the videos array has actually changed
  const videosChanged =
    videos.length !== prevVideosRef.current.length ||
    videos.some((v, i) => {
      const prev = prevVideosRef.current[i];
      return (
        !prev || v.id !== prev.id || v.processStatus !== prev.processStatus
      );
    });

  if (videosChanged) {
    prevVideosRef.current = videos;
    onVideosChange?.(videos);
  }

  // ... rest of effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [videos, load]);
```

## Files Modified

### `/src/features/charter-onboarding/FormSection.tsx`

- **Change**: Wrapped `onVideoBlockingChange` callback with `useCallback`
- **Impact**: Prevents callback recreation on every render

### `/src/components/captain/VideoManager.tsx`

- **Changes**:
  - Added `useRef` import
  - Added `prevPendingRef` and `prevVideosRef` for state tracking
  - Optimized useEffect to only call callbacks when values change
  - Added ESLint disable comment for intentional dependency exclusion
- **Impact**: Eliminates infinite re-render loop while maintaining functionality

## Testing Results

- ✅ All existing tests pass (17/17)
- ✅ ESLint validation clean
- ✅ TypeScript compilation successful
- ✅ Development server runs without errors

## Prevention Strategy

This type of issue can be prevented by:

1. **Always memoize callbacks**: Use `useCallback` for any callback props passed to child components
2. **Track state changes**: Use `useRef` to track previous values when implementing conditional callback logic
3. **Careful useEffect dependencies**: Be mindful of callback dependencies in useEffect hooks
4. **Testing infinite loops**: Test component interactions that involve callback chains

## Performance Impact

- **Positive**: Eliminates excessive re-renders and improves performance
- **Minimal overhead**: Added ref tracking has negligible performance cost
- **Better UX**: Prevents UI freezing caused by infinite render loops
