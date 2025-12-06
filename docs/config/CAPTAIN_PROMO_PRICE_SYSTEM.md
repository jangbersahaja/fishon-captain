# Captain Promo Price System

**Status**: Proposed Enhancement  
**Created**: 3 December 2025  
**Author**: Fishon Development Team  
**Applies To**: fishon-captain (admin dashboard), fishon-market (booking system)

---

## Executive Summary

### Background

During the Fishon.my launch, we ran promotional campaigns (e.g., 10% off with promo codes) where **Fishon absorbed 100% of the discount cost**. This significantly reduced—and sometimes eliminated—Fishon's commission revenue per booking.

### Current State

We already have infrastructure in place:

- ✅ **`Trip.promoPrice`** field exists in database (captain's minimum acceptable price)
- ✅ **Admin Pricing Dashboard** exists at `/staff/pricing` with ability to manage:
  - Base Price (`trip.price`)
  - Minimum Price Floor (`trip.promoPrice`) - labeled as "Min Price"
  - Current Active Price (`trip.priceOverride`)
- ✅ **Captains have already set promo prices** (via admin configuration)

### What's Missing

The **pricing calculation logic** doesn't currently use `promoPrice` when promo codes are applied. Currently:

- Captain **always** receives full `trip.price` regardless of promo usage
- Fishon absorbs 100% of the promo discount from its commission

### The Proposal

Update the pricing service to use `promoPrice` (already set by captains via admin) when promo codes are applied:

1. **No code applied** → Captain receives `trip.price` (current behavior)
2. **Promo code applied + promoPrice set** → Captain receives `trip.promoPrice`
3. **Promo code applied + no promoPrice** → Captain receives `trip.price` (fallback)

### Key Benefits

| Stakeholder  | Benefit                                             |
| ------------ | --------------------------------------------------- |
| **Fishon**   | Sustainable promo campaigns without revenue loss    |
| **Captains** | Already agreed to promo prices, now they'll be used |
| **Anglers**  | Same great discounts, no change to their experience |

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Proposed Enhancement](#proposed-enhancement)
3. [Real Examples with Live Data](#real-examples-with-live-data)
4. [Benefits Analysis](#benefits-analysis)
5. [Implementation Plan](#implementation-plan)
6. [Technical Specification](#technical-specification)

---

## Current System Analysis

### Existing Infrastructure

#### Database Schema (Already Exists)

```prisma
model Trip {
  price         Decimal   @db.Decimal(10, 2)  // Captain's base price
  promoPrice    Decimal?  @db.Decimal(10, 2)  // Captain's minimum (labeled "Min Price" in UI)
  priceOverride Decimal?  @db.Decimal(10, 2)  // Admin's active override
}
```

#### Admin Pricing Dashboard (Already Exists)

Located at: `/staff/pricing`

**Features:**

- View all trips with pricing data
- Edit base price, min price, and current active price per trip
- Price history tracking with audit logs
- Statistics: total trips, avg base price, avg min price, adoption rate

**Current UI Labels:**

| Field         | Database Column   | Description                          |
| ------------- | ----------------- | ------------------------------------ |
| Base Price    | `trip.price`      | Captain's normal price               |
| Min Price     | `trip.promoPrice` | Captain's minimum acceptable price   |
| Current Price | `priceOverride`   | Admin override for active promotions |

#### Live Data from Database

Real captains have already set their promo prices:

| Charter        | Trip                    | Base Price | Min Price | Contribution |
| -------------- | ----------------------- | ---------- | --------- | ------------ |
| Abey Pie Prima | Half-Day Trip           | RM 150     | RM 140    | RM 10 (7%)   |
| Abey Pie Prima | Full Day Trip           | RM 250     | RM 230    | RM 20 (8%)   |
| Abey Pie Prima | Bottom Prima            | RM 250     | RM 230    | RM 20 (8%)   |
| Along Randuk   | Full Day Trip           | RM 350     | RM 300    | RM 50 (14%)  |
| Along Randuk   | Meranduk 2 Hari 1 Malam | RM 500     | RM 450    | RM 50 (10%)  |
| Angah Charter  | Half-Day Trip (Casting) | RM 150     | RM 130    | RM 20 (13%)  |
| Angah Charter  | Full Day Trip (Casting) | RM 300     | RM 250    | RM 50 (17%)  |
| Angah Charter  | Half-Day Trip (Bottom)  | RM 170     | RM 150    | RM 20 (12%)  |
| Angah Charter  | Full Day Trip (Bottom)  | RM 350     | RM 300    | RM 50 (14%)  |
| Angah Charter  | Overnight Trip          | RM 500     | RM 450    | RM 50 (10%)  |

**Key Insight:** Captains are already contributing 7-17% of their base price as their promo contribution!

### Current Pricing Flow (Problem)

```
CURRENT: Captain always gets full price, Fishon absorbs discount

Example: Along Randuk - Full Day Trip
─────────────────────────────────────
Base Price:                    RM 350
Min Price (set by captain):    RM 300  ← Currently UNUSED!

Display to angler:
  Subtotal:                    RM 350
  Platform fee (10%):          RM  35
  ─────────────────────────────────────
  Display price:               RM 385

With 10% promo code:
  Promo discount:             -RM  35
  After discount:              RM 350
  Service fee (2%):            RM   7
  ─────────────────────────────────────
  Final price (angler pays):   RM 357

Revenue split (CURRENT):
  Captain receives:            RM 350.00  ← Gets FULL price
  SenangPay (1.5%):            RM   5.25
  Fishon receives:             RM   1.75  ← Only 0.5% service fee!
                               ▲
                               └── RM 35 commission wiped out by discount
```

---

## Proposed Enhancement

### Updated Pricing Flow

```
PROPOSED: Use captain's promoPrice when promo code is applied

Example: Along Randuk - Full Day Trip
─────────────────────────────────────
Base Price:                    RM 350
Min Price (set by captain):    RM 300  ← NOW USED!

Display to angler: (UNCHANGED)
  Subtotal:                    RM 350
  Platform fee (10%):          RM  35
  ─────────────────────────────────────
  Display price:               RM 385

With 10% promo code: (UNCHANGED for angler)
  Promo discount:             -RM  35
  After discount:              RM 350
  Service fee (2%):            RM   7
  ─────────────────────────────────────
  Final price (angler pays):   RM 357  ← Same!

Revenue split (PROPOSED):
  Captain receives:            RM 300.00  ← Gets promoPrice
  SenangPay (1.5%):            RM   5.25
  Fishon receives:             RM  51.75  ← Commission preserved!
                               ▲
                               └── Captain's RM 50 contribution offsets discount
```

### Logic Summary

| Condition              | Captain Receives        | Fishon Gets          |
| ---------------------- | ----------------------- | -------------------- |
| No promo code          | `trip.price`            | Full commission      |
| Promo + promoPrice set | `trip.promoPrice`       | Preserved commission |
| Promo + no promoPrice  | `trip.price` (fallback) | Absorbs discount     |

---

## Real Examples with Live Data

### Example 1: Angah Charter - Full Day Trip (Casting)

**Configuration (from database):**

- Charter: Angah Charter (Perak, Lenggong)
- Trip: Full Day Trip (Casting)
- Base Price: RM 300
- Min Price: RM 250
- Captain Contribution: RM 50 (17%)

#### Calculation Comparison

| Item                          | Current Model | Proposed Model |
| ----------------------------- | ------------- | -------------- |
| **Angler Experience**         |               |                |
| Subtotal                      | RM 300.00     | RM 300.00      |
| Platform fee (10%)            | RM 30.00      | RM 30.00       |
| Display price                 | RM 330.00     | RM 330.00      |
| Promo discount (10%)          | -RM 30.00     | -RM 30.00      |
| After discount                | RM 300.00     | RM 300.00      |
| Service fee (2%)              | RM 6.00       | RM 6.00        |
| **Final price (angler pays)** | **RM 306.00** | **RM 306.00**  |
|                               |               |                |
| **Revenue Split**             |               |                |
| Captain receives              | RM 300.00     | RM 250.00      |
| SenangPay (1.5%)              | RM 4.50       | RM 4.50        |
| **Fishon receives**           | **RM 1.50**   | **RM 51.50**   |

**Impact:** Fishon gains RM 50.00 per promo booking.

---

### Example 2: Along Randuk - Meranduk 2 Hari 1 Malam

**Configuration (from database):**

- Charter: Along Randuk (Negeri Sembilan, Johol)
- Trip: Meranduk 2 Hari 1 Malam (Custom)
- Base Price: RM 500
- Min Price: RM 450
- Captain Contribution: RM 50 (10%)

#### Calculation Comparison

| Item                          | Current Model | Proposed Model |
| ----------------------------- | ------------- | -------------- |
| **Angler Experience**         |               |                |
| Subtotal                      | RM 500.00     | RM 500.00      |
| Platform fee (10%)            | RM 50.00      | RM 50.00       |
| Display price                 | RM 550.00     | RM 550.00      |
| Promo discount (10%)          | -RM 50.00     | -RM 50.00      |
| After discount                | RM 500.00     | RM 500.00      |
| Service fee (2%)              | RM 10.00      | RM 10.00       |
| **Final price (angler pays)** | **RM 510.00** | **RM 510.00**  |
|                               |               |                |
| **Revenue Split**             |               |                |
| Captain receives              | RM 500.00     | RM 450.00      |
| SenangPay (1.5%)              | RM 7.50       | RM 7.50        |
| **Fishon receives**           | **RM 2.50**   | **RM 52.50**   |

**Impact:** Fishon gains RM 50.00 per promo booking.

---

### Example 3: Abey Pie Prima - Half-Day Trip (Budget)

**Configuration (from database):**

- Charter: Abey Pie Prima (Selangor, Puchong)
- Trip: Half-Day Trip
- Base Price: RM 150
- Min Price: RM 140
- Captain Contribution: RM 10 (7%)

#### Calculation Comparison

| Item                          | Current Model | Proposed Model |
| ----------------------------- | ------------- | -------------- |
| **Angler Experience**         |               |                |
| Subtotal                      | RM 150.00     | RM 150.00      |
| Platform fee (10%)            | RM 15.00      | RM 15.00       |
| Display price                 | RM 165.00     | RM 165.00      |
| Promo discount (10%)          | -RM 15.00     | -RM 15.00      |
| After discount                | RM 150.00     | RM 150.00      |
| Service fee (2%)              | RM 3.00       | RM 3.00        |
| **Final price (angler pays)** | **RM 153.00** | **RM 153.00**  |
|                               |               |                |
| **Revenue Split**             |               |                |
| Captain receives              | RM 150.00     | RM 140.00      |
| SenangPay (1.5%)              | RM 2.25       | RM 2.25        |
| **Fishon receives**           | **RM 0.75**   | **RM 10.75**   |

**Impact:** Fishon gains RM 10.00 per promo booking.

---

### Summary: Revenue Impact Across Sample Trips

| Charter        | Trip               | Current Fishon | Proposed Fishon | Gain      |
| -------------- | ------------------ | -------------- | --------------- | --------- |
| Abey Pie Prima | Half-Day Trip      | RM 0.75        | RM 10.75        | +RM 10.00 |
| Abey Pie Prima | Full Day Trip      | RM 1.25        | RM 21.25        | +RM 20.00 |
| Along Randuk   | Full Day Trip      | RM 1.75        | RM 51.75        | +RM 50.00 |
| Along Randuk   | Meranduk 2H1M      | RM 2.50        | RM 52.50        | +RM 50.00 |
| Angah Charter  | Half-Day (Casting) | RM 0.75        | RM 20.75        | +RM 20.00 |
| Angah Charter  | Full Day (Casting) | RM 1.50        | RM 51.50        | +RM 50.00 |
| Angah Charter  | Half-Day (Bottom)  | RM 0.85        | RM 20.85        | +RM 20.00 |
| Angah Charter  | Full Day (Bottom)  | RM 1.75        | RM 51.75        | +RM 50.00 |
| Angah Charter  | Overnight Trip     | RM 2.50        | RM 52.50        | +RM 50.00 |

**Average gain per promo booking: ~RM 35.00**

---

## Benefits Analysis

### For Anglers ✅

| Aspect             | Impact                | Notes                               |
| ------------------ | --------------------- | ----------------------------------- |
| Discount amount    | ✅ No change          | Same 10% off they see today         |
| Final price        | ✅ No change          | Pay exactly the same amount         |
| Booking experience | ✅ No change          | Completely transparent to them      |
| Promo availability | ✅ Potentially better | Sustainable promos = more campaigns |

**Pros:**

- Zero impact on user experience
- Exact same prices and discounts
- Platform sustainability means long-term service

**Cons:**

- None

---

### For Captains ⚖️

| Aspect            | Impact              | Notes                                  |
| ----------------- | ------------------- | -------------------------------------- |
| Regular bookings  | ✅ No change        | Full price when no promo used          |
| Promo bookings    | ⚠️ Use agreed price | Receive promoPrice (already agreed to) |
| Booking volume    | ✅ Better           | Promos attract more anglers            |
| Marketing support | ✅ Better           | Fishon can run more campaigns          |

**Pros:**

- They already set and agreed to the promoPrice
- Only applies when promo codes are used
- More aggressive marketing campaigns bring more customers
- Platform sustainability = long-term partnership

**Cons:**

- Slightly lower per-booking earnings during promo periods
- (But they already agreed to this price floor!)

---

### For Fishon ✅

| Aspect                  | Impact         | Notes                               |
| ----------------------- | -------------- | ----------------------------------- |
| Commission preservation | ✅ Significant | Uses captain's agreed contribution  |
| Revenue predictability  | ✅ Better      | Sustainable promo campaigns         |
| Campaign flexibility    | ✅ Better      | Can run bigger/more frequent promos |
| Implementation effort   | ✅ Minimal     | Infrastructure already exists       |

**Pros:**

- Maintains healthy commission during promotions
- Can run aggressive marketing campaigns without losses
- Captains already agreed to promoPrice
- Minimal development effort (logic change only)

**Cons:**

- Need to communicate the change to captains

---

### Comparison Summary

| Stakeholder   | Current (10% promo) | Proposed (10% promo) | Change     |
| ------------- | ------------------- | -------------------- | ---------- |
| **Angler**    | Pays RM 510         | Pays RM 510          | No change  |
| **Captain**   | Gets RM 500         | Gets RM 450          | -RM 50     |
| **Fishon**    | Gets RM 2.50        | Gets RM 52.50        | **+RM 50** |
| **SenangPay** | Gets RM 7.50        | Gets RM 7.50         | No change  |

_(Based on RM 500 trip with RM 450 promoPrice)_

---

## Implementation Plan

### What Already Exists ✅

1. **Database field**: `Trip.promoPrice` - already populated by captains
2. **Admin UI**: `/staff/pricing` - already managing promo prices
3. **API endpoints**: `/api/admin/pricing` - already updating promo prices
4. **Audit logging**: Price changes are tracked

### What Needs to Change 🔧

#### 1. fishon-market: `pricing-service.ts`

Add `promoPrice` parameter and conditional logic:

```typescript
// Current
const captainEarnings = subtotal;

// Proposed
const promoApplied = promoDiscount > 0;
const captainEarnings =
  promoApplied && promoPrice !== null ? promoPrice * days : subtotal;
```

#### 2. fishon-market: Booking Creation

Pass `trip.promoPrice` to pricing calculation when creating bookings.

#### 3. fishon-captain: `pricing-service.ts`

Mirror the same logic for consistency.

#### 4. Optional: Booking Record Enhancement

Track which price tier was used:

```prisma
model Booking {
  usedPromoPrice  Boolean  @default(false)
}
```

### Timeline

| Phase     | Task                                       | Effort     |
| --------- | ------------------------------------------ | ---------- |
| 1         | Update pricing-service.ts (market)         | 2 hours    |
| 2         | Update booking creation to pass promoPrice | 2 hours    |
| 3         | Update pricing-service.ts (captain)        | 1 hour     |
| 4         | Testing with real scenarios                | 2 hours    |
| 5         | Communication to captains                  | 1 hour     |
| **Total** |                                            | **~1 day** |

---

## Technical Specification

### Updated Pricing Function

```typescript
interface PricingInput {
  tripPrice: number; // trip.price
  promoPrice: number | null; // trip.promoPrice (captain's minimum)
  days: number;
  promoDiscount?: number; // From promo code validation
}

function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tripPrice, promoPrice, days, promoDiscount = 0 } = input;

  // Step 1-6: Unchanged (angler-facing calculations)
  const subtotal = tripPrice * days;
  const platformFee = Math.min(subtotal * 0.1, 100);
  const displayPrice = subtotal + platformFee;
  const amountAfterDiscount = displayPrice - promoDiscount;
  const serviceFee = amountAfterDiscount * 0.02;
  const finalPrice = amountAfterDiscount + serviceFee;

  // Step 7: Captain earnings (NEW LOGIC)
  const promoApplied = promoDiscount > 0;
  const captainEarnings =
    promoApplied && promoPrice !== null
      ? promoPrice * days // Use promoPrice when promo active
      : subtotal; // Use full subtotal otherwise

  // Step 8: Revenue breakdown
  const senangPayFee = amountAfterDiscount * 0.015;
  const fishonIncome = finalPrice - captainEarnings - senangPayFee;

  return {
    // ... all fields
    captainEarnings,
    fishonIncome,
  };
}
```

### Validation Rules

```typescript
// Existing validation in admin API (already implemented)
if (minPrice > basePrice) {
  throw new Error("Min price must be less than or equal to base price");
}

if (currentPrice < minPrice) {
  throw new Error("Current price cannot be below min price");
}
```

### Revenue Verification

```
finalPrice = captainEarnings + senangPayFee + fishonIncome
```

Always verify this equation balances.

---

## Appendix: Admin Pricing UI Reference

### Current Admin Dashboard

**Path:** `/staff/pricing`

**Components:**

- `PricingDashboard.tsx` - Main dashboard with stats
- `PricingTable.tsx` - List of trips with pricing
- `PriceConfigModal.tsx` - Edit modal for individual trips
- `PriceHistory.tsx` - Audit log of price changes

**API Endpoints:**

- `GET /api/admin/pricing` - Fetch all trips with pricing
- `PATCH /api/admin/pricing/:id` - Update trip pricing

### Statistics Available

- Total trips count
- Average base price
- Average min price (promoPrice)
- Min price adoption rate (% of trips with promoPrice set)
- Price range (min-max)

---

## Document History

| Version | Date       | Author   | Changes                              |
| ------- | ---------- | -------- | ------------------------------------ |
| 1.0     | 3 Dec 2025 | Dev Team | Initial draft                        |
| 1.1     | 3 Dec 2025 | Dev Team | Updated with existing infrastructure |

---

_This is a living document. Please update as implementation progresses._
