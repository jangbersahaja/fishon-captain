## Phase 2 Complete: Payout Detail Page

Successfully built the payout detail page with visual timeline and booking breakdown components. Captains can now view comprehensive details about individual payouts including status progression, bank information, and itemized booking earnings.

**Files created/changed:**

- src/app/(portal)/captain/payouts/[id]/page.tsx
- src/app/(portal)/captain/payouts/\_components/PayoutTimeline.tsx
- src/app/(portal)/captain/payouts/\_components/PayoutBookingList.tsx

**Functions created/changed:**

- maskAccountNumber() - Masks bank account numbers to show only last 4 digits
- PayoutStatusBadge() - Status badge component with color-coded styling
- PayoutTimeline() - Visual timeline showing payout progress through 4 stages
- PayoutBookingList() - Detailed table of bookings with earnings breakdown

**Tests created/changed:**

- None (manual testing required)

**Review Status:** APPROVED

**Git Commit Message:**
feat: add payout detail page with timeline and booking breakdown

- Create payout detail page at /captain/payouts/[id] with ownership verification
- Add visual timeline component showing 4-stage payout progression
- Build booking breakdown table with mobile-responsive design
- Include masked bank account details and transfer reference
- Display earnings breakdown per booking with totals
