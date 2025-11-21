# Captain Payout System - Complete Guide

**Last Updated**: November 21, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## System Overview

The Captain Payout System manages earnings distribution to captains, including commission calculation, payout scheduling, and transaction tracking.

### Key Features

- ✅ **Earnings dashboard**: View total earnings and pending payouts
- ✅ **Commission tiers**: 5%, 8%, or 10% based on captain tier
- ✅ **Payout schedule**: Bi-weekly or monthly payouts
- ✅ **Transaction history**: Detailed payout records
- ✅ **Admin tools**: Manual payout processing and adjustments

---

## Architecture

### Database Schema

```prisma
model CaptainProfile {
  commissionRate Float @default(0.08)  // 0.05, 0.08, or 0.10
  payoutSchedule String @default("BIWEEKLY")  // BIWEEKLY | MONTHLY
  bankAccount    BankAccount?
}

model BankAccount {
  id             String  @id @default(cuid())
  captainId      String  @unique
  accountNumber  String
  bankName       String
  accountHolder  String
  captain        CaptainProfile @relation(fields: [captainId], references: [id])
}

model Payout {
  id             String   @id @default(cuid())
  captainId      String
  amount         Float
  commissionRate Float
  grossEarnings  Float
  platformFee    Float
  status         String   // PENDING | PROCESSING | COMPLETED | FAILED
  scheduledDate  DateTime
  completedDate  DateTime?
  reference      String?
  createdAt      DateTime @default(now())
  
  captain        CaptainProfile @relation(fields: [captainId], references: [id])
  bookings       PayoutBooking[]
}

model PayoutBooking {
  payoutId   String
  bookingId  String
  amount     Float
  payout     Payout  @relation(fields: [payoutId], references: [id])
  booking    Booking @relation(fields: [bookingId], references: [id])
  
  @@id([payoutId, bookingId])
}
```

---

## Commission Tiers

### Captain Tiers

| Tier     | Commission Rate | Min Bookings/Month | Requirements              |
| -------- | --------------- | ------------------ | ------------------------- |
| Starter  | 10%             | 0                  | New captains              |
| Standard | 8%              | 5                  | Consistent bookings       |
| Premium  | 5%              | 15                 | High volume, good ratings |

### Calculation Example

```typescript
// Booking: RM 500
// Captain Tier: Standard (8% commission)

const grossEarnings = 500;
const commissionRate = 0.08;
const platformFee = grossEarnings * commissionRate; // RM 40
const captainPayout = grossEarnings - platformFee;  // RM 460
```

---

## Payout Schedule

### Bi-Weekly Payouts (Default)

- **Schedule**: Every 1st and 15th of month
- **Cut-off**: 11:59 PM on payout date
- **Processing**: 1-3 business days
- **Minimum**: RM 50

### Monthly Payouts

- **Schedule**: 1st of each month
- **Cut-off**: Last day of previous month
- **Processing**: 1-3 business days
- **Minimum**: RM 100

### Automatic Payout Process

```typescript
// Cron job runs daily at 1:00 AM
async function processScheduledPayouts() {
  const today = new Date();
  
  // Find captains with pending earnings
  const captains = await prisma.captainProfile.findMany({
    where: {
      OR: [
        // Bi-weekly: 1st and 15th
        { payoutSchedule: "BIWEEKLY", AND: [{ OR: [
          { day: 1 },
          { day: 15 },
        ]}]},
        // Monthly: 1st only
        { payoutSchedule: "MONTHLY", day: 1 },
      ],
    },
    include: {
      bookings: {
        where: {
          status: { in: ["PAID", "COMPLETED"] },
          payoutStatus: "PENDING",
        },
      },
    },
  });
  
  // Create payout for each captain
  for (const captain of captains) {
    const grossEarnings = captain.bookings.reduce(
      (sum, b) => sum + b.finalPrice, 0
    );
    
    if (grossEarnings >= minimumPayout(captain.payoutSchedule)) {
      await createPayout({
        captainId: captain.id,
        grossEarnings,
        commissionRate: captain.commissionRate,
        bookings: captain.bookings,
        scheduledDate: today,
      });
    }
  }
}
```

---

## API Endpoints

**GET `/api/captain/payouts`** - List captain payouts  
**GET `/api/captain/payouts/:id`** - Get payout details  
**GET `/api/captain/earnings`** - Get earnings summary  
**PATCH `/api/captain/bank-account`** - Update bank account

**Admin Only**:  
**POST `/api/admin/payouts/process`** - Manually process payout  
**PATCH `/api/admin/payouts/:id/status`** - Update payout status  
**POST `/api/admin/payouts/:id/retry`** - Retry failed payout

---

## Payout Dashboard

**Location**: `/captain/account/payouts`

**Features**:

- Total earnings (all time, current month)
- Pending payout amount
- Next payout date
- Payout history table
- Bank account management
- Detailed transaction breakdown

---

## Testing

**Test Scenarios**:

1. **Earnings Calculation**:
   - [ ] Verify commission calculation
   - [ ] Check tier adjustments
   - [ ] Test minimum payout threshold

2. **Payout Processing**:
   - [ ] Bi-weekly schedule triggers
   - [ ] Monthly schedule triggers
   - [ ] Failed payout retry
   - [ ] Status transitions

3. **Bank Account**:
   - [ ] Add/update bank details
   - [ ] Verify account validation
   - [ ] Test secure storage

---

## Related Documentation

- **Booking System**: `docs/config/BOOKING_SYSTEM.md`
- **Dashboard**: `docs/config/DASHBOARD_ANALYTICS_SYSTEM.md`

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
