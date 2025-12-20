# Captain Payout System - Complete Guide

**Last Updated**: December 4, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## System Overview

The Captain Payout System manages earnings distribution to captains, including commission calculation and manual payout processing.

### Key Features

- ✅ **Earnings dashboard**: View total earnings and pending payouts
- ✅ **Commission tiers**: 10% based only
- ✅ **Immediate visibility**: Admin sees all paid bookings immediately
- ✅ **Custom selection**: Admin can select specific captains for payout
- ✅ **Manual processing**: Admin creates payout batches with optional deductions
- ✅ **Transaction history**: Detailed payout records with bank transfer references

---

## Current Policy (Startup Phase)

### Why Manual Payouts?

As a startup with limited capital, we use a **conservative payout policy**:

1. **Cash flow buffer** - Ensures SenangPay funds have cleared (T+1 to T+3)
2. **Dispute protection** - Allows time for angler complaints/refunds before payout
3. **Verification** - Ensures captain bank details are valid before transfer
4. **Fraud prevention** - Manual review catches suspicious patterns

### Admin vs Captain View

| Perspective | What They See                                                            |
| ----------- | ------------------------------------------------------------------------ |
| **Admin**   | All paid bookings immediately (no filtering)                             |
| **Captain** | "Payment processed within 3-5 business days after trip" (buffer message) |

**Why the difference?**

- **Payment gateway delay**: Money takes 1-3 days to settle from SenangPay to Fishon account
- **Missing bank details**: Some captains haven't provided bank info yet
- **Fraud prevention**: Buffer allows time to detect scams or fake bookings
- **Dispute window**: Anglers can report issues within 72h of trip

### Payout Timeline (Internal)

| Step            | Timeline | Description                                  |
| --------------- | -------- | -------------------------------------------- |
| Booking Paid    | Day 0    | Payment received, visible in admin dashboard |
| Admin Review    | Day 0+   | Admin can process payout anytime             |
| Bank Transfer   | Day 1-3  | Manual transfer to captain's bank            |
| Payout Complete | Day 2-5  | Captain receives funds                       |

**Captain sees**: "3-5 business days after trip" as a safe buffer for all the above steps.

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
  PENDING      // Booking paid, awaiting payout
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

### Payout Process

```
1. View pending payouts
   └─ All PAID/COMPLETED bookings with payoutStatus = PENDING
   └─ No eligibility filtering - admin sees everything immediately

2. Select captains
   └─ Checkbox selection for one or more captains
   └─ Only captains with bank details can be selected

3. Click "Process Payout Now"
   └─ POST /api/admin/finance/payouts/batch
   └─ Creates payout records
   └─ Updates bookings: payoutStatus = SCHEDULED

4. Review and adjust (optional)
   └─ Go to payout detail page
   └─ Adjust deductions if needed
   └─ Approve the payout

5. Manual bank transfer
   └─ Transfer via online banking
   └─ Record transaction reference

6. Mark completed
   └─ POST /api/admin/finance/payouts/[id]/complete
   └─ Payout status: APPROVED → COMPLETED
   └─ Updates bookings: payoutStatus = COMPLETED
```

### Dispute Handling

If angler files complaint:

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
- Message: "Payouts processed within 3-5 business days after trip"
- Recent bookings with earnings
- Bank account status
- Payout history

### Admin Dashboard

**Location**: `/staff/finance/payouts`

- All pending payouts (no eligibility filtering)
- Captains with/without bank details
- Select and process payouts
- Recent payout batches

---

## Captain Communication

### Messaging Guidelines

**Standard message**: "Payouts are processed within 3-5 business days after your trip completes"

This buffer covers:

- Payment gateway settlement (1-3 days)
- Bank details verification
- Manual processing time
- Weekends/holidays

### Email/Notification Triggers

| Event            | Notification                                                       |
| ---------------- | ------------------------------------------------------------------ |
| Trip completed   | "Trip marked complete. Payout processed within 3-5 business days." |
| Payout approved  | "Your payout of RM X has been approved for processing."            |
| Payout completed | "RM X has been transferred to your bank account. Ref: XXX"         |

---

## Testing Checklist

### Earnings Calculation

- [ ] Verify commission by pricing plan (BASIC/SILVER/GOLD)
- [ ] Test multi-day trip calculations
- [ ] Confirm captainEarnings = subtotal - platformFee

### Payout Processing

- [ ] All PAID bookings appear in admin queue immediately
- [ ] Select/deselect captains with checkboxes
- [ ] Captains without bank details cannot be selected
- [ ] "Process Payout Now" creates payout batch
- [ ] Approve updates status correctly
- [ ] Complete updates booking payoutStatus
- [ ] Audit logs created for all actions

### Bank Details

- [ ] Missing bank info shows warning
- [ ] Admin can add bank info via dialog
- [ ] Captain can update via /captain/documents
- [ ] Snapshot captured at payout creation

---

## Future Enhancements (Phase 2+)

When capital reserves allow:

1. **Automated payouts** for trusted captains
2. **Instant payouts** for GOLD plan captains
3. **Email notifications** via @fishon/email package
4. **Captain-facing payout API** endpoints
5. **Bulk deduction management**

---

## Related Documentation

- **Booking System**: `docs/config/BOOKING_SYSTEM.md`
- **Financial Calculations**: `docs/config/FINANCIAL_CALCULATION_SYSTEM.md`
- **Dashboard**: `docs/config/DASHBOARD_ANALYTICS_SYSTEM.md`

---

**Document Maintained By**: Development Team  
**Last Review**: December 4, 2025
