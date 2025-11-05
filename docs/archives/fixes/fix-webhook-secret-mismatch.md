---
type: fix
status: identified
updated: 2025-10-30
feature: notifications
author: copilot
---

# Booking Notification Webhook Configuration Issue

## Problem

Booking notifications from fishon-market to fishon-captain are not working because of a **webhook secret mismatch**.

### Current Setup

**fishon-market** (sender):

- Uses env var: `CAPTAIN_WEBHOOK_SECRET="tklqnFGdxGxL+ysqop46UuvxuV+hgAu2I1eCNf1Fz24="`
- Sends webhook to: `CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"`
- Header: `x-captain-secret: <value of CAPTAIN_WEBHOOK_SECRET>`

**fishon-captain** (receiver):

- Expects env var: `CAPTAIN_API_SECRET="jw4nkbSLGYaEBAHEqZf3e+RCy7d/BvmKjIoH9vZFw+e1/PWuv1HbdKVHftA="`
- Endpoint: `/api/webhooks/booking`
- Validates: `x-captain-secret` header === `CAPTAIN_API_SECRET`

**The secrets don't match!** ❌

## Root Cause

The webhook authentication is failing because:

1. fishon-market sends `CAPTAIN_WEBHOOK_SECRET` value
2. fishon-captain validates against `CAPTAIN_API_SECRET` value
3. These two environment variables have **different values**

## Solution

Choose one of these approaches:

### Option 1: Use Same Secret (Recommended)

Make both apps use the same secret value:

**In fishon-market `.env.local`:**

```bash
CAPTAIN_WEBHOOK_SECRET="jw4nkbSLGYaEBAHEqZf3e+RCy7d/BvmKjIoH9vZFw+e1/PWuv1HbdKVHftA="
```

**In fishon-captain `.env.local`:**

```bash
CAPTAIN_API_SECRET="jw4nkbSLGYaEBAHEqZf3e+RCy7d/BvmKjIoH9vZFw+e1/PWuv1HbdKVHftA="
```

### Option 2: Align Environment Variable Names

Update fishon-captain to use `CAPTAIN_WEBHOOK_SECRET`:

**In `/Users/jangbersahaja/Website/fishon-captain/src/app/api/webhooks/booking/route.ts`:**

```typescript
// Change this:
const secret = process.env.CAPTAIN_API_SECRET;

// To this:
const secret = process.env.CAPTAIN_WEBHOOK_SECRET;
```

**In fishon-captain `.env.local`:**

```bash
CAPTAIN_WEBHOOK_SECRET="tklqnFGdxGxL+ysqop46UuvxuV+hgAu2I1eCNf1Fz24="
```

## Implementation

I'll implement **Option 1** because:

- It's simpler (just environment variable change)
- `CAPTAIN_API_SECRET` is already used elsewhere in fishon-captain
- No code changes required

## Testing After Fix

1. **Create a test booking** in fishon-market (local dev or staging)
2. **Check fishon-captain logs** for webhook receipt:
   - Should see: `📨 Webhook received: booking.created for booking {id}`
   - Should see: `✅ BOOKING_RECEIVED notification sent to captain {userId}`
3. **Check captain dashboard**:
   - Visit `/captain/notifications`
   - Should see "New Booking Request! 🎣" notification
   - Toast should appear with sound (if enabled)
4. **Verify notification bell**:
   - Red badge should show unread count
   - Click bell to see notification in dropdown

## Verification Checklist

- [ ] Update `CAPTAIN_WEBHOOK_SECRET` in fishon-market `.env.local`
- [ ] Restart fishon-market dev server
- [ ] Create test booking
- [ ] Check fishon-captain logs
- [ ] Verify notification appears in dashboard
- [ ] Test notification bell badge
- [ ] Test notification dropdown
- [ ] Test notification sound
- [ ] Test "View" action button

## Related Files

### fishon-market

- `.env.local` - Environment variables
- `src/app/api/bookings/create-guest/route.ts` - Booking creation with webhook
- `src/app/api/bookings/approve/route.ts` - Booking approval webhook
- `src/app/api/bookings/reject/route.ts` - Booking rejection webhook
- `src/lib/webhooks/webhook.ts` - Webhook utility with retry

### fishon-captain

- `.env.local` - Environment variables
- `src/app/api/webhooks/booking/route.ts` - Webhook receiver endpoint
- `src/lib/services/notification-service.ts` - Notification creation
- `src/hooks/useNotifications.ts` - Real-time notification hook
- `src/components/notifications/NotificationBell.tsx` - Notification bell UI

## Additional Notes

### Webhook Payload Structure

```typescript
{
  type: "booking.created" | "booking.cancelled" | "booking.paid",
  booking: {
    id: string,
    guestName: string,
    guestEmail: string,
    tripId: string,
    charterId: string,
    date: string,
    anglerName?: string,
    charterName?: string,
    status: string
  }
}
```

### Notification Types Created

- `BOOKING_RECEIVED` - New booking request
- `BOOKING_CANCELLED` - Booking cancelled by angler
- `BOOKING_PAID` - Payment received

### Security

- Webhook uses shared secret for authentication
- Secret should be strong (32+ random bytes, base64 encoded)
- Different secret per environment (dev/staging/production)
- Never commit secrets to git

## Future Enhancements

1. **Review notifications**: Add webhook for review creation
2. **Booking updates**: Add webhook for booking status changes
3. **Payment notifications**: Add webhook for payment failures
4. **Webhook logging**: Add webhook activity log in captain dashboard
5. **Webhook retry**: Implement exponential backoff in fishon-market
6. **Webhook signatures**: Use HMAC signatures instead of shared secret
