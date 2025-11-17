# AUTO Booking Flow Notification Fix

## Issue Discovered

After the Pusher channel naming fix, captains were **still not receiving notifications** for AUTO booking flow bookings (both registered users and guests). The Pusher configuration was correct, but the webhook payload was missing required fields.

## Root Cause

### Problem 1: Missing Webhook Data

The `booking.created` webhook payload from fishon-market was missing critical fields:

- ❌ No `anglerName` field
- ❌ No `charterName` field
- ❌ No `bookingFlowType` field

The webhook handler in fishon-captain **requires** these fields to create meaningful notifications, so notifications were either failing or showing incomplete information.

### Problem 2: Generic Notification Message

The notification message was the same for both MANUAL and AUTO flow bookings:

- MANUAL flow: "requested a booking" (requires approval) ✅
- AUTO flow: Should say "booked" (payment already authorized) ❌

## Files Fixed

### fishon-market

#### 1. `/api/bookings/create/route.ts` (Authenticated Bookings)

**Before:**

```typescript
const payload = {
  type: "booking.created",
  booking: {
    id: booking.id,
    // ... other fields ...
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    paymentFlow: booking.paymentFlow,
    // ❌ Missing: anglerName, charterName, bookingFlowType
  },
};
```

**After:**

```typescript
const user = await prisma.user.findUnique({ where: { id: dbUserId } });
const payload = {
  type: "booking.created",
  booking: {
    id: booking.id,
    anglerName: user?.name || "Guest", // ✅ Added
    charterName: trip.charter.name, // ✅ Added
    // ... other fields ...
    status: booking.status,
    bookingFlowType: booking.bookingFlowType, // ✅ Added
    paymentMethod: booking.paymentMethod,
    paymentFlow: booking.paymentFlow,
  },
};
```

#### 2. `/api/bookings/create-guest/route.ts` (Guest Bookings)

**Before:**

```typescript
const payload = {
  type: "booking.created",
  booking: {
    anglerName: `${firstName} ${lastName}`,
    // ❌ Missing: charterName
    tripId: booking.tripId,
    // ...
  },
};
```

**After:**

```typescript
const payload = {
  type: "booking.created",
  booking: {
    anglerName: `${firstName} ${lastName}`,
    charterName: trip.charter.name, // ✅ Added
    tripId: booking.tripId,
    // ...
  },
};
```

### fishon-captain

#### 3. `/api/webhooks/booking/route.ts` (Webhook Handler)

**Change 1: Added payload type fields**

```typescript
booking?: {
  // ... existing fields ...
  bookingFlowType?: string;  // ✅ Added
  paymentFlow?: string;      // ✅ Added
};
```

**Change 2: Smart notification messages based on flow type**

```typescript
// Detect AUTO flow with authorized payment
const isAutoFlowPaid =
  booking.bookingFlowType === "AUTO" && booking.status === "PAYMENT_AUTHORIZED";

await createNotification({
  type: "BOOKING_RECEIVED",
  userId: captainUserId,
  // ✅ Different title based on flow
  title: isAutoFlowPaid ? "New Paid Booking! 💰" : "New Booking Request! 🎣",
  // ✅ Different message based on flow
  message: isAutoFlowPaid
    ? `${anglerName} booked ${charterName} on ${date}. Payment authorized and secured!`
    : `${anglerName} requested a booking for ${charterName} on ${date}.`,
  // ✅ Different action label
  actionLabel: isAutoFlowPaid ? "View Booking" : "Review Request",
  metadata: {
    bookingId: booking.id,
    bookingFlowType: booking.bookingFlowType, // ✅ Store for context
    status: booking.status,
  },
});
```

## Impact

### Before Fix:

- ❌ Captain receives no notification for AUTO flow bookings
- ❌ Webhook handler missing required fields (anglerName, charterName)
- ❌ Notifications show generic "requested" message for paid bookings
- ❌ Captain doesn't know payment is already secured

### After Fix:

- ✅ Captain receives notification for ALL bookings (MANUAL + AUTO)
- ✅ Webhook includes all required fields for meaningful notifications
- ✅ AUTO flow shows "New Paid Booking! 💰" (payment secured)
- ✅ MANUAL flow shows "New Booking Request! 🎣" (needs approval)
- ✅ Works for both registered users and guest bookings
- ✅ Proper action labels: "View Booking" vs "Review Request"

## Booking Flow Comparison

### MANUAL Flow (Existing - No Changes)

1. Angler submits booking → Status: `PENDING`
2. Webhook sent: `booking.created`
3. Captain notification: "New Booking Request! 🎣"
4. Captain approves → Status: `APPROVED`
5. Angler pays → Status: `PAID`
6. Webhook sent: `booking.paid`
7. Captain notification: "Payment Received! 💰"

### AUTO Flow (Fixed)

#### Registered User - TOKENIZED (Card)

1. Angler submits with card → Payment authorized → Status: `PAYMENT_AUTHORIZED`
2. **✅ Webhook sent: `booking.created`** (now includes anglerName, charterName, flowType)
3. **✅ Captain notification: "New Paid Booking! 💰" with "Payment authorized and secured!"**
4. Captain acknowledges → Status: `CONFIRMED`
5. Payment captured automatically

#### Registered User - DIRECT (FPX/E-wallet)

1. Angler submits → Status: `PAYMENT_PENDING`
2. **✅ Webhook sent: `booking.created`** (now includes anglerName, charterName, flowType)
3. Captain notification: "New Booking Request! 🎣"
4. Angler redirected to payment gateway
5. Payment completed → Status: `PAID`
6. Webhook sent: `booking.paid`
7. Captain notification: "Payment Received! 💰"

#### Guest - AUTO Flow (Both TOKENIZED and DIRECT)

Same as registered user flows above, but with:

- `anglerName` = `${firstName} ${lastName}` from guest form
- User created with `role: "GUEST"`

## Testing Checklist

### Manual Testing - Registered User

#### Test 1: AUTO Flow with Card (TOKENIZED)

1. [ ] Log in as angler
2. [ ] Select AUTO flow charter
3. [ ] Fill booking form with card details
4. [ ] Submit booking
5. [ ] **Expected**: Captain receives notification immediately
6. [ ] **Verify**: Notification says "New Paid Booking! 💰"
7. [ ] **Verify**: Message mentions "Payment authorized and secured!"
8. [ ] **Verify**: Action label is "View Booking"

#### Test 2: AUTO Flow with FPX (DIRECT)

1. [ ] Log in as angler
2. [ ] Select AUTO flow charter
3. [ ] Fill booking form with FPX
4. [ ] Submit and complete payment
5. [ ] **Expected**: Captain receives notification after payment
6. [ ] **Verify**: Notification says "Payment Received! 💰"

#### Test 3: MANUAL Flow (Control Test)

1. [ ] Log in as angler
2. [ ] Select MANUAL flow charter
3. [ ] Submit booking (no payment yet)
4. [ ] **Expected**: Captain receives notification
5. [ ] **Verify**: Notification says "New Booking Request! 🎣"
6. [ ] **Verify**: Message says "requested a booking"
7. [ ] **Verify**: Action label is "Review Request"

### Manual Testing - Guest User

#### Test 4: Guest AUTO Flow with Card

1. [ ] Visit booking page (not logged in)
2. [ ] Enter guest details and verify email
3. [ ] Select AUTO flow charter
4. [ ] Fill booking form with card
5. [ ] Submit booking
6. [ ] **Expected**: Captain receives notification immediately
7. [ ] **Verify**: Notification shows guest name
8. [ ] **Verify**: Says "New Paid Booking! 💰"

#### Test 5: Guest MANUAL Flow

1. [ ] Visit booking page (not logged in)
2. [ ] Enter guest details and verify email
3. [ ] Select MANUAL flow charter
4. [ ] Submit booking request
5. [ ] **Expected**: Captain receives notification
6. [ ] **Verify**: Notification shows guest name
7. [ ] **Verify**: Says "New Booking Request! 🎣"

### Technical Verification

#### Browser Console (Angler Side):

```javascript
// After submitting booking, check network tab:
// POST /api/bookings/create or /api/bookings/create-guest
// Response should include: { booking: { id, status } }
// Status should be: PAYMENT_AUTHORIZED (AUTO+CARD) or PAYMENT_PENDING (MANUAL/AUTO+FPX)
```

#### Captain Server Logs:

```bash
# Watch webhook receiver logs:
# fishon-captain logs

# Expected logs sequence:
📨 Webhook received: booking.created for booking {id}
📬 [WEBHOOK] Creating notification for captain user: {userId}
📝 [WEBHOOK] Creating BOOKING_RECEIVED notification...
   bookingFlowType: AUTO, status: PAYMENT_AUTHORIZED
✅ BOOKING_RECEIVED notification sent to captain {userId} (flowType: AUTO, status: PAYMENT_AUTHORIZED)
```

#### Market Server Logs:

```bash
# Watch webhook sender logs:
# fishon-market logs

# Expected logs sequence:
📤 [sendWithRetry] Starting webhook to {CAPTAIN_WEBHOOK_URL}
🔄 [sendWithRetry] Attempt 1/3 to {url}
✅ [sendWithRetry] Webhook successful on attempt 1
```

## Environment Variables Required

### fishon-market (.env)

```env
# Webhook endpoint
CAPTAIN_WEBHOOK_URL=https://fishon-captain.vercel.app/api/webhooks/booking

# Webhook authentication
CAPTAIN_API_SECRET=your_shared_secret_here
```

### fishon-captain (.env)

```env
# Webhook authentication (must match fishon-market)
CAPTAIN_API_SECRET=your_shared_secret_here

# Pusher (for real-time notifications)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

## Related Fixes

This fix builds on the previous Pusher channel naming fix:

- **Previous**: Fixed Pusher channel naming (`private-user-` → `private-user.`)
- **This fix**: Fixed webhook payload to include required notification fields

Both fixes were necessary:

1. Pusher channels must be properly named for auth to work ✅
2. Webhook payload must include all required fields for notifications ✅

## Notification Types Summary

| Flow Type | Payment Method       | Webhook Event       | Notification Type | Message                   |
| --------- | -------------------- | ------------------- | ----------------- | ------------------------- |
| MANUAL    | N/A                  | `booking.created`   | BOOKING_RECEIVED  | "New Booking Request! 🎣" |
| AUTO      | CARD (TOKENIZED)     | `booking.created`   | BOOKING_RECEIVED  | "New Paid Booking! 💰"    |
| AUTO      | FPX/EWALLET (DIRECT) | `booking.created`   | BOOKING_RECEIVED  | "New Booking Request! 🎣" |
| AUTO      | FPX/EWALLET (DIRECT) | `booking.paid`      | BOOKING_PAID      | "Payment Received! 💰"    |
| ANY       | ANY                  | `booking.cancelled` | BOOKING_CANCELLED | "Booking Cancelled"       |
| ANY       | ANY                  | `booking.confirmed` | BOOKING_CONFIRMED | "Booking Confirmed! ✅"   |

## Preventing Future Issues

### When Adding New Booking Fields:

1. ✅ Check if field is needed in webhook payload
2. ✅ Update payload in both `/create` and `/create-guest` routes
3. ✅ Update webhook handler type definition
4. ✅ Update notification message if needed
5. ✅ Test with both registered and guest users

### When Adding New Booking Flows:

1. ✅ Decide what notification message to show
2. ✅ Add flow detection logic in webhook handler
3. ✅ Include flow type in webhook payload
4. ✅ Test notification appears correctly
5. ✅ Update this documentation

### Code Review Checklist:

- [ ] Webhook payload includes all required fields
- [ ] Both `/create` and `/create-guest` routes updated
- [ ] Webhook handler type definition updated
- [ ] Notification message appropriate for flow type
- [ ] Tested with registered users
- [ ] Tested with guest users
- [ ] Tested with MANUAL flow
- [ ] Tested with AUTO flow (TOKENIZED and DIRECT)
