## Bug Fixes: Booking Actions and Guest User Data

**Date:** November 17, 2025

Two critical issues identified and fixed before proceeding with migration deployment:

---

## Issue 1: PAYMENT_AUTHORIZED Bookings Cannot Be Approved

### Problem

When trying to approve a `PAYMENT_AUTHORIZED` booking, the system returned:

```
"Only pending bookings can be approved" - 409 error
POST /api/market/bookings/approve
```

### Root Cause

- `BookingActions` component was calling `/api/bookings/approve` endpoint for all bookings
- The approve endpoint only accepts `PENDING` status bookings (MANUAL flow)
- `PAYMENT_AUTHORIZED` bookings (AUTO flow) require the `/api/bookings/acknowledge` endpoint instead

### Solution

**1. Created acknowledge endpoint proxy** (`/api/market/bookings/acknowledge/route.ts`):

- New proxy endpoint in fishon-captain to call fishon-market's acknowledge endpoint
- Handles AUTO flow bookings (PAYMENT_AUTHORIZED → PAID)

**2. Updated BookingActions component**:

- Added `status` and `flowType` props
- Logic now determines correct endpoint based on booking status:
  - `PAYMENT_AUTHORIZED` → calls `/api/market/bookings/acknowledge`
  - `PENDING` → calls `/api/market/bookings/approve`
- Updated button text: "Acknowledge" for AUTO flow, "Approve" for MANUAL flow
- Updated modal descriptions to match flow type

**3. Updated parent components**:

- `bookings/[id]/page.tsx`: Pass `status` and `flowType` to BookingActions
- `ChatHeader.tsx`: Pass `status` and `flowType` to BookingActions
- Show actions for both `PAYMENT_AUTHORIZED` and `PENDING` bookings

**4. Added bookingFlowType to type definitions**:

- Updated `PrismaMarketBooking` type in `market-db.ts`
- Updated `MarketBooking` type in `market-db.ts`
- Updated `ChatHeaderProps` booking interface

### Files Changed

- `/src/app/api/market/bookings/acknowledge/route.ts` (NEW)
- `/src/app/(portal)/captain/bookings/BookingActions.tsx`
- `/src/app/(portal)/captain/bookings/[id]/page.tsx`
- `/src/components/captain/chat/ChatHeader.tsx`
- `/src/lib/market-db.ts`

---

## Issue 2: Message Pages Looking for Removed Guest Fields

### Problem

Message pages were attempting to access `guestFirstName`, `guestLastName`, `guestEmail`, and `guestPhone` fields from the `Booking` model, which have been removed in the new system.

### Context

- Old system: Guest booking details stored directly on Booking model
- New system: Guest bookings create a User with `GUEST` role
- All guest information now stored in User table

### Root Cause

- `message-service.ts` was still using old guest fields from booking
- Code had separate logic paths for registered users vs guest users
- Guest booking data retrieval relied on removed booking fields

### Solution

**Updated getConversationList function**:

- Removed `guestFirstName`, `guestLastName`, `guestEmail` from booking select
- Simplified angler info logic - all users now fetched from User table
- No more separate guest vs registered user paths
- All bookings now have `userId` (either registered or guest user)

**Updated getConversationById function**:

- Removed all guest booking fields from select
- Fetch all user data (name, email, phone, image) from User table
- Works uniformly for both registered users and guest users
- Guest users have `role: "GUEST"` in User table

### Files Changed

- `/src/lib/message-service.ts`

### Code Changes

**Before:**

```typescript
if (conversation.booking.userId) {
  // Registered user
  const user = await prismaMarket.marketUser.findUnique(...);
} else {
  // Guest booking - use guest name fields
  anglerName = `${booking.guestFirstName} ${booking.guestLastName}`;
}
```

**After:**

```typescript
if (conversation.booking && conversation.booking.userId) {
  // Fetch user info (works for both registered and guest users)
  const user = await prismaMarket.marketUser.findUnique(...);
  anglerName = user?.name || "Angler";
}
```

---

## Testing Verification

**Issue 1 - Booking Actions:**

- [x] PAYMENT_AUTHORIZED bookings show "Acknowledge" button
- [x] PENDING bookings show "Approve" button
- [x] Acknowledge action calls correct endpoint
- [x] Approve action calls correct endpoint
- [x] Modal descriptions match flow type
- [x] TypeScript type checks pass

**Issue 2 - Message Pages:**

- [x] Conversation list loads without errors
- [x] Guest user names display correctly
- [x] Registered user names display correctly
- [x] No references to removed booking fields
- [x] TypeScript type checks pass

---

## Impact

**Before Fixes:**

- ❌ Captains could not acknowledge AUTO flow bookings
- ❌ Message pages crashed when viewing guest bookings
- ❌ Migration blocked by critical bugs

**After Fixes:**

- ✅ Both AUTO and MANUAL flows work correctly
- ✅ Guest and registered user data unified
- ✅ Migration ready for deployment

---

## Related Migration Documents

- [Booking Flow Migration Plan](./booking-flow-migration-plan.md)
- [Phase 1 Complete](./booking-flow-migration-phase-1-complete.md)
- [Phase 2 Complete](./booking-flow-migration-phase-2-complete.md)
- [Phase 3 Complete](./booking-flow-migration-phase-3-complete.md)
- [Phase 4 Complete](./booking-flow-migration-phase-4-complete.md)
- [Phase 5 Complete](./booking-flow-migration-phase-5-complete.md)
- [Migration Complete](./booking-flow-migration-complete.md)

---

## Git Commit Message

```bash
fix: resolve booking actions and guest user data issues

Issue 1: PAYMENT_AUTHORIZED booking approval
- Add acknowledge endpoint proxy for AUTO flow bookings
- Update BookingActions to use correct endpoint based on status
- Add status and flowType props to BookingActions component
- Update button text and modals for AUTO vs MANUAL flows
- Add bookingFlowType to booking type definitions

Issue 2: Guest user data retrieval
- Remove references to deleted booking guest fields
- Fetch all user data from User table (works for both guest and registered)
- Simplify message service logic - unified user data path
- Guest bookings now create User with GUEST role

Fixes: #1, #2
```
