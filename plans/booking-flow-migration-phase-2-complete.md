## Phase 2 Complete: Update Business Logic

Phase 2 successfully updates all business logic to use the new dual booking flow status enum (PENDING, PAYMENT_AUTHORIZED, AWAITING_PAYMENT) instead of the legacy statuses (PAYMENT_PENDING, APPROVED).

**Files created/changed:**

- src/lib/booking-service.ts
- src/lib/booking-priority.ts
- src/app/(portal)/captain/bookings/[id]/page.tsx
- src/components/captain/BookingStatsCards.tsx
- src/components/captain/BookingTabs.tsx
- src/components/captain/EnhancedBookingCard.tsx

**Functions created/changed:**

- `getPendingBookings()` - Now fetches both PENDING and PAYMENT_AUTHORIZED bookings
- `isNewRequest()` - Checks both PENDING (24h deadline) and PAYMENT_AUTHORIZED (12h deadline)
- `isPaymentPending()` - Uses AWAITING_PAYMENT instead of APPROVED
- `getPriorityBookings()` - Calculates urgency with different thresholds for PAYMENT_AUTHORIZED (higher priority)
- `filterByTab()` - Requests tab now shows PENDING + PAYMENT_AUTHORIZED
- `getStatusColor()` - Uses new status values in detail page and card
- `getStatus()` - Maps new statuses to display text
- `getStatusIcon()` - Uses new statuses for icon selection

**Key Changes:**

1. **Booking Service** (`booking-service.ts`):
   - `getPendingBookings()` now fetches both PENDING (manual flow awaiting approval) and PAYMENT_AUTHORIZED (auto flow awaiting acknowledgment)
   - Updated to use Promise.all for parallel fetching

2. **Priority Calculation** (`booking-priority.ts`):
   - `isNewRequest()` checks both PENDING (24h deadline) and PAYMENT_AUTHORIZED (12h deadline)
   - PAYMENT_AUTHORIZED has higher urgency thresholds (4h/8h vs 6h/12h)
   - `isPaymentPending()` uses AWAITING_PAYMENT (manual flow after captain approval)
   - `filterByTab()` requests tab shows both new request types

3. **Booking Detail Page** (`bookings/[id]/page.tsx`):
   - All status comparisons updated: PAYMENT_AUTHORIZED, AWAITING_PAYMENT
   - Status badges, colors, icons all use new enum values
   - Payment flow info displays correctly for PAYMENT_AUTHORIZED bookings
   - BookingActions only shown for PAYMENT_AUTHORIZED status

4. **UI Components**:
   - **BookingStatsCards**: Upcoming bookings filter uses AWAITING_PAYMENT + PAID
   - **BookingTabs**:
     - Requests tab: PENDING + PAYMENT_AUTHORIZED
     - Approved tab: AWAITING_PAYMENT + PAID
   - **EnhancedBookingCard**: Status display, colors, and action buttons updated

**Status Mapping Summary:**

- `PAYMENT_PENDING` → `PAYMENT_AUTHORIZED` (auto flow: payment held, awaiting captain acknowledgment)
- `APPROVED` → `AWAITING_PAYMENT` (manual flow: captain approved, awaiting angler payment)
- `PENDING` → `PENDING` (manual flow: awaiting captain approval)

**Priority Logic:**

- PAYMENT_AUTHORIZED: Highest priority (12h deadline, urgent 4h/8h thresholds)
- PENDING: Standard priority (24h deadline, urgent 6h/12h thresholds)
- AWAITING_PAYMENT: Lower priority (48h deadline)

**Review Status:** ✅ APPROVED

All 26 TypeScript errors resolved. Business logic correctly handles dual booking flows.

**Git Commit Message:**

```
feat: migrate captain app to new booking flow statuses

- Update getPendingBookings to fetch PENDING + PAYMENT_AUTHORIZED
- Add priority differentiation: PAYMENT_AUTHORIZED (12h) vs PENDING (24h)
- Update isPaymentPending to use AWAITING_PAYMENT
- Replace PAYMENT_PENDING with PAYMENT_AUTHORIZED in UI
- Replace APPROVED with AWAITING_PAYMENT in UI
- Fix all status checks in detail page and components
- All TypeScript errors resolved (26 type errors fixed)
```
