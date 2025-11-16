# Booking Flow Migration Plan for Fishon Captain

## Current Status

Fishon Captain currently uses **legacy booking status enum** which doesn't align with the new dual booking flow (MANUAL + AUTO) implemented in fishon-market.

### Legacy Status (Currently in fishon-captain)

```typescript
"PENDING" |
  "APPROVED" |
  "PAYMENT_PENDING" |
  "REJECTED" |
  "EXPIRED" |
  "PAID" |
  "CANCELLED" |
  "COMPLETED";
```

### New Status (fishon-market)

```typescript
// Manual flow
"PENDING"; // Awaiting captain approval (no payment yet)
"AWAITING_PAYMENT"; // Approved, awaiting payment (48h deadline)

// Auto flow
"PAYMENT_AUTHORIZED"; // Payment secured, awaiting captain acknowledgment (12h deadline)

// Common statuses
"PAID"; // Payment confirmed, trip confirmed
"UNDER_REVIEW"; // Admin reviewing (manual dispute handling)
"COMPLETED"; // Trip completed
"REJECTED"; // Captain rejected
"CANCELLED"; // Angler cancelled
"EXPIRED"; // Deadline expired
```

---

## Migration Strategy

### Phase 1: Update Type Definitions ✅ FIRST

**Files to Update:**

1. **`src/lib/market-db.ts`**
   - Update `MarketBooking["status"]` type to include new statuses
   - Remove `APPROVED` (legacy)
   - Add `AWAITING_PAYMENT`, `PAYMENT_AUTHORIZED`, `UNDER_REVIEW`
   - Update `PrismaMarketBooking` type
   - Update `countBookingsByStatus()` return type

2. **`src/lib/enrich-booking.ts`** (if exists)
   - Update any status-related type definitions
   - Check for any status filtering logic

---

### Phase 2: Update Business Logic

**Files to Update:**

1. **`src/lib/booking-service.ts`**
   - ✅ Update `getPendingBookings()`:
     - Currently fetches `PAYMENT_PENDING` only
     - Should fetch `PENDING` (manual flow) + `PAYMENT_AUTHORIZED` (auto flow)
   - ✅ Update `getBookingStats()` return type
   - ✅ Update `approveBooking()` and `rejectBooking()` logic if needed

2. **`src/lib/booking-priority.ts`** (if exists)
   - Update priority calculation logic to handle new statuses
   - `PAYMENT_AUTHORIZED` should be highest priority (auto flow, payment already held)
   - `PENDING` should be next (manual flow, awaiting approval)

3. **`src/app/api/webhooks/booking/route.ts`**
   - ✅ Update webhook event handling:
     - `booking.created` → Handle both PENDING (manual) and PAYMENT_AUTHORIZED (auto)
     - `booking.payment_pending` → Legacy, might need to be removed
     - ✅ Add `booking.payment_authorized` → New auto flow event
     - ✅ Add `booking.awaiting_payment` → New manual flow event after approval
   - ✅ Update notification creation logic for new statuses

---

### Phase 3: Update UI Components

**Files to Update:**

1. **`src/components/captain/BookingTabs.tsx`**
   - Update tab filters to handle new statuses
   - Group `PENDING` + `PAYMENT_AUTHORIZED` as "Requires Action"
   - Group `AWAITING_PAYMENT` as "Pending Payment"
   - Remove `APPROVED` filter

2. **`src/components/captain/BookingStatsCards.tsx`**
   - Update stat cards to show:
     - "Requires Action" = PENDING + PAYMENT_AUTHORIZED
     - "Awaiting Payment" = AWAITING_PAYMENT
     - Remove "Approved" card

3. **`src/components/captain/BookingCalendar.tsx`**
   - Update status badge colors/labels
   - Handle new status display

4. **`src/components/captain/PriorityBookings.tsx`**
   - Update priority sorting to prioritize PAYMENT_AUTHORIZED highest
   - Display urgency badges based on new deadlines

5. **Booking Detail Pages** (if they exist)
   - Update status badges
   - Update action buttons (approve/reject) visibility based on status
   - Show different CTAs for PENDING vs PAYMENT_AUTHORIZED
   - Display payment info for PAYMENT_AUTHORIZED bookings

---

### Phase 4: Update Notification Types

**Files to Update:**

1. **Notification Service** (if exists in captain app)
   - Add notification type: `PAYMENT_AUTHORIZED` (urgent, auto flow)
   - Update `BOOKING_RECEIVED` to indicate flow type (manual/auto)

2. **Notification Preferences** (if configurable)
   - Allow captains to configure notification preferences per flow type

---

### Phase 5: Update Admin/Staff Dashboards

**Files to Update:**

1. **Admin Booking Management** (if exists)
   - Update filters to include new statuses
   - Update bulk actions to handle new statuses
   - Add flow type indicator (MANUAL vs AUTO)

---

## Status Mapping Guide

### Legacy → New Status Mapping

| Legacy Status     | New Status(es)       | Notes                                                  |
| ----------------- | -------------------- | ------------------------------------------------------ |
| `PENDING`         | `PENDING`            | ✅ Keep - Manual flow awaiting approval                |
| `APPROVED`        | `AWAITING_PAYMENT`   | ❌ Remove - Replaced by AWAITING_PAYMENT (manual flow) |
| `PAYMENT_PENDING` | `PAYMENT_AUTHORIZED` | ⚠️ Rename - Auto flow with payment held                |
| `PAID`            | `PAID`               | ✅ Keep - Payment confirmed                            |
| `REJECTED`        | `REJECTED`           | ✅ Keep - Captain rejected                             |
| `EXPIRED`         | `EXPIRED`            | ✅ Keep - Deadline passed                              |
| `CANCELLED`       | `CANCELLED`          | ✅ Keep - Angler cancelled                             |
| `COMPLETED`       | `COMPLETED`          | ✅ Keep - Trip finished                                |
| N/A               | `AWAITING_PAYMENT`   | ✅ Add - Manual flow after approval                    |
| N/A               | `PAYMENT_AUTHORIZED` | ✅ Add - Auto flow with payment held                   |
| N/A               | `UNDER_REVIEW`       | ✅ Add - Admin dispute handling                        |

---

## Priority Order for UI Display

1. **🔴 URGENT** - `PAYMENT_AUTHORIZED` (auto flow, payment held, 12h deadline)
2. **🟠 HIGH** - `PENDING` (manual flow, awaiting approval, 24h deadline)
3. **🟡 MEDIUM** - `AWAITING_PAYMENT` (manual flow, approved, 48h payment deadline)
4. **🟢 LOW** - `PAID` (confirmed, upcoming trips)
5. **⚪ ARCHIVE** - `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`

---

## Key Behavioral Changes

### For Captains

**Manual Flow (PENDING → AWAITING_PAYMENT → PAID):**

1. Booking arrives as `PENDING`
2. Captain approves → Status changes to `AWAITING_PAYMENT`
3. Angler pays within 48h → Status changes to `PAID`
4. If angler doesn't pay → Status changes to `EXPIRED`

**Auto Flow (PAYMENT_AUTHORIZED → PAID):**

1. Booking arrives as `PAYMENT_AUTHORIZED` (payment already held)
2. Captain acknowledges within 12h → Status changes to `PAID`
3. If captain doesn't acknowledge → Auto-approved, status changes to `PAID`
4. Captain can reject → Payment refunded, status changes to `REJECTED`

---

## Testing Checklist

### Unit Tests

- [ ] Test `market-db.ts` with new status types
- [ ] Test `booking-service.ts` getPendingBookings() returns correct bookings
- [ ] Test `booking-priority.ts` prioritization logic
- [ ] Test webhook handler with new event types

### Integration Tests

- [ ] Create manual flow booking → Verify PENDING status shows correctly
- [ ] Approve manual booking → Verify AWAITING_PAYMENT transition
- [ ] Create auto flow booking → Verify PAYMENT_AUTHORIZED status shows correctly
- [ ] Acknowledge auto booking → Verify PAID transition

### UI Tests

- [ ] Verify booking tabs filter correctly
- [ ] Verify stats cards show correct counts
- [ ] Verify priority bookings display in correct order
- [ ] Verify status badges show correct colors/labels
- [ ] Verify action buttons show/hide based on status

---

## Rollout Strategy

1. **Deploy fishon-captain with backward compatibility**
   - Handle both old and new statuses gracefully
   - Don't break existing webhooks

2. **Monitor for 24 hours**
   - Check logs for any unexpected status values
   - Verify webhook delivery

3. **Update fishon-market to send new webhook events**
   - `booking.payment_authorized` for auto flow
   - `booking.awaiting_payment` for manual flow after approval

4. **Remove legacy `APPROVED` and `PAYMENT_PENDING` handling**
   - After confirming no more legacy events in logs

---

## Environment Variables

No new environment variables required. Existing vars sufficient:

- `MARKET_DATABASE_URL` - Read booking data
- `FISHON_MARKET_API_URL` - Call approve/reject APIs
- `CAPTAIN_API_SECRET` - Webhook authentication

---

## Rollback Plan

If issues arise:

1. Revert fishon-captain deployment
2. Legacy status handling will resume
3. fishon-market can continue using new statuses (backward compatible)
4. Investigate issues before re-deploying

---

## Files Summary

### Critical Path (Must Update)

1. ✅ `src/lib/market-db.ts` - Type definitions
2. ✅ `src/lib/booking-service.ts` - Business logic
3. ✅ `src/app/api/webhooks/booking/route.ts` - Webhook handling
4. ✅ `src/components/captain/BookingTabs.tsx` - UI filters
5. ✅ `src/components/captain/BookingStatsCards.tsx` - Stats display
6. ✅ `src/lib/booking-priority.ts` - Priority calculation

### Secondary (Should Update)

7. `src/components/captain/BookingCalendar.tsx` - Calendar display
8. `src/components/captain/PriorityBookings.tsx` - Priority list
9. Booking detail pages - Status display and actions
10. `src/lib/enrich-booking.ts` - Type updates (if exists)

### Optional (Nice to Have)

11. Admin dashboards - Enhanced filtering
12. Notification preferences - Flow-specific settings
13. Analytics tracking - Flow-type metrics

---

## Next Steps

1. Start with **Phase 1: Type Definitions**
2. Run `npm run typecheck` after each update
3. Update tests as you go
4. Deploy to staging for testing
5. Monitor logs before production deployment
