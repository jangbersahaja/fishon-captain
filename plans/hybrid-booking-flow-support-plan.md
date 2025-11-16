# Plan: Hybrid Booking Flow Support in fishon-captain

This plan implements full support for the hybrid booking flow (TOKENIZED vs DIRECT payment) in the fishon-captain dashboard, ensuring captains can properly manage bookings with the new `PAYMENT_PENDING` status and understand payment flow differences.

**⚠️ UPDATED**: Plan updated to reflect major schema changes in fishon-market (time slots, guest model changes, participant list)

**Phases: 6**

---

## Phase 1: Schema Sync & Database Client Update

**Objective:** ✅ **COMPLETED** - Sync `schema-market.prisma` with current fishon-market database schema

**Files Modified:**

- ✅ `prisma/schema-market.prisma` - Synced with fishon-market schema

**Major Changes Applied:**

1. ✅ **Booking Model Updates:**
   - Added `timeSlots Json?` field for time-based scheduling (multi-trip support)
   - Removed guest fields: `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone`, `emailVerified`
   - Updated `guests` JSON structure to include `participants` array with emergency contact
   - Added `serviceFee` field for payment gateway charges
   - Added `captainResponse` and `chatId` fields
   - Reordered fields with clear section comments

2. ✅ **MarketUser Model Updates:**
   - Added `UserRole` enum (ANGLER, GUEST, ADMIN)
   - Added `firstName`, `lastName`, `bio`, `role`, `emailVerified` fields
   - Added address fields: `streetAddress`, `city`, `state`, `postcode`, `country`
   - Added emergency contact fields: `emergencyName`, `emergencyPhone`, `emergencyRelation`
   - Note: Guest bookings now register users with role GUEST instead of storing guest details on Booking

3. ✅ **AnalyticsEventType Updates:**
   - Added `PAYMENT_AUTHORIZED`, `PAYMENT_CAPTURED`, `PAYMENT_RELEASED`, `PAYMENT_REFUNDED`

**Next Steps:**

1. Run `npx prisma generate` to regenerate Prisma client with updated types
2. Proceed to Phase 2 to update TypeScript types

---

## Phase 2: TypeScript Type Updates

**Objective:** Update TypeScript types to recognize new booking fields and payment flow fields

**Files/Functions to Modify/Create:**

- `src/lib/market-db.ts` - Add new fields to `MarketBooking` type
- `src/lib/enrich-booking.ts` - Add new fields to `EnrichedMarketBooking` type
- `src/lib/booking-priority.ts` - Update priority logic to handle `PAYMENT_PENDING` status

**Tests to Write:**

- `src/lib/__tests__/booking-priority.test.ts` - Test PAYMENT_PENDING bookings are flagged as high priority
- `src/lib/__tests__/enrich-booking.test.ts` - Test enrichment includes payment flow fields and timeSlots

**Steps:**

1. Update `MarketBooking` type in `market-db.ts`:
   - Add `timeSlots: unknown | null` for time-based scheduling
   - Add `serviceFee: Decimal | null` for payment gateway charges
   - Add `captainResponse: string | null` for captain's response message
   - Add `chatId: string | null` for conversation link
   - Update `guests: unknown` to include participants array structure
   - Remove `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone`, `emailVerified`
   - Add payment flow fields: `paymentFlow`, `paymentMethod`, `paymentIntentId`, `paymentAuthorizedAt`, `paymentCapturedAt`, `paymentReleasedAt`

2. Update `EnrichedMarketBooking` type in `enrich-booking.ts`:
   - Add same new fields as MarketBooking
   - Add helper method to parse `guests.participants` array
   - Add helper method to format time slots for display

3. Update `getPriorityBookings()` in `booking-priority.ts`:
   - Treat `PAYMENT_PENDING` same as `PENDING` (urgent new requests)
   - Calculate urgency based on `expiresAt` timestamp

4. Write tests for priority calculation with PAYMENT_PENDING status
5. Write tests for guest participant parsing from JSON
6. Write tests for time slot formatting
7. Run tests to ensure they pass

**Files/Functions to Modify/Create:**

- `prisma/schema.prisma` - Add `PAYMENT_PENDING` to `NotificationType` enum (already has PAYMENT_PENDING in enum, verify it's complete)
- `src/lib/market-db.ts` - Add payment flow fields to `MarketBooking` type
- `src/lib/enrich-booking.ts` - Add payment flow fields to `EnrichedMarketBooking` type
- `src/lib/booking-priority.ts` - Update priority logic to handle `PAYMENT_PENDING` status

**Tests to Write:**

- `src/lib/__tests__/booking-priority.test.ts` - Test PAYMENT_PENDING bookings are flagged as high priority
- `src/lib/__tests__/enrich-booking.test.ts` - Test enrichment includes payment flow fields

**Steps:**

1. Review current `NotificationType` enum - ensure PAYMENT_PENDING exists
2. Add payment flow fields to `MarketBooking` type:
   - `paymentFlow: "TOKENIZED" | "DIRECT" | "MOCK" | null`
   - `paymentMethod: "CARD" | "FPX" | "EWALLET" | null`
   - `paymentIntentId: string | null`
   - `paymentTransactionId: string | null`
   - `paymentAuthorizedAt: Date | null`
   - `paymentCapturedAt: Date | null`
   - `paymentReleasedAt: Date | null`
3. Add same fields to `EnrichedMarketBooking` type
4. Update `getPriorityBookings()` to treat `PAYMENT_PENDING` same as `PENDING` (urgent new requests)
5. Write tests for priority calculation with PAYMENT_PENDING status
6. Run tests to ensure they pass

---

## Phase 3: Booking Service & Market DB Updates

**Objective:** Update booking service to fetch and handle PAYMENT_PENDING bookings correctly, and handle new schema fields

**Files/Functions to Modify/Create:**

- `src/lib/market-db.ts` - Update `fetchBookingsByStatus()` to include PAYMENT_PENDING
- `src/lib/booking-service.ts` - Update `getPendingBookings()` to fetch PAYMENT_PENDING
- `src/lib/booking-priority.ts` - Update `isNewRequest()` to include PAYMENT_PENDING
- `src/lib/enrich-booking.ts` - Update to handle removed guest fields and new participant structure

**Tests to Write:**

- `src/lib/__tests__/booking-service.test.ts` - Test getPendingBookings returns both PENDING and PAYMENT_PENDING
- `src/lib/__tests__/market-db.test.ts` - Test fetchBookingsByStatus handles PAYMENT_PENDING
- `src/lib/__tests__/enrich-booking.test.ts` - Test guest data extraction from MarketUser instead of Booking

**Steps:**

1. Update `fetchBookingsByStatus()` to accept `PAYMENT_PENDING` as valid status
2. Update `getPendingBookings()` to fetch both `PENDING` and `PAYMENT_PENDING` statuses
3. Update `isNewRequest()` in booking-priority.ts:
   - Check `booking.status === "PENDING" || booking.status === "PAYMENT_PENDING"`
4. Update `enrich-booking.ts` to handle new guest model:
   - Remove logic that extracts `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone` from Booking
   - Add logic to fetch guest details from MarketUser when `booking.userId` exists
   - Parse `guests.participants` array for participant list
5. Write tests for fetching PAYMENT_PENDING bookings
6. Write tests for priority detection of PAYMENT_PENDING bookings
7. Write tests for guest data enrichment from MarketUser model
8. Run tests to ensure they pass

---

## Phase 4: UI Component Updates for Payment Flow Display

**Objective:** Update booking display components to show payment flow information and status badges

**Files/Functions to Modify/Create:**

- `src/components/captain/EnhancedBookingCard.tsx` - Add payment flow badge and explanation
- `src/components/captain/BookingTabs.tsx` - Update requests filter to include PAYMENT_PENDING
- `src/components/captain/PriorityBookings.tsx` - Display payment flow type for priority bookings
- `src/components/captain/BookingStatsCards.tsx` - Update stats to count PAYMENT_PENDING separately

**Tests to Write:**

- No unit tests needed (visual components)
- Manual testing checklist will be provided

**Steps:**

1. Update `BookingTabs.tsx` line ~152:
   - Change `b.status === "PENDING"` to `b.status === "PENDING" || b.status === "PAYMENT_PENDING"`
2. Update `BookingTabs.tsx` line ~158 (upcoming filter):
   - Add `"PAYMENT_PENDING"` to the status array check
3. Update `EnhancedBookingCard.tsx` to display payment flow badge:
   - Show "💳 Card Held" for TOKENIZED flow (blue badge)
   - Show "✅ Already Paid" for DIRECT flow (green badge)
   - Add tooltip/explanation text
4. Update `BookingStatsCards.tsx` to show PAYMENT_PENDING count:
   - Add new card: "Awaiting Approval" with PAYMENT_PENDING count
   - Style with amber/yellow color to indicate urgency
5. Update `PriorityBookings.tsx` to show payment flow information
6. Manual test: Create test booking with PAYMENT_PENDING status, verify it appears in UI

---

## Phase 5: Booking Detail Page Payment Flow Context

**Objective:** Update booking detail page to display comprehensive payment flow information and handle approval/rejection correctly

**Files/Functions to Modify/Create:**

- `src/app/(portal)/captain/bookings/[id]/page.tsx` - Add payment flow explanation boxes
- `src/app/(portal)/captain/bookings/BookingActions.tsx` - Update approval modal with payment flow warnings

**Tests to Write:**

- No unit tests needed (visual components)
- Manual testing checklist will be provided

**Steps:**

1. Update `page.tsx` line ~150 (status badge section):
   - Add payment flow badge display (already exists, verify it shows correctly)
2. Update `page.tsx` line ~166 (payment flow info box):
   - Verify TOKENIZED explanation mentions card will be charged on approval
   - Verify DIRECT explanation mentions refund will be processed on rejection
3. Update `page.tsx` line ~202 (BookingActions condition):
   - Already includes PAYMENT_PENDING check, verify it works
4. Update `BookingActions.tsx` approval modal:
   - Add conditional text based on payment flow:
     - TOKENIZED: "Customer's card will be charged immediately upon approval"
     - DIRECT: "This booking is already paid. Approval confirms the trip."
     - MOCK: "Mock payment - test mode only"
5. Update `BookingActions.tsx` rejection modal:
   - Add conditional text based on payment flow:
     - TOKENIZED: "Card authorization will be released with no charge"
     - DIRECT: "A full refund will be processed automatically (may take 3-5 business days)"
     - MOCK: "Mock payment - test mode only"
6. Manual test: Open booking detail page with PAYMENT_PENDING status, verify all text displays correctly

---

## Phase 6: Webhook Handler Updates & Notifications

**Objective:** Update webhook handler to create appropriate notifications for hybrid flow events

**Files/Functions to Modify/Create:**

- `src/app/api/webhooks/booking/route.ts` - Add handlers for new webhook types
- `src/lib/services/notification-service.ts` - Verify notification types are available

**Tests to Write:**

- `src/app/api/webhooks/__tests__/booking-webhook.test.ts` - Test new webhook handlers
- `src/lib/services/__tests__/notification-service.test.ts` - Test notification creation

**Steps:**

1. Review current webhook handler - it handles `booking.created`, `booking.cancelled`, `booking.paid`
2. Add handler for `booking.payment_authorized` webhook type:
   - Create `PAYMENT_PENDING` notification (if not already handled by `booking.created`)
   - Title: "Payment Authorized! 💳"
   - Message: "{angler} authorized payment for {charter}. Respond within 12 hours."
   - Action: "Review & Approve"
3. Add handler for `booking.payment_captured` webhook type:
   - Create `BOOKING_PAID` notification (may already exist)
   - Title: "Payment Received! 💰"
   - Message: "{angler}'s payment has been captured successfully. Trip confirmed!"
4. Add handler for `booking.payment_released` webhook type:
   - Create notification
   - Title: "Authorization Released"
   - Message: "Card authorization for {angler}'s booking has been released (no charge)"
5. Add handler for `booking.refund_pending` webhook type:
   - Create notification
   - Title: "Refund Processing"
   - Message: "Refund initiated for {angler}'s booking. Will complete in 3-5 business days."
6. Add handler for `booking.refund_completed` webhook type:
   - Create notification
   - Title: "Refund Completed"
   - Message: "Refund for {angler}'s booking has been successfully completed"
7. Write tests for each webhook handler
8. Run tests to ensure they pass
9. Manual test: Trigger webhooks from fishon-market, verify notifications appear in captain dashboard

---

## Schema Changes Summary (November 16, 2025)

**Critical Changes in fishon-market Database:**

1. **Time-Based Scheduling** (`timeSlots` field):
   - Bookings now store individual time slots per day
   - Enables multiple bookings per day when time ranges don't overlap
   - Structure: `[{ day: 1, date: "2025-11-13", startDateTime: "...", endDateTime: "..." }]`
   - Ref: `/Users/jangbersahaja/Website/fishon-market/docs/TIME_BASED_BOOKING_IMPLEMENTATION_COMPLETE.md`

2. **Guest Model Refactor**:
   - Guest details removed from Booking model
   - Guest bookings now create User with role GUEST
   - All guest info retrieved from MarketUser model
   - **Backward compatibility**: Old bookings may still have `guestFirstName`, etc. (handle gracefully)

3. **Participant List** (`guests` JSON expansion):
   - New structure: `{ adults, children, participants: [{ name, phone, isBooker }] }`
   - Enables emergency contact tracking per participant
   - Captain can see who is the primary booker

4. **Emergency Contact** (MarketUser model):
   - Added to User: `emergencyName`, `emergencyPhone`, `emergencyRelation`
   - Displayed in booking details for safety purposes

---

## Open Questions

1. **Notification Preferences**: Should captains be able to opt-out of payment flow notifications, or are they always critical?
2. **Email Notifications**: Should we send email notifications for PAYMENT_PENDING bookings in addition to in-app notifications? (Likely yes for urgency)
3. **Expiration Handling**: Should we show countdown timer for PAYMENT_PENDING bookings (12-hour deadline)? Or is the existing priority system sufficient?
4. **Testing Dashboard**: Should we add a testing page in fishon-captain to create mock PAYMENT_PENDING bookings for local testing?
5. **Analytics**: Should we track captain response times for PAYMENT_PENDING bookings separately from legacy PENDING bookings?
6. **Time Slot Display**: How should we display time slots in the booking calendar view? Show individual slots or aggregate by day?
7. **Participant List Display**: Should we show full participant list in booking card or only in detail page? Privacy considerations?
