## Phase 3 Complete: Pending Bookings View

Successfully built the pending bookings page showing all earnings awaiting payout processing. Captains can now see detailed breakdown of pending bookings with comprehensive earning information and payout timeline estimates.

**Files created/changed:**

- src/app/(portal)/captain/payouts/pending/page.tsx
- src/app/(portal)/captain/payouts/\_components/PendingBookingsTable.tsx

**Functions created/changed:**

- PendingBookingsPage() - Main page component with summary card and info section
- PendingBookingsTable() - Responsive table displaying pending bookings

**Tests created/changed:**

- None (manual testing required)

**Review Status:** APPROVED

**Git Commit Message:**
feat: add pending bookings page for captain payout tracking

- Create pending bookings page at /captain/payouts/pending
- Display summary card with total pending earnings and booking count
- Build responsive table showing charter, angler, trip date, and earnings
- Add informational card explaining payout timeline and requirements
- Include empty state handling and mobile-optimized layout
