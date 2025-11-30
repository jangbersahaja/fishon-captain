# Captain Payout System - Complete Guide

**Last Updated**: November 30, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## System Overview

The Captain Payout System manages earnings distribution to captains, including commission calculation, eligibility tracking, and manual payout processing.

### Key Features

- ✅ **Earnings dashboard**: View total earnings and pending payouts
- ✅ **Commission tiers**: 5%, 8%, or 10% based on pricing plan (GOLD/SILVER/BASIC)
- ✅ **Payout eligibility**: 3-5 business days after trip completion
- ✅ **Manual processing**: Weekly admin batch payouts (startup phase)
- ✅ **Transaction history**: Detailed payout records with bank transfer references

---

## Current Policy (Startup Phase)

### Why Manual Payouts?

As a startup with limited capital, we use a **conservative payout policy**:

1. **Cash flow buffer** - Ensures SenangPay funds have cleared (T+1 to T+3)
2. **Dispute protection** - Allows time for angler complaints/refunds before payout
3. **Operational safety** - Trip must actually complete before captain receives payment
4. **Industry standard** - Similar to Grab, Airbnb (24h-7 days post-service)

### Payout Timeline

| Step               | Timeline | Description                                  |
| ------------------ | -------- | -------------------------------------------- |
| Trip Completed     | Day 0    | Captain marks trip as COMPLETED              |
| Eligibility Buffer | Day 1-3  | Wait for payment settlement + dispute window |
| Payout Eligible    | Day 3-5  | Admin can include in payout batch            |
| Bank Transfer      | Day 5-7  | Manual transfer to captain's bank            |
| Payout Complete    | Day 7-10 | Captain receives funds                       |

### Eligibility Rules

- **Trigger**: Booking status = `COMPLETED` (trip finished)
- **Buffer**: 3 business days after trip completion
- **Disputes**: Payout held if complaint filed within 72h of trip
- **Minimum**: RM 50 per payout

---

## Architecture

### Database Schema

**fishon-captain (Payout model)**:

```prisma
enum PayoutStatus {
  PENDING      // Created, awaiting approval
  APPROVED     // Approved, awaiting bank transfer
  PROCESSING   // Bank transfer initiated
  COMPLETED    // Funds transferred successfully
  FAILED       // Transfer failed
  CANCELLED    // Cancelled by admin
}

model Payout {
  id                String        @id @default(cuid())
  batchId           String        @unique  // e.g., "2025-W48-abc123"
  ownerId           String                 // Captain user ID
  periodStart       DateTime
  periodEnd         DateTime
  totalEarnings     Decimal(10,2)          // Sum of captainEarnings
  deductions        Decimal(10,2) @default(0)
  netPayout         Decimal(10,2)          // totalEarnings - deductions
  bookingIds        String[]               // Array of booking IDs
  bookingCount      Int
  bankName          String                 // Snapshot at creation
  accountNumber     String
  accountHolder     String
  status            PayoutStatus  @default(PENDING)
  transferReference String?                // Bank transaction ID
  createdBy         String                 // Staff user ID
  approvedBy        String?                // Admin user ID
}
```

**fishon-market (Booking financial fields)**:

```prisma
model Booking {
  // Financial tracking
  platformFee      Decimal?      // Fishon commission (10% of subtotal)
  serviceFee       Decimal?      // Gateway fee (1.5%)
  captainEarnings  Decimal?      // Captain net (subtotal - platformFee)
  payoutStatus     PayoutStatus? @default(PENDING)
  payoutBatchId    String?       // Links to Payout.batchId
}

enum PayoutStatus {
  PENDING      // Trip completed, awaiting eligibility
  SCHEDULED    // Included in payout batch
  PROCESSING   // Bank transfer initiated
  COMPLETED    // Funds transferred
  FAILED       // Transfer failed
  ON_HOLD      // Flagged for dispute review
}
```

---

## Commission Tiers

### Pricing Plans

| Plan   | Commission Rate | Description              |
| ------ | --------------- | ------------------------ |
| BASIC  | 10%             | Default for new charters |
| SILVER | 8%              | High-performing charters |
| GOLD   | 5%              | Premium partners         |

### Calculation Example

```typescript
// Booking: RM 500 (1 day trip)
// Charter Plan: SILVER (8% commission)

const subtotal = 500; // tripPrice * days
const platformFee = 500 * 0.08; // RM 40
const captainEarnings = 500 - 40; // RM 460
```

---

## Admin Workflow

### Weekly Payout Process (Every Monday)

```
1. Review eligible bookings
   └─ Status: COMPLETED
   └─ Trip date: 7+ days ago (includes 3-5 day buffer)
   └─ Payout status: PENDING
   └─ No active disputes

2. Create payout batch
   └─ POST /api/admin/finance/payouts/batch
   └─ Updates bookings: payoutStatus = SCHEDULED

3. Review and approve
   └─ POST /api/admin/finance/payouts/[id]/approve
   └─ Payout status: PENDING → APPROVED

4. Manual bank transfer
   └─ Transfer via online banking
   └─ Record transaction reference

5. Mark completed
   └─ POST /api/admin/finance/payouts/[id]/complete
   └─ Payout status: APPROVED → COMPLETED
   └─ Updates bookings: payoutStatus = COMPLETED
```

### Dispute Handling

If angler files complaint within 72h of trip:

1. Set `payoutStatus: ON_HOLD` on booking
2. Resolve dispute with captain/angler
3. Either release payout or process refund

---

## API Endpoints

### Captain View (Server-side only for now)

- Earnings data fetched via `getCaptainEarningsSummary(userId)`
- Payout history via `getCaptainPayoutHistory(userId)`

### Admin Endpoints

| Endpoint                                   | Method | Description         |
| ------------------------------------------ | ------ | ------------------- |
| `/api/admin/finance/stats`                 | GET    | Revenue statistics  |
| `/api/admin/finance/payouts/batch`         | POST   | Create payout batch |
| `/api/admin/finance/payouts/[id]/approve`  | POST   | Approve payout      |
| `/api/admin/finance/payouts/[id]/complete` | POST   | Mark as completed   |

---

## Dashboard Locations

### Captain Dashboard

**Location**: `/captain/earnings`

- Total earnings (all time, by period)
- Pending settlement amount
- Payout eligibility info
- Recent bookings with earnings
- Bank account status
- Payout history

### Admin Dashboard

**Location**: `/staff/finance/payouts`

- Pending payout calculations
- Captains ready for payout (with bank details)
- Recent payout batches
- Eligibility status per booking

---

## Captain Communication

### Messaging Guidelines

**Instead of**: "Your payout will be processed on [specific date]"

**Use**: "Payouts are processed 3-5 business days after trip completion"

### Email/Notification Triggers

| Event            | Notification                                                  |
| ---------------- | ------------------------------------------------------------- |
| Trip completed   | "Trip marked complete. Payout eligible in 3-5 business days." |
| Payout approved  | "Your payout of RM X has been approved for processing."       |
| Payout completed | "RM X has been transferred to your bank account. Ref: XXX"    |

---

## Testing Checklist

### Earnings Calculation

- [ ] Verify commission by pricing plan (BASIC/SILVER/GOLD)
- [ ] Test multi-day trip calculations
- [ ] Confirm captainEarnings = subtotal - platformFee

### Payout Eligibility

- [ ] Only COMPLETED bookings appear in admin queue
- [ ] Trips < 3 days old excluded from eligible list
- [ ] ON_HOLD bookings excluded

### Payout Processing

- [ ] Batch creation groups by captain
- [ ] Approve updates status correctly
- [ ] Complete updates booking payoutStatus
- [ ] Audit logs created for all actions

### Bank Details

- [ ] Missing bank info shows warning
- [ ] Captain can update via /captain/documents
- [ ] Snapshot captured at payout creation

---

## Future Enhancements (Phase 2+)

When capital reserves allow:

1. **Reduce buffer to 24-48h** for trusted captains
2. **Automated weekly batches** via cron job
3. **Instant payouts** for GOLD plan captains
4. **Email notifications** via @fishon/email package
5. **Captain-facing payout API** endpoints

---

## Related Documentation

- **Booking System**: `docs/config/BOOKING_SYSTEM.md`
- **Financial Calculations**: `docs/config/FINANCIAL_CALCULATION_SYSTEM.md`
- **Dashboard**: `docs/config/DASHBOARD_ANALYTICS_SYSTEM.md`

---

**Document Maintained By**: Development Team  
**Last Review**: November 30, 2025
