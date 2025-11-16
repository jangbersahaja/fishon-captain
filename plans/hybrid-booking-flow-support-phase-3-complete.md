## Phase 3 Complete: Booking Service & Market DB Updates

Updated booking service and priority logic to treat PAYMENT_PENDING status as urgent requests requiring captain action, ensuring hybrid payment flow bookings are properly surfaced.

**Files created/changed:**

- `src/lib/booking-service.ts`
- `src/lib/booking-priority.ts`

**Functions created/changed:**

- `getPendingBookings()` - Now fetches both PENDING and PAYMENT_PENDING statuses, sorted by creation date
- `isNewRequest()` - Updated to include PAYMENT_PENDING bookings < 24h old as urgent requests
- `filterBookingsByTab()` - Updated "requests" tab to include both PENDING and PAYMENT_PENDING bookings

**Tests created/changed:**

- None (no automated tests exist yet)

**Review Status:** APPROVED

**Git Commit Message:**
feat: add PAYMENT_PENDING support to booking service and priority logic

- Update getPendingBookings to fetch both PENDING and PAYMENT_PENDING bookings
- Treat PAYMENT_PENDING as urgent new requests in priority system
- Include PAYMENT_PENDING in requests tab filter
- Add documentation for hybrid payment flow (TOKENIZED with pre-auth)
- Sort combined pending bookings by creation date (newest first)
