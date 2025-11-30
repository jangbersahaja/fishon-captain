# Financial Calculation System

**Status**: Active  
**Last Updated**: 07 July 2025  
**Applies To**: fishon-captain (admin dashboard), fishon-market (booking system)

---

## Overview

This document defines the **single source of truth** for all financial calculations in the Fishon platform. All implementations must follow these formulas exactly to ensure consistency.

---

## Core Constants

```typescript
// Platform commission rate
const PLATFORM_FEE_RATE = 0.1; // 10%
const PLATFORM_FEE_CAP = 100; // RM100 maximum

// Service fee rate (payment gateway + Fishon service)
const SERVICE_FEE_RATE = 0.02; // 2%
// Breakdown:
// - SenangPay: 1.5% (payment gateway)
// - Fishon: 0.5% (service revenue)

// Tax rate (future implementation)
const TAX_RATE = 0.06; // 6% SST (not yet implemented)

// Maximum discount limit
const MAX_DISCOUNT_RATE = 0.1; // 10% (cannot exceed platform fee)
```

---

## Pricing Model (Updated November 2025)

### Key Changes

1. **Commission Cap**: Platform fee (commission) is now capped at RM100
   - Trips ≤ RM1,000: 10% commission (e.g., RM500 trip = RM50)
   - Trips > RM1,000: RM100 flat (e.g., RM2,000 trip = RM100, not RM200)

2. **Hidden Commission**: Commission is HIDDEN from anglers
   - Anglers see: `displayPrice = basePrice + commission`
   - Database stores: `tripPrice` (base) and `platformFee` (commission) separately

3. **Service Fee Increase**: Changed from 1.5% to 2%
   - 1.5% → SenangPay (payment gateway)
   - 0.5% → Fishon (service revenue)

4. **Captain Earnings**: Always `basePrice × days`
   - Captain earnings are NEVER reduced by commission
   - Commission is Fishon's markup on displayed price

---

## Financial Flow Formula

### 1. Base Calculation (No Discount, No Tax)

```typescript
// What captain set
const tripPrice = 500; // Captain's base price per day (priceOverride ?? price)
const days = 1; // Number of days booked

// Step 1: Calculate subtotal (what captain receives)
const subtotal = tripPrice * days;
// = 500 * 1 = RM 500

// Step 2: Calculate platform fee (with cap!)
const platformFeeUncapped = subtotal * PLATFORM_FEE_RATE;
const platformFee = Math.min(platformFeeUncapped, PLATFORM_FEE_CAP);
// = min(50, 100) = RM 50

// Step 3: Calculate display price (what angler sees per day)
const displayPrice = tripPrice + platformFee / days;
// = 500 + 50 = RM 550 (shown to angler)

// Step 4: Calculate amount before service fee
const amountBeforeServiceFee = subtotal + platformFee;
// = 500 + 50 = RM 550

// Step 5: Calculate service fee (2% = 1.5% SenangPay + 0.5% Fishon)
const serviceFee = amountBeforeServiceFee * SERVICE_FEE_RATE;
// = 550 * 0.02 = RM 11.00

// Step 6: Calculate final price (what angler pays)
const finalPrice = amountBeforeServiceFee + serviceFee;
// = 550 + 11 = RM 561.00

// Financial breakdown:
// - Captain receives: RM 500.00
// - Fishon receives:  RM 50.00 (commission) + RM 2.75 (0.5% service)
// - SenangPay gets:   RM 8.25 (1.5% gateway fee)
// - Angler pays:      RM 561.00
```

### 2. Large Trip (Commission Cap Applied)

```typescript
// What captain set
const tripPrice = 2000; // Captain's base price per day
const days = 1;

// Step 1: Calculate subtotal
const subtotal = tripPrice * days;
// = RM 2000

// Step 2: Calculate platform fee (CAPPED!)
const platformFeeUncapped = subtotal * PLATFORM_FEE_RATE;
// = 2000 * 0.10 = RM 200
const platformFee = Math.min(platformFeeUncapped, PLATFORM_FEE_CAP);
// = min(200, 100) = RM 100 (CAPPED!)

// Step 3: Calculate display price
const displayPrice = tripPrice + platformFee;
// = 2000 + 100 = RM 2100 (shown to angler)

// Step 4: Calculate amount before service fee
const amountBeforeServiceFee = subtotal + platformFee;
// = 2000 + 100 = RM 2100

// Step 5: Calculate service fee (2%)
const serviceFee = amountBeforeServiceFee * SERVICE_FEE_RATE;
// = 2100 * 0.02 = RM 42.00

// Step 6: Calculate final price
const finalPrice = amountBeforeServiceFee + serviceFee;
// = 2100 + 42 = RM 2142.00

// Financial breakdown:
// - Captain receives: RM 2000.00
// - Fishon receives:  RM 100.00 (capped commission) + RM 10.50 (0.5% service)
// - SenangPay gets:   RM 31.50 (1.5% gateway fee)
// - Angler pays:      RM 2142.00
```

### 3. With Discount Applied

```typescript
// Starting point
const tripPrice = 500;
const days = 1;
const discountAmount = 50; // RM 50 off (10%)

// Step 1: Calculate subtotal
const subtotal = tripPrice * days;
// = RM 500

// Step 2: Calculate platform fee (with cap)
const platformFee = Math.min(subtotal * 0.1, 100);
// = RM 50

// Step 3: Calculate amount before service fee (AFTER discount)
const amountBeforeServiceFee = subtotal + platformFee - discountAmount;
// = 500 + 50 - 50 = RM 500

// Step 4: Calculate service fee (2% on discounted amount)
const serviceFee = amountBeforeServiceFee * SERVICE_FEE_RATE;
// = 500 * 0.02 = RM 10.00

// Step 5: Calculate final price
const finalPrice = amountBeforeServiceFee + serviceFee;
// = 500 + 10 = RM 510.00

// Financial breakdown:
// - Captain receives: RM 500.00 (unchanged!)
// - Fishon receives:  RM 0.00 (50 - 50 discount absorbed)
// - SenangPay gets:   RM 7.50 (1.5% of 500)
// - Fishon service:   RM 2.50 (0.5% of 500)
// - Angler pays:      RM 510.00
// - Discount impact:  -RM 50.00 (absorbed by Fishon from commission)
```

---

## Key Formulas Reference

### Quick Reference Table

| Field          | Formula                                          | Who Receives                        |
| -------------- | ------------------------------------------------ | ----------------------------------- |
| `subtotal`     | `tripPrice × days`                               | Captain                             |
| `platformFee`  | `min(subtotal × 0.10, 100)`                      | Fishon (commission)                 |
| `displayPrice` | `tripPrice + (platformFee / days)`               | Shown to angler per day             |
| `discount`     | Promo code amount                                | Absorbed by Fishon                  |
| `taxAmount`    | `(subtotal + platformFee - discount) × 0.06`     | Government (future)                 |
| `serviceFee`   | `(subtotal + platformFee - discount) × 0.02`     | Split: 1.5% SenangPay + 0.5% Fishon |
| `finalPrice`   | `subtotal + platformFee - discount + serviceFee` | Paid by Angler                      |

### Revenue Calculations

```typescript
// Captain's earnings (always same as subtotal)
captainEarnings = tripPrice * days;

// Fishon's total revenue (updated formula!)
fishonRevenue = platformFee - discount + serviceFee * 0.25;
// Where:
// - platformFee - discount = trip commission income
// - serviceFee * 0.25 = 0.5% service fee (Fishon's portion of 2%)

// Breakdown of service fee (2% total):
// - SenangPay: 1.5% (75% of serviceFee)
// - Fishon: 0.5% (25% of serviceFee)

// Tax collected (not revenue, held for government)
taxCollected = taxAmount; // Future
```

---

## Database Schema Mapping

### Booking Model Fields

```prisma
model Booking {
  // === PRICING BREAKDOWN ===
  tripPrice  Decimal @db.Decimal(10, 2) // Captain's base price PER DAY (priceOverride ?? price)
  discount   Json?   // { code, percentage, amount }
  tax        Json?   // { name, percentage, amount } (future)
  finalPrice Decimal @db.Decimal(10, 2) // Total angler pays

  // === FINANCIAL TRACKING ===
  days             Int      // Number of days booked
  platformFee      Decimal? @db.Decimal(10, 2) // min(10% of subtotal, RM100)
  serviceFee       Decimal? @db.Decimal(10, 2) // 2% of (subtotal + platformFee - discount)
  captainEarnings  Decimal? @db.Decimal(10, 2) // tripPrice × days (unchanged)
}
```

### Calculation Order (Database Storage)

```typescript
// 1. Get captain's base price
const tripPrice = trip.priceOverride ?? trip.price;

// 2. Calculate captain's earnings (subtotal)
const captainEarnings = tripPrice * days;

// 3. Calculate platform fee (WITH CAP!)
const platformFee = Math.min(captainEarnings * 0.1, 100);

// 4. Extract discount amount from promo code
const discountAmount = discount?.amount || 0;

// 5. Calculate amount before service fee
const amountBeforeServiceFee = captainEarnings + platformFee - discountAmount;

// 6. Calculate service fee (2%)
const serviceFee = amountBeforeServiceFee * 0.02;

// 7. Calculate final price
const finalPrice = amountBeforeServiceFee + serviceFee;

// Store to database:
await prisma.booking.create({
  data: {
    tripPrice, // Captain's base (NOT display price!)
    days,
    discount:
      discountAmount > 0 ? { code, percentage, amount: discountAmount } : null,
    platformFee, // Commission (split from display price)
    serviceFee, // 2% service fee
    captainEarnings, // Same as subtotal
    finalPrice, // What angler pays
    // ... other fields
  },
});
```

---

## What Angler Sees vs Database Storage

### Display to Angler (UI)

```
Trip Price (1 day):      RM 550   ← displayPrice (base + commission baked in)
Discount:               -RM  50   ← discount amount
Service Fee (2%):        RM  10   ← serviceFee
─────────────────────────────────
Total:                   RM 510
```

**NOTE**: Commission line is NEVER shown to anglers!

### Database Storage (Internal)

```
tripPrice:        500    ← Captain's base price (NOT display price!)
platformFee:       50    ← Commission (split out for tracking)
discount:          50    ← Discount amount
serviceFee:        10    ← 2% service fee
captainEarnings:  500    ← What captain receives
finalPrice:       510    ← What angler paid
```

---

## Testing Scenarios

### Test Case 1: Basic Booking (No Discount)

```typescript
Input:
  tripPrice: 500
  days: 1
  discount: 0

Expected Output:
  captainEarnings: 500.00
  platformFee: 50.00          // min(50, 100)
  displayPrice: 550.00        // Shown to angler
  serviceFee: 11.00           // 2% of 550
  finalPrice: 561.00
  fishonTripRevenue: 50.00    // Commission
  fishonServiceRevenue: 2.75  // 0.5% of 550
```

### Test Case 2: Large Trip (Cap Applied)

```typescript
Input:
  tripPrice: 2000
  days: 1
  discount: 0

Expected Output:
  captainEarnings: 2000.00
  platformFee: 100.00         // CAPPED! (not 200)
  displayPrice: 2100.00       // Shown to angler
  serviceFee: 42.00           // 2% of 2100
  finalPrice: 2142.00
  fishonTripRevenue: 100.00   // Capped commission
  fishonServiceRevenue: 10.50 // 0.5% of 2100
```

### Test Case 3: 10% Discount (Max)

```typescript
Input:
  tripPrice: 500
  days: 1
  discount: 55 (10% of displayPrice 550)

Expected Output:
  captainEarnings: 500.00     // Unchanged!
  platformFee: 50.00
  serviceFee: 9.90            // 2% of (550-55)
  finalPrice: 504.90
  fishonTripRevenue: -5.00    // Discount exceeds commission!
```

### Test Case 4: Multi-Day Booking

```typescript
Input:
  tripPrice: 500
  days: 3
  discount: 0

Expected Output:
  captainEarnings: 1500.00
  platformFee: 100.00         // CAPPED! (not 150)
  displayPrice: 533.33/day    // (1500+100)/3
  serviceFee: 32.00           // 2% of 1600
  finalPrice: 1632.00
```

---

## Error Prevention Rules

### ⚠️ Common Mistakes to Avoid

1. **DO NOT** forget the commission cap

   ```typescript
   // ❌ WRONG
   platformFee = subtotal * 0.1;

   // ✅ CORRECT
   platformFee = Math.min(subtotal * 0.1, 100);
   ```

2. **DO NOT** use 1.5% service fee (old rate)

   ```typescript
   // ❌ WRONG
   serviceFee = amountBeforeServiceFee * 0.015;

   // ✅ CORRECT
   serviceFee = amountBeforeServiceFee * 0.02;
   ```

3. **DO NOT** reduce captain earnings by commission

   ```typescript
   // ❌ WRONG
   captainEarnings = subtotal - platformFee;

   // ✅ CORRECT
   captainEarnings = subtotal; // Captain always gets full base price
   ```

4. **DO NOT** store displayPrice as tripPrice

   ```typescript
   // ❌ WRONG
   tripPrice: 550,  // Display price with commission
   platformFee: 0,  // Missing!

   // ✅ CORRECT
   tripPrice: 500,     // Captain's base price
   platformFee: 50,    // Commission tracked separately
   ```

---

## Version History

### v2.0 - 07 July 2025 (Current)

- **Commission Cap**: Added RM100 cap on platform fee
- **Hidden Commission**: Commission baked into display price
- **Service Fee**: Increased from 1.5% to 2%
  - Split: 1.5% SenangPay + 0.5% Fishon
- **Captain Earnings**: Clarified always equals subtotal

### v1.0 - 25 November 2025 (Deprecated)

- Initial documentation
- No commission cap
- Commission visible to anglers
- Service fee: 1.5% (SenangPay only)

---

## Related Documents

- `docs/FISHON_REVENUE_POLICY.md` - High-level revenue policy explanation
- `docs/config/BOOKING_SYSTEM.md` - Booking flow and payment system
- `docs/PRICING_UPDATE_PLAN.md` - Original planning document for v2.0 changes
- `prisma/schema-market.prisma` - Booking model schema

---

## Maintenance Protocol

When updating financial calculations:

1. **Update this document FIRST**
2. Update pricing-service.ts in BOTH fishon-market AND fishon-captain
3. Add migration if database schema changes
4. Update test cases
5. Verify in staging environment
6. Document changes in version history

**Critical**: All financial calculations must reference this document as the single source of truth.

---

_This is a living document. Any changes to financial calculations must be reflected here and communicated to the development team._
