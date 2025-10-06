# Fix: Maximum Update Depth Exceeded Error in EnhancedVideoUploader

## Issue Description

A second "Maximum update depth exceeded" error occurred in the `EnhancedVideoUploader` component, specifically in the interaction between the component's `onUploaded` callback and the parent component's state updates.

## Error Trace

```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.

at onUploaded (src/features/charter-onboarding/steps/MediaPricingStep.tsx:237:19)
at EnhancedVideoUploader.useEffect (src/components/captain/EnhancedVideoUploader.tsx:66:7)
at MediaPricingStep (src/features/charter-onboarding/steps/MediaPricingStep.tsx:234:15)
```

## Root Cause Analysis

### Primary Issue: Unmemoized Callback

The `onUploaded` callback in `MediaPricingStep.tsx` was not memoized, causing it to be recreated on every render:

```tsx
// BEFORE (problematic)
<EnhancedVideoUploader
  onUploaded={() => {
    setRefreshToken((t) => t + 1);
    onVideoBlockingChangeAction?.(false);
  }}
  // ... other props
/>
```

### Secondary Issue: Excessive Callback Triggering

The `useEffect` in `EnhancedVideoUploader` was calling `onUploaded()` every time there were any completed items, not just when new items completed:

```tsx
// BEFORE (problematic)
useEffect(() => {
  const completedCount = items.filter((item) => item.status === "done").length;
  if (completedCount > 0 && onUploaded) {
    onUploaded(); // Called on every render when there are completed items
  }
}, [items, onUploaded]);
```

## Solution Implementation

### 1. Memoize Callback in MediaPricingStep.tsx

Created a properly memoized callback at the component level:

```tsx
// AFTER (fixed)
const handleVideoUploaded = useCallback(() => {
  // Trigger a one-off refresh via VideoManager props pattern (using key bump)
  setRefreshToken((t) => t + 1);
  // Also notify parent about blocking state change
  onVideoBlockingChangeAction?.(false);
}, [onVideoBlockingChangeAction]);

// Used in JSX
<EnhancedVideoUploader
  onUploaded={handleVideoUploaded}
  // ... other props
/>;
```

### 2. Optimize EnhancedVideoUploader useEffect

Enhanced the callback triggering logic to only call `onUploaded` when completion count actually increases:

```tsx
// AFTER (fixed)
const previousCompletedCountRef = useRef(0);

useEffect(() => {
  const completedCount = items.filter((item) => item.status === "done").length;

  // Only call onUploaded when the completed count increases
  if (completedCount > previousCompletedCountRef.current && onUploaded) {
    previousCompletedCountRef.current = completedCount;
    onUploaded();
  } else if (completedCount === 0) {
    // Reset the counter when all items are cleared
    previousCompletedCountRef.current = 0;
  }
}, [items, onUploaded]);
```

## Files Modified

### `/src/features/charter-onboarding/steps/MediaPricingStep.tsx`

- **Added**: `handleVideoUploaded` memoized callback with `useCallback`
- **Changed**: Used memoized callback instead of inline function
- **Dependencies**: `[onVideoBlockingChangeAction]`

### `/src/components/captain/EnhancedVideoUploader.tsx`

- **Added**: `previousCompletedCountRef` using `useRef` to track completion count
- **Enhanced**: useEffect logic to only trigger callback when count increases
- **Improved**: Reset logic when all items are cleared

## Infinite Loop Prevention Strategy

### The Loop Pattern

1. EnhancedVideoUploader calls `onUploaded()` callback
2. Parent component updates state (`setRefreshToken`)
3. Parent re-renders, recreating unmemoized callback
4. EnhancedVideoUploader's useEffect re-runs due to changed callback dependency
5. Process repeats infinitely

### Prevention Measures Applied

1. **Callback Memoization**: Use `useCallback` for all callback props
2. **State Change Tracking**: Use `useRef` to track previous values
3. **Conditional Execution**: Only execute callbacks when values actually change
4. **Proper Dependencies**: Include only necessary dependencies in useEffect

## Testing Results

- ✅ All existing tests pass (17/17)
- ✅ ESLint validation clean
- ✅ TypeScript compilation successful
- ✅ Development server runs without infinite loop errors
- ✅ Video upload functionality maintained

## Performance Benefits

- **Eliminates Infinite Loops**: Prevents UI freezing and excessive re-renders
- **Optimized Callbacks**: Reduces unnecessary function calls
- **Better Resource Usage**: Prevents excessive state updates
- **Improved UX**: Smooth video upload experience without performance degradation

## Related Fixes

This fix builds upon the previous infinite loop fix in `VideoManager.tsx` and `FormSection.tsx`, establishing a pattern for preventing similar issues across the video upload system.

## Prevention Checklist for Future Development

- [ ] Always use `useCallback` for callback props passed to child components
- [ ] Use `useRef` to track previous values when implementing conditional logic
- [ ] Only call parent callbacks when values have actually changed
- [ ] Test component interactions that involve callback chains
- [ ] Monitor for excessive re-renders during development
