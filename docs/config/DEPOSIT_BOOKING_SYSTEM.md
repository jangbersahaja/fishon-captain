# Deposit Booking System - Implementation Plan

**Status**: 📋 Planning  
**Last Updated**: December 4, 2025  
**Applies To**: fishon-market & fishon-captain

---

## Executive Summary

This document outlines **two booking flow options** for high-value trips (>RM500) to reduce angler hesitation when paying upfront. Both options introduce deposit-based booking to lower the initial commitment.

| Option | Name        | Payment Split     | Balance Handling                 |
| ------ | ----------- | ----------------- | -------------------------------- |
| A      | **HYBRID**  | Deposit + Balance | Both via Fishon platform         |
| B      | **DEPOSIT** | Deposit only      | Balance paid directly to captain |

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Option A: HYBRID Flow](#option-a-hybrid-flow)
3. [Option B: DEPOSIT Flow](#option-b-deposit-flow)
4. [Comparison Matrix](#comparison-matrix)
5. [Shared Schema Changes](#shared-schema-changes)
6. [Implementation Phases](#implementation-phases)
7. [Migration Strategy](#migration-strategy)
8. [Testing Plan](#testing-plan)

---

## Problem Statement

### Current Situation

For **AUTO flow** bookings, anglers must pay the **full trip price upfront** before captain acknowledgment.

### Pain Points

1. **High upfront commitment** - Paying RM1000+ before confirmation feels risky
2. **Refund anxiety** - If captain rejects, refund takes 3-5 business days
3. **Trust barrier** - New anglers hesitate on first booking
4. **Conversion drop-off** - Analytics show higher abandonment for trips >RM500

### Goal

Reduce payment friction for high-value trips while:

- Maintaining booking commitment (reduce no-shows)
- Protecting both angler and captain interests
- Keeping platform operations manageable

---

## Option A: HYBRID Flow

**Concept**: Full payment through platform, split into deposit + balance.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       HYBRID FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Angler                        Captain                 Status   │
│    │                             │                              │
│    ├─ Pay Deposit (30%)          │                  DEPOSIT_PAID│
│    │  e.g., RM150 of RM500       │                              │
│    │  (via Fishon)               │                              │
│    │                             │                              │
│    │                             ├─ Acknowledge ──▶ AWAITING_BALANCE
│    │◀─ Notification               │                              │
│    │   "Confirmed! Pay balance"   │                              │
│    │                             │                              │
│    ├─ Pay Balance (70%)          │                  PAID        │
│    │  RM350 within deadline      │                              │
│    │  (via Fishon)               │◀─ Notification                │
│    │                             │   "Full payment received"    │
│    │                             │                              │
│    │         TRIP DAY            │                              │
│    │                             │                              │
│    │                             ├─ Complete Trip ──▶ COMPLETED │
│    │                             │                              │
│    │                             │◀─ Payout (full amount)       │
│    │                             │   via normal payout cycle    │
│    │                             │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Characteristics

| Aspect               | Detail                                                  |
| -------------------- | ------------------------------------------------------- |
| **Deposit %**        | 20-50% (configurable per charter, default 30%)          |
| **Balance deadline** | Earlier of: 48h after ack OR 24h before trip            |
| **Payment method**   | Both deposit & balance via SenangPay                    |
| **Refund handling**  | Deposit: if captain rejects. Balance: if trip cancelled |
| **Payout**           | Captain receives full amount via normal payout cycle    |
| **Platform fee**     | 10% of full trip price (same as current)                |

### Status Flow

```
DEPOSIT_PAID → AWAITING_BALANCE → PAID → COMPLETED
           ↓                   ↓      ↓
        REJECTED           EXPIRED  CANCELLED
        (refund deposit)   (forfeit (policy-based)
                           deposit)
```

### New Booking Statuses

| Status             | Flow   | Description                                       |
| ------------------ | ------ | ------------------------------------------------- |
| `DEPOSIT_PAID`     | HYBRID | Deposit received, awaiting captain acknowledgment |
| `AWAITING_BALANCE` | HYBRID | Captain acknowledged, awaiting balance payment    |

### Pros & Cons

**Pros:**

- ✅ Full payment control - Platform handles everything
- ✅ Complete audit trail - All transactions in system
- ✅ Consistent payout - Same process for captains
- ✅ Dispute protection - Full documentation

**Cons:**

- ❌ Complex implementation - Two-stage payment
- ❌ Higher platform liability - Handle full refunds
- ❌ Balance deadline management - Need reminder system
- ❌ Full gateway fees - 2% on entire amount

---

## Option B: DEPOSIT Flow

**Concept**: Platform collects deposit only; balance paid directly to captain.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       DEPOSIT FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Angler                        Captain                 Status   │
│    │                             │                              │
│    ├─ Pay Deposit (10-50%)       │                  DEPOSIT_PAID│
│    │  e.g., RM50-250 of RM500    │                              │
│    │  (via Fishon)               │                              │
│    │                             │                              │
│    │                             ├─ Acknowledge ──▶ CONFIRMED   │
│    │◀─ Notification               │                              │
│    │   "Booking confirmed!"       │                              │
│    │   "Balance: RM350 to captain│                              │
│    │    on trip day"             │                              │
│    │                             │                              │
│    │         TRIP DAY            │                              │
│    │                             │                              │
│    ├─ Pay Balance DIRECTLY ─────▶│                              │
│    │  (cash/bank transfer)       │                              │
│    │                             │                              │
│    │                             ├─ Confirm Balance ▶ COMPLETED  │
│    │                             │   Receipt                    │
│    │                             │                              │
│    │                             │◀─ Payout (deposit only)      │
│    │                             │   Platform fee deducted      │
│    │                             │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Characteristics

| Aspect               | Detail                                                    |
| -------------------- | --------------------------------------------------------- |
| **Deposit %**        | 10-50% (configurable per charter, default 30%)            |
| **Balance deadline** | N/A - paid directly on trip day                           |
| **Payment method**   | Deposit via SenangPay; Balance via cash/transfer          |
| **Refund handling**  | Only deposit (if captain rejects)                         |
| **Payout**           | Deposit minus platform fee; Balance is captain's directly |
| **Platform fee**     | Calculated on FULL price, deducted from deposit           |

### Status Flow

```
DEPOSIT_PAID → CONFIRMED → COMPLETED
           ↓            ↓
        REJECTED    CANCELLED
        (refund    (deposit forfeited
         deposit)   per policy)
```

### Platform Fee Handling

**Option B.1: Commission on deposit only**

```
Trip: RM500, Deposit: 30% (RM150)
Platform fee: 10% of RM150 = RM15
Captain deposit payout: RM135
Captain balance (direct): RM350
Total captain earnings: RM485
```

**Option B.2: Commission on full price (RECOMMENDED)**

```
Trip: RM500, Deposit: 30% (RM150)
Platform fee: 10% of RM500 = RM50
Captain deposit payout: RM100 (RM150 - RM50)
Captain balance (direct): RM350
Total captain earnings: RM450 (same as current!)
```

### Pros & Cons

**Pros:**

- ✅ Simple implementation - Only handle deposit
- ✅ Lower platform liability - Smaller refund amounts
- ✅ Captain gets cash faster - Balance on trip day
- ✅ Lower gateway fees - Only 2% on deposit
- ✅ Matches local practice - How traditional charters work

**Cons:**

- ❌ No balance tracking - Trust-based for balance
- ❌ Potential disputes - "Captain says unpaid, angler says paid"
- ❌ Less audit trail - Balance transactions off-platform
- ❌ Captain income variance - Must manually collect balance

---

## Comparison Matrix

| Feature                       | HYBRID (A)         | DEPOSIT (B)                  |
| ----------------------------- | ------------------ | ---------------------------- |
| **Implementation complexity** | 🔴 High            | 🟢 Low                       |
| **Platform liability**        | 🔴 Full amount     | 🟢 Deposit only              |
| **Refund risk**               | 🔴 High            | 🟢 Low                       |
| **Audit trail**               | 🟢 Complete        | 🟡 Partial                   |
| **Gateway fees (angler)**     | 🔴 2% on full      | 🟢 2% on deposit             |
| **Captain cash flow**         | 🟡 Wait for payout | 🟢 Immediate balance         |
| **Dispute handling**          | 🟢 Easy            | 🟡 Manual                    |
| **Revenue model**             | 🟢 Same as current | 🟢 Same as current           |
| **User experience**           | 🟢 Consistent      | 🟡 Mixed (platform + direct) |
| **Scalability**               | 🟢 Better          | 🟡 Trust-dependent           |

### Recommendation

| Scenario                  | Recommended Option                      |
| ------------------------- | --------------------------------------- |
| MVP / Fast launch         | **DEPOSIT (B)** - Simpler to implement  |
| Long-term / Scale         | **HYBRID (A)** - Better control & audit |
| Captain preference varies | **Both** - Let captain choose           |

---

## Shared Schema Changes

### 1. BookingFlowType Enum

**fishon-captain/prisma/schema.prisma**
**fishon-market/prisma/schema.prisma**

```prisma
enum BookingFlowType {
  MANUAL      // Request → Approval → Payment → Paid
  AUTO        // Payment → Acknowledgment → Paid
  HYBRID      // Deposit → Ack → Balance → Paid (Option A)
  DEPOSIT     // Deposit → Ack → Confirmed (Option B)
}
```

### 2. Charter Model Extensions

Deposit settings are configured at **charter level** and apply to all trips:

```prisma
model Charter {
  // Existing fields...

  // === DEPOSIT SETTINGS ===
  depositEnabled        Boolean         @default(false)
  depositPercent        Int             @default(30)       // 10-50%
  depositMinAmount      Decimal?        @db.Decimal(10, 2) // Optional floor (e.g., RM50)
  depositThreshold      Decimal?        @db.Decimal(10, 2) // Price threshold to activate (e.g., RM500)
  depositFlowType       String?         @default("DEPOSIT") // "HYBRID" or "DEPOSIT"
}
```

### 3. Deposit Resolution Logic

```typescript
/**
 * Get deposit settings for a charter
 */
interface DepositSettings {
  enabled: boolean;
  percent: number;
  threshold: number | null;
  minAmount: number | null;
  flowType: "HYBRID" | "DEPOSIT";
}

function getDepositSettings(
  charter: Charter,
  tripPrice: number
): DepositSettings {
  // System defaults
  const DEFAULTS = {
    enabled: false,
    percent: 30,
    threshold: 500,
    minAmount: null,
    flowType: "DEPOSIT" as const,
  };

  // If charter doesn't have deposit enabled, return disabled
  if (!charter.depositEnabled) {
    return { ...DEFAULTS, enabled: false };
  }

  // Use charter settings
  const settings: DepositSettings = {
    enabled: charter.depositEnabled,
    percent: charter.depositPercent ?? DEFAULTS.percent,
    threshold: charter.depositThreshold ?? DEFAULTS.threshold,
    minAmount: charter.depositMinAmount ?? DEFAULTS.minAmount,
    flowType:
      (charter.depositFlowType as "HYBRID" | "DEPOSIT") ?? DEFAULTS.flowType,
  };

  // Check if price meets threshold (null threshold = always use deposit)
  if (settings.threshold !== null && tripPrice < settings.threshold) {
    settings.enabled = false; // Below threshold, use full payment
  }

  return settings;
}

/**
 * Calculate deposit amount
 */
function calculateDepositAmount(
  totalPrice: number,
  percent: number,
  minAmount?: number | null
): number {
  const calculated = Math.round(totalPrice * (percent / 100) * 100) / 100;

  // Apply minimum if set
  if (minAmount && calculated < minAmount) {
    return Math.min(minAmount, totalPrice); // Don't exceed total price
  }

  return calculated;
}
```

### 4. Example Configurations

| Charter Setting        | Trip Price | Result                              |
| ---------------------- | ---------- | ----------------------------------- |
| 30% @ RM500 threshold  | RM250      | Full payment (below threshold)      |
| 30% @ RM500 threshold  | RM800      | 30% deposit = RM240                 |
| 50% @ RM1000 threshold | RM2500     | 50% deposit = RM1250                |
| 30% @ null threshold   | RM100      | 30% deposit = RM30 (always deposit) |

### 5. BookingStatus Enum Extensions

```prisma
enum BookingStatus {
  // Manual flow
  PENDING
  AWAITING_PAYMENT

  // Auto flow
  PAYMENT_AUTHORIZED

  // Deposit flows (NEW)
  DEPOSIT_PAID           // Deposit received, awaiting captain acknowledgement
  AWAITING_BALANCE       // HYBRID only: Ack'd, awaiting balance
  CONFIRMED              // DEPOSIT only: Ack'd, balance paid to captain

  // Common statuses
  PAID
  UNDER_REVIEW
  COMPLETED
  REJECTED
  CANCELLED
  EXPIRED
}
```

### 6. Booking Model Extensions

```prisma
model Booking {
  // Existing fields...

  // === DEPOSIT TRACKING ===
  depositAmount         Decimal?        @db.Decimal(10, 2)
  depositPercent        Int?            // Snapshot of % at booking time
  depositPaidAt         DateTime?
  depositIntentId       String?         @db.VarChar(255)   // Payment intent for deposit

  // === BALANCE TRACKING (HYBRID only) ===
  balanceAmount         Decimal?        @db.Decimal(10, 2)
  balanceDeadline       DateTime?
  balancePaidAt         DateTime?
  balanceIntentId       String?         @db.VarChar(255)   // Payment intent for balance

  // === BALANCE TRACKING (DEPOSIT only) ===
  balancePaidMethod    String?         // "CASH", "BANK_TRANSFER", "PENDING"
  balanceConfirmedAt    DateTime?       // Captain confirms receipt
  balanceConfirmedBy    String?         // Captain user ID
}
```

### 7. View Updates (v_public_charters)

Add charter-level deposit settings to the PostgreSQL view:

```sql
-- Add to SELECT in v_public_charters
'depositEnabled', c."depositEnabled",
'depositPercent', c."depositPercent",
'depositMinAmount', c."depositMinAmount",
'depositThreshold', c."depositThreshold",
'depositFlowType', c."depositFlowType"
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Shared work for both options:**

- [ ] Schema migration - Add deposit fields to Charter model
- [ ] Update `v_public_charters` view with deposit fields
- [ ] Add deposit settings to Charter configuration UI
- [ ] Create `getDepositSettings()` utility
- [ ] Create `calculateDepositAmount()` utility
- [ ] Update `getCharterFlowType()` to handle deposit flows
- [ ] Add deposit info to booking creation payload

### Phase 2A: HYBRID Flow (Week 3-4)

- [ ] Payment gateway - Create balance payment intent
- [ ] Booking creation - Handle `DEPOSIT_PAID` status
- [ ] Balance payment API - `/api/bookings/:id/pay-balance`
- [ ] Balance deadline cron job
- [ ] Email templates - Deposit confirmed, balance reminder
- [ ] UI - Balance payment page for angler
- [ ] Captain dashboard - Show deposit vs balance status

### Phase 2B: DEPOSIT Flow (Week 3-4)

- [ ] Booking creation - Handle `DEPOSIT_PAID` → `CONFIRMED` flow
- [ ] Captain balance confirmation - `/api/bookings/:id/confirm-balance`
- [ ] Email templates - Deposit confirmed, balance instructions
- [ ] UI - Show balance instructions to angler
- [ ] Captain dashboard - Balance confirmation button
- [ ] Trip completion - Verify balance confirmed

### Phase 3: Polish (Week 5)

- [ ] Analytics tracking - Deposit conversion metrics
- [ ] Refund handling - Deposit-only refunds
- [ ] Testing - E2E for both flows
- [ ] Documentation - User guides

---

## Migration Strategy

### Database Migration

```bash
# 1. Create backup
npm run db:backup pre-deposit-flow

# 2. Run migration
npm run db:migrate:safe add-deposit-booking-flow

# 3. Update view
psql $CAPTAIN_DATABASE_URL -f migration_add_deposit_to_view.sql

# 4. Regenerate Prisma client
npx prisma generate
```

### Rollout Strategy

1. **Feature flag**: `DEPOSIT_FLOW_ENABLED=false` initially
2. **Beta captains**: Enable for selected captains first
3. **Gradual rollout**: Enable by charter price tier
4. **Full launch**: Default for new charters, opt-in for existing

---

## Testing Plan

### Unit Tests

```typescript
// deposit-settings.test.ts
describe("getDepositSettings", () => {
  it("uses charter settings when deposit enabled", () => {
    const charter = {
      depositEnabled: true,
      depositPercent: 30,
      depositThreshold: 500,
      depositFlowType: "DEPOSIT",
    };
    const settings = getDepositSettings(charter, 800);
    expect(settings.enabled).toBe(true);
    expect(settings.percent).toBe(30);
    expect(settings.flowType).toBe("DEPOSIT");
  });

  it("disables deposit when charter has it disabled", () => {
    const charter = { depositEnabled: false };
    const settings = getDepositSettings(charter, 800);
    expect(settings.enabled).toBe(false);
  });

  it("disables deposit when price below threshold", () => {
    const charter = {
      depositEnabled: true,
      depositPercent: 30,
      depositThreshold: 500,
    };
    const settings = getDepositSettings(charter, 300);
    expect(settings.enabled).toBe(false);
  });

  it("enables deposit when threshold is null (always deposit)", () => {
    const charter = {
      depositEnabled: true,
      depositPercent: 30,
      depositThreshold: null,
    };
    const settings = getDepositSettings(charter, 100);
    expect(settings.enabled).toBe(true);
  });
});

// pricing-service.test.ts
describe("calculateDepositAmount", () => {
  it("calculates 30% deposit for RM500 trip", () => {
    expect(calculateDepositAmount(500, 30)).toBe(150);
  });

  it("respects minimum deposit amount", () => {
    expect(calculateDepositAmount(100, 30, 50)).toBe(50);
  });

  it("does not exceed total price for minimum", () => {
    expect(calculateDepositAmount(30, 30, 50)).toBe(30);
  });
});

// booking-flow.test.ts
describe("HYBRID flow", () => {
  it("creates booking with DEPOSIT_PAID status");
  it("transitions to AWAITING_BALANCE on captain ack");
  it("transitions to PAID on balance payment");
  it("expires booking if balance deadline missed");
});

describe("DEPOSIT flow", () => {
  it("creates booking with DEPOSIT_PAID status");
  it("transitions to CONFIRMED on captain ack");
  it("allows captain to confirm balance receipt");
  it("blocks completion without balance confirmation");
});
```

### E2E Tests

- [ ] Angler completes deposit payment (both flows)
- [ ] Captain acknowledges deposit booking
- [ ] Angler pays balance (HYBRID)
- [ ] Captain confirms balance (DEPOSIT)
- [ ] Captain rejects → deposit refunded
- [ ] Balance deadline expires → booking cancelled (HYBRID)
- [ ] Trip completes successfully

---

## Configuration Reference

### Environment Variables

```bash
# Feature flags
DEPOSIT_FLOW_ENABLED=true
DEPOSIT_FLOW_DEFAULT="DEPOSIT"  # or "HYBRID"

# Defaults (can be overridden per charter)
DEFAULT_DEPOSIT_PERCENT=30
DEFAULT_DEPOSIT_MIN_AMOUNT=50
DEFAULT_DEPOSIT_THRESHOLD=500

# Balance deadline (HYBRID only)
BALANCE_DEADLINE_HOURS=48
BALANCE_DEADLINE_MIN_HOURS_BEFORE_TRIP=24
```

### Charter Settings UI

**Location**: `/captain/charters/:id/settings` → Booking Settings tab

| Setting                | Type   | Default | Description                        |
| ---------------------- | ------ | ------- | ---------------------------------- |
| Enable deposit booking | Toggle | Off     | Activate deposit flow for charter  |
| Deposit percentage     | Slider | 30%     | 10-50% range                       |
| Minimum deposit        | Number | -       | Optional floor amount (e.g., RM50) |
| Price threshold        | Number | RM500   | Activate above this price          |
| Deposit flow type      | Radio  | DEPOSIT | HYBRID or DEPOSIT                  |

**UI Mockup - Charter Settings:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ Charter Settings: Captain Ali Fishing                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ BOOKING SETTINGS                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │ Booking Flow Type                                           │ │
│ │ ( ) MANUAL - Approve requests before payment                │ │
│ │ (●) AUTO   - Instant booking with payment                   │ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │                                                             │ │
│ │ [✓] Enable Deposit Booking                                  │ │
│ │     For trips above threshold, collect deposit only         │ │
│ │                                                             │ │
│ │ Deposit Percentage                                          │ │
│ │ ├────────●────────────────┤ 30%                             │ │
│ │                                                             │ │
│ │ Price Threshold                                             │ │
│ │ [ ] Always require deposit (any price)                      │ │
│ │ [●] Only for trips above RM [   500   ]                     │ │
│ │                                                             │ │
│ │ Minimum Deposit: RM [    50   ] (optional)                  │ │
│ │                                                             │ │
│ │ Balance Collection                                          │ │
│ │ (●) DEPOSIT - Angler pays balance to you directly           │ │
│ │ ( ) HYBRID  - Angler pays balance via Fishon platform       │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Preview:                                                        │
│ • RM250 trip → Full payment (below RM500 threshold)             │
│ • RM800 trip → RM240 deposit (30%), RM560 balance to you        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Booking Creation with Deposit

When creating a booking, the API gets deposit settings from the charter:

```typescript
// In /api/bookings/create (fishon-market)

// 1. Fetch trip with charter
const trip = await getTripById(tripId);

// 2. Get deposit settings from charter
const depositSettings = getDepositSettings(
  trip.charter,
  finalPrice // Total booking price (tripPrice * days)
);

// 3. Calculate deposit amount
let depositAmount: number | null = null;
let effectiveFlowType = trip.charter.bookingFlowType; // MANUAL or AUTO

if (depositSettings.enabled) {
  depositAmount = calculateDepositAmount(
    finalPrice,
    depositSettings.percent,
    depositSettings.minAmount
  );
  effectiveFlowType = depositSettings.flowType; // HYBRID or DEPOSIT
}

// 4. Create booking with deposit info
const booking = await prisma.booking.create({
  data: {
    // ... existing fields
    bookingFlowType: effectiveFlowType,
    depositAmount: depositAmount,
    depositPercent: depositSettings.percent,
    balanceAmount: depositAmount ? finalPrice - depositAmount : null,
    // ...
  },
});
```

### New Endpoints

#### HYBRID Flow

```typescript
// Pay balance after captain acknowledgment
POST /api/bookings/:id/pay-balance
{
  paymentMethod: "CARD" | "FPX" | "EWALLET",
  cardDetails?: { ... } // If CARD
}

Response: {
  success: boolean,
  booking: Booking,
  redirectUrl?: string // If FPX/EWALLET
}
```

#### DEPOSIT Flow

```typescript
// Captain confirms balance received
POST /api/bookings/:id/confirm-balance
{
  method: "CASH" | "BANK_TRANSFER",
  note?: string
}

Response: {
  success: boolean,
  booking: Booking
}
```

---

## Related Documentation

- `BOOKING_SYSTEM.md` - Current dual-flow documentation
- `BOOKING_FLOW.md` - Flow diagrams and status transitions
- `CAPTAIN_PAYOUT_SYSTEM.md` - Payout handling
- `PRICING_SYSTEM.md` - Fee calculations

---

**Document Maintained By**: Development Team  
**Decision Pending**: Fishon team to choose Option A, B, or both
