# Captain Promo Price System

**Status**: Proposed  
**Created**: 3 December 2025  
**Author**: Fishon Development Team  
**Applies To**: fishon-captain (admin dashboard), fishon-market (booking system)

---

## Executive Summary

### The Problem

During the Fishon.my launch, we ran promotional campaigns (e.g., 10% off with promo codes) where **Fishon absorbed 100% of the discount cost**. This significantly reduced—and sometimes eliminated—Fishon's commission revenue per booking.

**Example (Current Model):**

- Trip price: RM 500
- Fishon commission: RM 50 (10%)
- Promo discount: RM 50 (10% off)
- **Fishon net commission: RM 0** ❌

### The Solution

After discussions with captains, many are **willing to contribute to promotional campaigns** by accepting a lower price during promo periods. We propose implementing a **Captain Promo Price** feature where:

1. Admin configures a "promo price" per trip (captain's minimum acceptable price during promos)
2. When a promo code is used, captain receives the promo price instead of full price
3. The difference between regular price and promo price becomes the captain's contribution
4. This contribution offsets Fishon's discount absorption

**Example (Proposed Model):**

- Trip price: RM 500
- Captain's promo price: RM 450 (admin configured)
- Captain contributes: RM 50 to promo campaign
- Promo discount: RM 50
- **Fishon net commission: RM 50** ✅

### Key Benefits

| Stakeholder  | Benefit                                                   |
| ------------ | --------------------------------------------------------- |
| **Fishon**   | Sustainable promo campaigns without revenue loss          |
| **Captains** | Participate in marketing campaigns, attract more bookings |
| **Anglers**  | Same great discounts, no change to their experience       |

---

## Table of Contents

1. [Current Pricing Model](#current-pricing-model)
2. [Proposed Pricing Model](#proposed-pricing-model)
3. [Calculation Examples](#calculation-examples)
4. [Benefits Analysis](#benefits-analysis)
5. [Implementation Scope](#implementation-scope)
6. [Admin Dashboard Design](#admin-dashboard-design)
7. [Technical Specification](#technical-specification)
8. [Migration & Rollout Plan](#migration--rollout-plan)

---

## Current Pricing Model

### How It Works Today

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Captain sets:     trip.price = RM 500                       │
│                                                              │
│  Display to angler:                                          │
│    Subtotal:       RM 500                                    │
│    Platform fee:   RM  50 (10%, hidden)                      │
│    ─────────────────────────                                 │
│    Display price:  RM 550                                    │
│                                                              │
│  With 10% promo:                                             │
│    Discount:      -RM  50                                    │
│    After discount: RM 500                                    │
│    Service fee:    RM  10 (2%)                               │
│    ─────────────────────────                                 │
│    Final price:    RM 510                                    │
│                                                              │
│  Revenue split:                                              │
│    Captain:        RM 500.00 (full price, always protected)  │
│    SenangPay:      RM   7.50 (1.5%)                          │
│    Fishon:         RM   2.50 (only 0.5% service fee!)        │
│                    ▲                                         │
│                    └── Commission wiped out by discount      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Issue

| Scenario  | Fishon Commission | Promo Discount | Fishon Net Income              |
| --------- | ----------------- | -------------- | ------------------------------ |
| No promo  | RM 50             | RM 0           | RM 52.50                       |
| 5% promo  | RM 50             | RM 25          | RM 27.50                       |
| 10% promo | RM 50             | RM 50          | RM 2.50 ← **Only service fee** |
| 15% promo | RM 50             | RM 75          | -RM 22.50 ← **LOSS**           |

**Current formula:**

```
Fishon Income = platformFee - promoDiscount + serviceFee(0.5%)
```

When `promoDiscount ≥ platformFee`, Fishon's commission is completely absorbed.

---

## Proposed Pricing Model

### How It Will Work

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSED FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Captain sets:     trip.price = RM 500                       │
│  Admin configures: trip.promoPrice = RM 450                  │
│                    (Captain contribution: RM 50)             │
│                                                              │
│  Display to angler: (UNCHANGED)                              │
│    Subtotal:       RM 500                                    │
│    Platform fee:   RM  50 (10%, hidden)                      │
│    ─────────────────────────                                 │
│    Display price:  RM 550                                    │
│                                                              │
│  With 10% promo: (UNCHANGED for angler)                      │
│    Discount:      -RM  50                                    │
│    After discount: RM 500                                    │
│    Service fee:    RM  10 (2%)                               │
│    ─────────────────────────                                 │
│    Final price:    RM 510                                    │
│                                                              │
│  Revenue split: (CHANGED)                                    │
│    Captain:        RM 450.00 ← promoPrice (not RM 500!)      │
│    SenangPay:      RM   7.50 (1.5%)                          │
│    Fishon:         RM  52.50 ← Full commission preserved!    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Principle

> **When a promo code is used AND promoPrice is configured:**
>
> - Captain receives `promoPrice` instead of `price`
> - Captain's contribution (`price - promoPrice`) offsets the promo discount
> - Fishon maintains healthy commission revenue

### Fallback Behavior

| promoPrice | Promo Used | Captain Gets | Behavior                          |
| ---------- | ---------- | ------------ | --------------------------------- |
| NULL       | No         | `price`      | Normal (no change)                |
| NULL       | Yes        | `price`      | Current behavior (Fishon absorbs) |
| Set        | No         | `price`      | Normal (promoPrice ignored)       |
| Set        | Yes        | `promoPrice` | **New behavior (shared cost)**    |

---

## Calculation Examples

### Example 1: Standard Trip (RM 500)

**Configuration:**

- `trip.price`: RM 500
- `trip.promoPrice`: RM 450 (admin set)
- Promo code: 10% off

#### Without Promo Code

| Item                          | Amount        |
| ----------------------------- | ------------- |
| Subtotal                      | RM 500.00     |
| Platform fee (10%)            | RM 50.00      |
| Display price                 | RM 550.00     |
| Service fee (2%)              | RM 11.00      |
| **Final price (angler pays)** | **RM 561.00** |
|                               |               |
| Captain receives              | RM 500.00     |
| SenangPay (1.5%)              | RM 8.25       |
| **Fishon receives**           | **RM 52.75**  |

#### With Promo Code (Current vs Proposed)

| Item                 | Current Model | Proposed Model |
| -------------------- | ------------- | -------------- |
| Display price        | RM 550.00     | RM 550.00      |
| Promo discount (10%) | -RM 50.00     | -RM 50.00      |
| After discount       | RM 500.00     | RM 500.00      |
| Service fee (2%)     | RM 10.00      | RM 10.00       |
| **Final price**      | **RM 510.00** | **RM 510.00**  |
|                      |               |                |
| Captain receives     | RM 500.00     | RM 450.00      |
| SenangPay (1.5%)     | RM 7.50       | RM 7.50        |
| **Fishon receives**  | **RM 2.50**   | **RM 52.50**   |

**Difference:** Fishon gains RM 50.00 per booking with promo code.

---

### Example 2: Premium Trip (RM 1,500)

**Configuration:**

- `trip.price`: RM 1,500
- `trip.promoPrice`: RM 1,350 (admin set, 10% captain contribution)
- Promo code: 10% off
- Note: Platform fee capped at RM 100

#### With Promo Code

| Item                  | Current Model   | Proposed Model  |
| --------------------- | --------------- | --------------- |
| Subtotal              | RM 1,500.00     | RM 1,500.00     |
| Platform fee (capped) | RM 100.00       | RM 100.00       |
| Display price         | RM 1,600.00     | RM 1,600.00     |
| Promo discount (10%)  | -RM 150.00      | -RM 150.00      |
| After discount        | RM 1,450.00     | RM 1,450.00     |
| Service fee (2%)      | RM 29.00        | RM 29.00        |
| **Final price**       | **RM 1,479.00** | **RM 1,479.00** |
|                       |                 |                 |
| Captain receives      | RM 1,500.00     | RM 1,350.00     |
| SenangPay (1.5%)      | RM 21.75        | RM 21.75        |
| **Fishon receives**   | **-RM 42.75**   | **RM 107.25**   |

**Difference:** Fishon goes from **LOSS of RM 42.75** to **PROFIT of RM 107.25**.

---

### Example 3: Budget Trip (RM 300)

**Configuration:**

- `trip.price`: RM 300
- `trip.promoPrice`: RM 270 (admin set, 10% captain contribution)
- Promo code: 10% off

#### With Promo Code

| Item                 | Current Model | Proposed Model |
| -------------------- | ------------- | -------------- |
| Subtotal             | RM 300.00     | RM 300.00      |
| Platform fee (10%)   | RM 30.00      | RM 30.00       |
| Display price        | RM 330.00     | RM 330.00      |
| Promo discount (10%) | -RM 30.00     | -RM 30.00      |
| After discount       | RM 300.00     | RM 300.00      |
| Service fee (2%)     | RM 6.00       | RM 6.00        |
| **Final price**      | **RM 306.00** | **RM 306.00**  |
|                      |               |                |
| Captain receives     | RM 300.00     | RM 270.00      |
| SenangPay (1.5%)     | RM 4.50       | RM 4.50        |
| **Fishon receives**  | **RM 1.50**   | **RM 31.50**   |

**Difference:** Fishon gains RM 30.00 per booking.

---

### Example 4: No promoPrice Configured (Fallback)

**Configuration:**

- `trip.price`: RM 500
- `trip.promoPrice`: NULL (not set)
- Promo code: 10% off

| Item             | Result                         |
| ---------------- | ------------------------------ |
| Captain receives | RM 500.00                      |
| Fishon receives  | RM 2.50                        |
| **Behavior**     | **Current behavior preserved** |

This ensures backward compatibility for trips without promoPrice configured.

---

## Benefits Analysis

### For Anglers ✅

| Aspect             | Impact       | Notes                                             |
| ------------------ | ------------ | ------------------------------------------------- |
| Discount amount    | ✅ No change | Same 10% off they see today                       |
| Final price        | ✅ No change | Pay exactly the same amount                       |
| Booking experience | ✅ No change | Completely transparent to them                    |
| Promo availability | ✅ Better    | More sustainable promos = more frequent campaigns |

**Pros:**

- Exact same user experience
- More promotional campaigns possible long-term
- Platform sustainability means better service

**Cons:**

- None (no impact on angler experience)

---

### For Captains ⚖️

| Aspect            | Impact                | Notes                               |
| ----------------- | --------------------- | ----------------------------------- |
| Regular bookings  | ✅ No change          | Full price when no promo used       |
| Promo bookings    | ⚠️ Reduced earnings   | Receive promoPrice instead of price |
| Booking volume    | ✅ Potential increase | Promos attract more anglers         |
| Marketing support | ✅ Better             | Fishon can run more campaigns       |

**Pros:**

- Participate in professional marketing campaigns
- Potential increase in booking volume during promos
- Build customer base through discounted first trips
- Platform remains sustainable = long-term partnership

**Cons:**

- Lower per-booking earnings during promo periods
- Must agree to promoPrice (negotiated with admin)

**Mitigation:**

- promoPrice is optional (admin configures case-by-case)
- Captain is consulted before setting promoPrice
- Only applies when promo codes are used
- Captain still receives guaranteed minimum (promoPrice)

---

### For Fishon ✅

| Aspect                  | Impact                  | Notes                                 |
| ----------------------- | ----------------------- | ------------------------------------- |
| Commission preservation | ✅ Significant          | No longer absorbs full discount       |
| Revenue predictability  | ✅ Better               | Sustainable promo campaigns           |
| Campaign flexibility    | ✅ Better               | Can run bigger/more promos            |
| Captain relationships   | ⚠️ Requires negotiation | Must discuss promoPrice with captains |

**Pros:**

- Maintain healthy commission during promotions
- Can run aggressive marketing campaigns without losses
- More predictable revenue during promo periods
- Sustainable business model

**Cons:**

- Requires admin effort to configure per trip
- Must negotiate with captains for buy-in
- Additional complexity in pricing logic

---

### Summary Comparison

| Stakeholder   | Current Model | Proposed Model      |
| ------------- | ------------- | ------------------- |
| **Angler**    | Pays RM 510   | Pays RM 510 (same)  |
| **Captain**   | Gets RM 500   | Gets RM 450         |
| **Fishon**    | Gets RM 2.50  | Gets RM 52.50       |
| **SenangPay** | Gets RM 7.50  | Gets RM 7.50 (same) |

**Net change:** RM 50 shifts from Captain to Fishon when promoPrice is configured.

---

## Implementation Scope

### Phase 1: Database & Core Logic

**Database:**

- ✅ `Trip.promoPrice` already exists in schema
- Document field as "Captain's minimum price during promo campaigns"

**fishon-market:**

- Update `pricing-service.ts` to use promoPrice when promo applied
- Update booking creation to store which price tier was used
- Add validation: promoPrice must be ≤ price

**fishon-captain:**

- Update `pricing-service.ts` to match market logic
- Add admin UI for configuring promoPrice

### Phase 2: Admin Dashboard

**New Admin Pricing Page Features:**

- View all trips with current price and promoPrice
- Set/update promoPrice per trip
- Bulk update promoPrice (e.g., set all to 90% of price)
- Preview revenue impact before saving

### Phase 3: Reporting

**New Analytics:**

- Promo bookings vs regular bookings count
- Captain contribution total per period
- Revenue saved by promoPrice system

---

## Admin Dashboard Design

### Trip Pricing Management

```
┌─────────────────────────────────────────────────────────────────────┐
│ Trip Pricing Management                                      [Save] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Charter: Ocean Hunter Fishing                                       │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Trip: Half Day Jigging                                          │ │
│ │                                                                 │ │
│ │ Base Price:        RM [500.00    ]                              │ │
│ │                                                                 │ │
│ │ ☑ Enable Promo Pricing                                          │ │
│ │ ┌───────────────────────────────────────────────────────────┐   │ │
│ │ │ Promo Price:     RM [450.00    ]                          │   │ │
│ │ │                                                           │   │ │
│ │ │ Captain Contribution: RM 50.00 (10.0%)                    │   │ │
│ │ │                                                           │   │ │
│ │ │ ℹ️ When promo codes are used:                             │   │ │
│ │ │   • Captain receives: RM 450.00                           │   │ │
│ │ │   • Fishon preserves: RM 50.00 commission                 │   │ │
│ │ └───────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Trip: Full Day Bottom Fishing                                   │ │
│ │                                                                 │ │
│ │ Base Price:        RM [800.00    ]                              │ │
│ │                                                                 │ │
│ │ ☐ Enable Promo Pricing                                          │ │
│ │   (Not configured - Fishon absorbs full discount)               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Bulk Update Tool

```
┌─────────────────────────────────────────────────────────────────────┐
│ Bulk Promo Price Configuration                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Set promo price for multiple trips at once:                         │
│                                                                     │
│ ○ Fixed amount below base price:  RM [50     ] less                 │
│ ● Percentage of base price:       [90        ] %                    │
│ ○ Custom per trip                                                   │
│                                                                     │
│ Apply to:                                                           │
│ ☑ Ocean Hunter Fishing (3 trips)                                    │
│ ☑ Deep Sea Adventures (2 trips)                                     │
│ ☐ Coastal Charters (4 trips)                                        │
│                                                                     │
│                                            [Preview] [Apply Changes] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Specification

### Updated Pricing Formula

```typescript
interface PricingInput {
  tripPrice: number; // trip.price (captain's base)
  promoPrice: number | null; // trip.promoPrice (admin configured)
  days: number;
  promoDiscount?: number; // Discount amount from promo code
}

function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tripPrice, promoPrice, days, promoDiscount = 0 } = input;

  // Step 1: Subtotal (based on display price, always use tripPrice)
  const subtotal = tripPrice * days;

  // Step 2: Platform fee (10%, capped at RM100)
  const platformFee = Math.min(subtotal * 0.1, 100);

  // Step 3: Display price (what angler sees)
  const displayPrice = subtotal + platformFee;

  // Step 4: Apply promo discount
  const amountAfterDiscount = displayPrice - promoDiscount;

  // Step 5: Service fee (2% after discount)
  const serviceFee = amountAfterDiscount * 0.02;

  // Step 6: Final price (what angler pays)
  const finalPrice = amountAfterDiscount + serviceFee;

  // Step 7: Captain earnings (NEW LOGIC)
  const promoApplied = promoDiscount > 0;
  const captainEarnings =
    promoApplied && promoPrice !== null
      ? promoPrice * days // Use promoPrice when promo active
      : subtotal; // Use full subtotal otherwise

  // Step 8: Fee breakdown
  const senangPayFee = amountAfterDiscount * 0.015;
  const fishonServiceFee = amountAfterDiscount * 0.005;
  const fishonCommission =
    finalPrice - captainEarnings - senangPayFee - fishonServiceFee;

  return {
    tripPrice,
    days,
    subtotal,
    platformFee,
    displayPrice,
    promoDiscount,
    amountAfterDiscount,
    serviceFee,
    finalPrice,
    captainEarnings,
    senangPayFee,
    fishonIncome: fishonCommission + fishonServiceFee,
  };
}
```

### Database Schema (Already Exists)

```prisma
model Trip {
  id            String    @id @default(cuid())
  charterId     String
  name          String
  price         Decimal   @db.Decimal(10, 2)  // Captain's base price
  promoPrice    Decimal?  @db.Decimal(10, 2)  // Captain's minimum during promo
  priceOverride Decimal?  @db.Decimal(10, 2)  // Admin override (different use case)
  // ... other fields
}
```

### Booking Record (Optional Enhancement)

```prisma
model Booking {
  // Existing fields...

  // NEW: Track promo pricing usage
  usedPromoPrice     Boolean  @default(false)
  captainPriceAtBooking   Decimal? @db.Decimal(10, 2)  // Snapshot of trip.price
  captainPromoPriceAtBooking Decimal? @db.Decimal(10, 2)  // Snapshot of trip.promoPrice
}
```

### Validation Rules

```typescript
// promoPrice must be less than or equal to price
if (promoPrice !== null && promoPrice > price) {
  throw new Error("Promo price cannot exceed base price");
}

// promoPrice must be positive
if (promoPrice !== null && promoPrice <= 0) {
  throw new Error("Promo price must be greater than zero");
}

// Recommended: promoPrice should be at least 80% of price
if (promoPrice !== null && promoPrice < price * 0.8) {
  console.warn("Promo price is more than 20% below base price");
}
```

---

## Migration & Rollout Plan

### Phase 1: Preparation (Week 1)

- [ ] Update documentation (this document)
- [ ] Review with stakeholders
- [ ] Identify pilot charters for testing

### Phase 2: Development (Week 2-3)

- [ ] Update pricing-service.ts in fishon-market
- [ ] Update pricing-service.ts in fishon-captain
- [ ] Build admin UI for promoPrice management
- [ ] Add unit tests for new pricing logic
- [ ] Update booking creation to record price tier used

### Phase 3: Testing (Week 4)

- [ ] Internal testing with test bookings
- [ ] Verify fallback behavior (no promoPrice = current behavior)
- [ ] Test edge cases (promoPrice = price, promoPrice = 0, etc.)
- [ ] UAT with selected admin users

### Phase 4: Pilot Rollout (Week 5)

- [ ] Configure promoPrice for 5-10 participating charters
- [ ] Monitor bookings and revenue impact
- [ ] Gather captain feedback
- [ ] Adjust promoPrice levels if needed

### Phase 5: Full Rollout (Week 6+)

- [ ] Enable for all willing captains
- [ ] Run promotional campaign with new pricing
- [ ] Monitor and report on revenue impact
- [ ] Iterate on admin UI based on feedback

---

## Appendix: Formula Reference

### Quick Reference

| Variable              | Formula                                       | Description                        |
| --------------------- | --------------------------------------------- | ---------------------------------- |
| `subtotal`            | `tripPrice × days`                            | Captain's base earnings (no promo) |
| `platformFee`         | `min(subtotal × 0.10, 100)`                   | Fishon commission (capped)         |
| `displayPrice`        | `subtotal + platformFee`                      | What angler sees                   |
| `amountAfterDiscount` | `displayPrice - promoDiscount`                | After promo applied                |
| `serviceFee`          | `amountAfterDiscount × 0.02`                  | 2% service fee                     |
| `finalPrice`          | `amountAfterDiscount + serviceFee`            | What angler pays                   |
| `captainEarnings`     | `promoApplied ? promoPrice × days : subtotal` | What captain receives              |
| `senangPayFee`        | `amountAfterDiscount × 0.015`                 | Payment gateway fee                |
| `fishonIncome`        | `finalPrice - captainEarnings - senangPayFee` | Fishon total revenue               |

### Revenue Verification

```
finalPrice = captainEarnings + senangPayFee + fishonIncome
```

Always verify this equation balances in all calculations.

---

## Document History

| Version | Date       | Author   | Changes       |
| ------- | ---------- | -------- | ------------- |
| 1.0     | 3 Dec 2025 | Dev Team | Initial draft |

---

_This is a living document. Please update as implementation progresses._
