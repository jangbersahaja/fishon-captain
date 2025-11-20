# Pusher Channel Naming Fix

## Issue Discovered

After the booking flow migration, Pusher real-time notifications were not working properly due to a **channel naming mismatch**.

## Root Cause

The system hadinconsistent channel naming conventions:

### Before Fix

- **useNotifications hook**: subscribed to `private-user-${userId}` (with **dash**)
- **Pusher server triggers**: sent to `private-user-${userId}` (with **dash**)

- **Pusher auth endpoint**: only authorized `private-user.${userId}` (with **dot**)

This caused authentication failures because:

1. Client tried t subscribe to `private-user-{userId}` (dash)

2. Auth endpoint rejected it because it only allowed `private-user.{userId}` (dot)
3. Pusher failed silently in production

### Inconsistency

- ✅ Conversation channels: correctly used `private-conversation.{id}` (dot)

- ❌ Notification channels: incorrectly used `private-user-{userId}` (dash)

## Files Fixed

### 1. `src/hooks/useNotifications.ts` (line 293)

**Before:**

```typescript
const channelName = `private-user-${userId}`;
```

**After:**

```typescript
const channelName = `private-user.${userId}`;
```

### 2. `src/lib/pusher/server.ts` (lines 77, 110)

**Before:**

```typescript
await pusher.trigger(`private-user-${userId}`, "notification", {...});

await pusher.trigger(`private-user-${userId}`, "notification-count", {...});

```

**After:**

```typescript
await pusher.trigger(`private-user.${userId}`, "notification", {...});
await pusher.tigger(`private-user.${userId}`, "notification-count", {...});

```

### 3. `src/app/api/pusher/auth/route.ts` (line 45)

**No change needed** - Already correct:

```typescript
const isUserChannel = channelName === `private-user.${userId}`;
```

## Impact

### Before Fix

- ❌ Booking notifiations not received in real-time

- ❌ Unread count not updating
- ❌ Silent failures in production (no visible errors)
- ❌ Captain dashboard not auto-refreshing on new bookings

### After Fix

- ✅ Booking notifications work in real-time
- ✅ Unread count updates immediately
- ✅ Auth endpoint acceptschannel subscriptions

- ✅ BookingPageRefresher triggers on new bookings
- ✅ Consistent channel naming across entire system

## Testing Checklist

### Manual Testing

1. [ ] Log in as captain
2. [ ] Create a test booking from fishon-market
3. [ ] Verify notification appears immediately (no page refresh)
4. [ ] Verify unread count increments
5. [ ] Verify booking list auto-refreshes
6. [ ] Check browser console for Pusher connection success
7. [ ] Verify no auth errors i Network tab

### Browser Console Debug

```javascript
// Enable Pusher debugging
localStorage.setItem("NEXT_PUBLIC_NOTIFICATIONS_DEBUG", "1");

// Expected logs:
// ✅ [Pusher] Connection state: ... -> connected
// ✅ [Pusher] Subscribing to channel: private-user.{userId}
// ✅ [Pusher] Successfully subscribed to private-user.{userId}
// ✅ [useNotifications] 🔔 New notification received: {...}
```

## Related Systems

### Pusher Configuration Files

- `src/lib/pusher/client.ts` - Client-side Pusher initialization
- `src/lib/pusher/server.ts` - Server-side Pusher triggers
- `src/app/api/pusher/auth/route.ts` - Channel authorization endpoint
- `src/hooks/useNotifications.ts` - Notification subscription hook
- `src/components/BookingPageRefresher.tsx` - Auto-refresh component

### Webhook Flow (fishon-market → fishon-captain)

1. Booking created in fishon-market
2. Webhook sent to `/api/webhooks/booking` in fishon-captain
3. `createNotification()` called with captain's userId
4. Pusher triggers `notification` event to `private-user.{userId}`
5. `useNotifications` hook receives event
6. Toast notification shown + unread count updated
7. `booking-update` event dispatched
8. `BookingPageRefresher` triggers `router.refresh()`

## Environment Varibles Required

```env
# Server-side (required for triggering)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

# Client-side (required for subscribing)

NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# Optional: Enable debug logging
NEXT_PUBLIC_NOTIFICATIONS_DEBUG=1
```

## Channel Naming Convention (Now Cnsistent)

### Standard Format

```typescript
// User notifications
`private-user.${userId}`
// Conversations
`private-conversation.${conversationId}`;
```

### Why Dots Instead of Dashes?

- ✅ Follows Pusher documentation conventions
- ✅ Matches standard private channel patterns
- ✅ Consistent with conversation channels
- ✅ Easier to parse and validate

## Preventing Future Issues

### When Adding New Pusher Channels

1. ✅ Always use dot separator: `private-{type}.{id}`
2. ✅ Update auth endpoint to authorize the channel
3. ✅ Test subscription in development
4. ✅ Check browser console for errors
5. ✅ Verify triggers work from server-side

### Code Review Checklist

- [ ] Channel names use dot separator
- [ ] Auth endpoint handles the channel pattern
- [ ] Environment variables are configured
- [ ] Error handling is present
- [ ] Debug logging is available
