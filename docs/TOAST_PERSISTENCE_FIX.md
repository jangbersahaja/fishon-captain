# Toast Persistence Fix Summary

## Problem

The error toast message "⚠ Could not save changes." was persisting indefinitely and not disappearing even after page refresh. This was causing a poor user experience where error messages would stick around permanently.

## Root Cause Analysis

The issue was in the toast persistence system (`src/components/toast/ToastContext.tsx`):

1. **Rehydration with sticky flag**: When error toasts were rehydrated from sessionStorage on page mount, they were being created with `sticky: true`, which prevented auto-dismissal.

2. **No auto-dismiss fallback**: Error toasts without explicit `autoDismiss` values were never automatically removed.

3. **Problematic persistence**: Certain ephemeral error messages (like "Could not save changes.") were being stored in sessionStorage and rehydrated, even though they should be temporary.

## Solution Applied

### 1. Fixed Rehydration Logic

- Added specific filtering to prevent "Could not save changes." messages from being rehydrated
- Changed rehydrated error toasts to use `autoDismiss: 8000` instead of `sticky: true`
- This ensures rehydrated toasts disappear after 8 seconds

### 2. Added Default Auto-Dismiss for Error Toasts

- Error toasts without explicit `autoDismiss` now get a 10-second default timeout
- This prevents any error toast from staying on screen permanently
- Explicit `autoDismiss` values still take precedence
- `sticky: true` toasts are still respected and won't auto-dismiss

### 3. Enhanced Dismissal Logic

- When users manually dismiss error toasts, they're also removed from sessionStorage
- This prevents dismissed toasts from reappearing on next page load

## Code Changes

### Modified: `src/components/toast/ToastContext.tsx`

1. **Enhanced auto-dismissal logic**:

```typescript
// Auto-dismiss logic: use explicit autoDismiss, or default timeout for error toasts
let dismissTime = t.autoDismiss;
if (!dismissTime && t.type === "error") {
  dismissTime = 10000; // 10 second default for error toasts
}
```

2. **Fixed rehydration logic**:

```typescript
// Skip rehydrating save failed toasts since they're meant to be ephemeral
if (parsed.message === "Could not save changes.") {
  sessionStorage.removeItem("last_error_toast");
  return;
}
push({
  id: "persisted-error",
  type: "error",
  message: parsed.message,
  autoDismiss: 8000, // Auto-dismiss after 8 seconds instead of sticky
});
```

3. **Enhanced dismissal cleanup**:

```typescript
const dismiss: ToastContextValue["dismiss"] = useCallback((id) => {
  setToasts((prev) => {
    const dismissedToast = prev.find((t) => t.id === id);
    // Clear from sessionStorage if it's an error toast being dismissed
    if (dismissedToast?.type === "error") {
      // ... cleanup logic
    }
    return prev.filter((t) => t.id !== id);
  });
}, []);
```

## Verification

- TypeScript compilation: ✅ PASS
- Created unit tests to verify behavior
- Changes are backward compatible
- No breaking changes to existing toast API

## User Experience Impact

- Error toasts now automatically disappear after appropriate timeouts
- "Could not save changes." message no longer persists across page refreshes
- Manual dismissal works properly and prevents rehydration
- Toast system is more predictable and user-friendly

## Technical Notes

- The fix maintains all existing toast functionality
- Progress toasts and success toasts work as before
- Explicit `sticky: true` toasts still work for cases that need them
- `persist: false` flag is now properly respected
