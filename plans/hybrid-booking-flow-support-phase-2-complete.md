## Phase 2 Complete: TypeScript Type Updates

Updated all TypeScript types to reflect the new booking schema with hybrid payment flow, time-based bookings, and participant tracking.

**Files created/changed:**
- `src/lib/market-db.ts`
- `src/lib/enrich-booking.ts`
- `src/lib/booking-service.ts`
- `src/components/captain/EnhancedBookingCard.tsx`
- `src/components/captain/BookingTabs.tsx`
- `src/components/captain/calendar/CharterCalendar.tsx`
- `src/app/(portal)/captain/bookings/[id]/page.tsx`

**Functions created/changed:**
- `parseParticipants()` - Parse participants from guests JSON
- `formatTimeSlots()` - Format time slots for display (e.g., "Day 1: Fri, Nov 15 • 8:00 AM - 12:00 PM")
- `enrichBooking()` - Updated to use primaryBooker and format time slots
- `getBookingStats()` - Added PAYMENT_PENDING: 0 to fallback return

**Tests created/changed:**
- None (no automated tests exist yet)

**Review Status:** APPROVED

**Git Commit Message:**
feat: update booking types for hybrid flow and time-based system

- Add PAYMENT_PENDING status support across all booking components
- Replace guestFirstName/guestLastName with primaryBooker from participants
- Add BookingParticipant and BookingTimeSlot helper types
- Implement parseParticipants() and formatTimeSlots() utility functions
- Update EnrichedMarketBooking with allParticipants and formattedTimeSlots fields
- Remove guestEmail and guestPhone (not stored in booking anymore)
- Add new schema fields: timeSlots, serviceFee, captainResponse, chatId, payment flow fields
- Update 7 files to handle new guest model and time-based bookings
