---
type: fix
status: completed
updated: 2025-11-03
feature: notifications
author: copilot
---

# Fix: Multiple Notification Hook Mounts During Build

## Problem Statement

During `npm run build`, console logs showed multiple mounting of the notification hook:

```
🟢 [useNotifications] Hook called with: { userId: undefined, autoConnect: true, hasSession: false }
🔵 [NotificationProvider] Hook state: { hasNotifications: 0, unreadCount: 0, isLoading: true }
```

This raised concerns about potential duplicate Pusher connections or API calls.

## Root Cause Analysis

### Why Multiple Mounts Occur

1. **Next.js Static Generation**: During build, Next.js renders components multiple times:
   - Static page generation (SSG)
   - Server component compilation
   - Client component bundling

2. **React Development Mode**: In development, React intentionally renders components twice to detect side effects (React 18+)

3. **Provider Pattern**: `NotificationProvider` wraps the entire app in `layout.tsx`, so it's instantiated for every page during static generation

### Why This Isn't Actually A Problem

Looking at the hook implementation:

```typescript
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // During build: userId is undefined, no session exists

  useEffect(() => {
    if (!userId || !autoConnect) {
      // ✅ Early return - no Pusher connection created
      return;
    }

    // This code never runs during build because userId is undefined
    // Pusher setup code here...
  }, [userId, autoConnect]);
}
```

**Key safeguard**: The hook checks for `userId` before initializing Pusher. During build, there's no authenticated session, so:

- ✅ No Pusher connections are created
- ✅ No API calls are made
- ✅ No side effects occur
- ❌ Only console logs were polluting build output

## Solution Implemented

### Approach: Conditional Debug Logging

Instead of removing logs entirely (useful for development), we gate them behind an environment variable:

```typescript
// Debug logger - only logs when NEXT_PUBLIC_NOTIFICATIONS_DEBUG=1
const debugLog = (...args: unknown[]) => {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === "1"
  ) {
    console.log(...args);
  }
};
```

### Files Modified

#### 1. `/src/hooks/useNotifications.ts`

**Added debug helper**:

```typescript
const debugLog = (...args: unknown[]) => {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === "1"
  ) {
    console.log(...args);
  }
};
```

**Replaced all console.log with debugLog**:

- `console.log("🟢 [useNotifications] Hook called...")` → `debugLog(...)`
- `console.log("🟡 [useNotifications] Pusher effect...")` → `debugLog(...)`
- `console.log("🔌 [useNotifications] Creating new Pusher...")` → `debugLog(...)`
- `console.log("[useNotifications] 🔔 New notification...")` → `debugLog(...)`
- `console.log("[Pusher] Tab visible...")` → `debugLog(...)`
- etc.

**Kept error logs**:

```typescript
// Errors still logged (important for debugging)
console.error("[Pusher] Connection error:", err);
```

#### 2. `/src/components/notifications/NotificationProvider.tsx`

**Before**:

```typescript
export function NotificationProvider({ children }) {
  console.log("🔵 [NotificationProvider] Mounting provider...");
  const notificationState = useNotifications();
  console.log("🔵 [NotificationProvider] Hook state:", { ... });
  // ...
}
```

**After**:

```typescript
export function NotificationProvider({ children }) {
  const notificationState = useNotifications();

  // Only log in development with debug flag
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === "1") {
    console.log("🔵 [NotificationProvider] Mounting provider...");
    console.log("🔵 [NotificationProvider] Hook state:", { ... });
  }
  // ...
}
```

## Benefits

### 1. Clean Build Output

- ✅ No console noise during `npm run build`
- ✅ No confusion about "multiple mounts"
- ✅ Build logs remain focused on actual warnings/errors

### 2. Debuggability Preserved

Enable debug logs when needed:

```bash
# In .env.local
NEXT_PUBLIC_NOTIFICATIONS_DEBUG=1
```

Then run:

```bash
npm run dev
```

You'll see all the detailed notification system logs:

```
🟢 [useNotifications] Hook called with: { userId: "123", autoConnect: true, hasSession: true }
🔵 [NotificationProvider] Hook state: { hasNotifications: 5, unreadCount: 2, isLoading: false }
🔌 [useNotifications] Creating new Pusher instance
🔔 New notification received: { type: "BOOKING_RECEIVED", ... }
```

### 3. Production Safety

- ✅ Debug logs never appear in production (NODE_ENV check)
- ✅ Error logs still work (console.error preserved)
- ✅ No runtime performance impact

## Alternative Solutions Considered

### Option 1: Remove All Logs ❌

**Pros**: Cleanest approach
**Cons**: Lose debugging capability for complex Pusher connection issues

### Option 2: Use a Proper Logger Library ⚠️

**Pros**: Professional logging with levels, transports, etc.
**Cons**: Overkill for this use case, adds dependency

### Option 3: Environment-Based Logging ✅ **CHOSEN**

**Pros**:

- Simple implementation
- Preserves debugging when needed
- Clean by default
- No new dependencies

**Cons**: None significant

## Usage Guide

### For Regular Development (Clean Logs)

Just run normally:

```bash
npm run dev
npm run build
```

No notification debug logs will appear.

### For Notification System Debugging

Enable debug mode in `.env.local`:

```bash
NEXT_PUBLIC_NOTIFICATIONS_DEBUG=1
```

Then:

```bash
npm run dev
```

You'll see detailed logs for:

- Hook initialization
- Provider mounting
- Pusher connection lifecycle
- Channel subscriptions
- Incoming notifications
- Unread count updates
- Visibility change handling

### For Production

Debug logs are automatically disabled in production due to `NODE_ENV` check. The environment variable has no effect in production builds.

## Testing Verification

### Build Test (Clean Output)

```bash
npm run build
```

Expected: No `🟢 [useNotifications]` or `🔵 [NotificationProvider]` logs

### Development Test (With Debug)

```bash
# Set env var
echo "NEXT_PUBLIC_NOTIFICATIONS_DEBUG=1" >> .env.local

# Run dev
npm run dev

# Check browser console - should see debug logs
```

### Production Test

```bash
NODE_ENV=production npm run build
```

Expected: No debug logs regardless of `NEXT_PUBLIC_NOTIFICATIONS_DEBUG` value

## Related Files

- `/src/hooks/useNotifications.ts` - Main notification hook
- `/src/components/notifications/NotificationProvider.tsx` - Context provider
- `/src/app/layout.tsx` - Provider wrapper location
- `/docs/API_VIDEO_ROUTES.md` - Mentions similar logging patterns

## Lessons Learned

1. **Multiple renders during build are normal** - Next.js needs to render components for SSG, SSR compilation, and client bundling

2. **Guard side effects properly** - Always check for required data (like `userId`) before performing side effects

3. **Debug logs should be opt-in** - Verbose logging clutters output and confuses developers

4. **Distinguish between noise and problems** - Multiple renders aren't a problem if properly guarded

5. **Keep error logs** - Always preserve `console.error` for debugging production issues

## Future Improvements

### 1. Structured Logging

Consider using a proper logger like `pino` or `winston` for more sophisticated logging needs:

```typescript
import { logger } from "@/lib/logger";

logger.debug("[useNotifications] Hook called", { userId, autoConnect });
logger.error("[Pusher] Connection error", { error: err });
```

### 2. Performance Monitoring

Add performance instrumentation to track:

- Hook initialization time
- Pusher connection latency
- Notification fetch duration

```typescript
import { withTiming } from "@/lib/timing";

await withTiming("notifications-fetch", () => fetchNotifications());
```

### 3. Error Boundaries

Wrap NotificationProvider in an error boundary to gracefully handle failures:

```tsx
<NotificationErrorBoundary>
  <NotificationProvider>{children}</NotificationProvider>
</NotificationErrorBoundary>
```

---

**Status**: ✅ Fixed and tested
**Impact**: Cleaner build output, preserved debugging capability
**Breaking Changes**: None - logging behavior only changed
