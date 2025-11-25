# Financial Calculation System

**Status**: Active  
**Last Updated**: 25 November 2025  
**Applies To**: fishon-captain (admin dashboard), fishon-market (booking system)

---

## Overview

This document defines the **single source of truth** for all financial calculations in the Fishon platform. All implementations must follow these formulas exactly to ensure consistency.

---

## Core Constants

```typescript
// Platform commission rate
const PLATFORM_FEE_RATE = 0.1; // 10%

// Payment gateway commission rate (SenangPay)
const SERVICE_FEE_RATE = 0.015; // 1.5%

// Tax rate (future implementation)
const TAX_RATE = 0.06; // 6% SST (not yet implemented)

// Maximum discount limit
const MAX_DISCOUNT_RATE = 0.1; // 10% (cannot exceed platform fee)
```

---

## Financial Flow Formula

### 1. Base Calculation (No Discount, No Tax)

```typescript
// What captain set
const tripPrice = 500; // Captain's base price per day
const days = 1; // Number of days booked

// Step 1: Calculate subtotal (what captain receives)
const subtotal = tripPrice * days;
// = 500 * 1 = RM 500

// Step 2: Calculate platform fee (Fishon's commission)
const platformFee = subtotal * PLATFORM_FEE_RATE;
// = 500 * 0.10 = RM 50

// Step 3: Calculate amount before service fee
const amountBeforeServiceFee = subtotal + platformFee;
// = 500 + 50 = RM 550

// Step 4: Calculate service fee (payment gateway charge)
const serviceFee = amountBeforeServiceFee * SERVICE_FEE_RATE;
// = 550 * 0.015 = RM 8.25

// Step 5: Calculate final price (what angler pays)
const finalPrice = amountBeforeServiceFee + serviceFee;
// = 550 + 8.25 = RM 558.25

// Financial breakdown:
// - Captain receives: RM 500.00
// - Fishon receives:  RM 50.00
// - SenangPay gets:   RM 8.25 (passed to angler)
// - Angler pays:      RM 558.25
```

### 2. With Discount Applied

```typescript
// Starting point
const tripPrice = 500;
const days = 1;
const discountAmount = 50; // RM 50 off (10%)

// Step 1: Calculate subtotal
const subtotal = tripPrice * days;
// = 500 * 1 = RM 500

// Step 2: Calculate platform fee
const platformFee = subtotal * PLATFORM_FEE_RATE;
// = 500 * 0.10 = RM 50

// Step 3: Calculate amount before service fee (AFTER discount)
const amountBeforeServiceFee = subtotal + platformFee - discountAmount;
// = 500 + 50 - 50 = RM 500

// Step 4: Calculate service fee (on discounted amount)
const serviceFee = amountBeforeServiceFee * SERVICE_FEE_RATE;
// = 500 * 0.015 = RM 7.50

// Step 5: Calculate final price
const finalPrice = amountBeforeServiceFee + serviceFee;
// = 500 + 7.50 = RM 507.50

// Financial breakdown:
// - Captain receives: RM 500.00 (unchanged)
// - Fishon receives:  RM 0.00 (50 - 50 discount)
// - SenangPay gets:   RM 7.50 (passed to angler)
// - Angler pays:      RM 507.50
// - Discount impact:  -RM 50.00 (absorbed by Fishon)
```

### 3. With Tax (Future Implementation)

```typescript
// Starting point
const tripPrice = 500;
const days = 1;
const discountAmount = 0; // No discount for this example

// Step 1: Calculate subtotal
const subtotal = tripPrice * days;
// = 500 * 1 = RM 500

// Step 2: Calculate platform fee
const platformFee = subtotal * PLATFORM_FEE_RATE;
// = 500 * 0.10 = RM 50

// Step 3: Calculate amount before tax and service fee
const amountBeforeTax = subtotal + platformFee - discountAmount;
// = 500 + 50 - 0 = RM 550

// Step 4: Calculate tax (SST 6%)
const taxAmount = amountBeforeTax * TAX_RATE;
// = 550 * 0.06 = RM 33.00

// Step 5: Calculate amount after tax
const amountAfterTax = amountBeforeTax + taxAmount;
// = 550 + 33 = RM 583.00

// Step 6: Calculate service fee (on amount including tax)
const serviceFee = amountAfterTax * SERVICE_FEE_RATE;
// = 583 * 0.015 = RM 8.745 ≈ RM 8.75

// Step 7: Calculate final price
const finalPrice = amountAfterTax + serviceFee;
// = 583 + 8.75 = RM 591.75

// Financial breakdown:
// - Captain receives: RM 500.00
// - Fishon receives:  RM 50.00
// - Tax collected:    RM 33.00 (remitted to government)
// - SenangPay gets:   RM 8.75 (passed to angler)
// - Angler pays:      RM 591.75
```

---

## Key Formulas Reference

### Quick Reference Table

| Field         | Formula                                                | Who Receives                 |
| ------------- | ------------------------------------------------------ | ---------------------------- |
| `subtotal`    | `tripPrice × days`                                     | Captain                      |
| `platformFee` | `subtotal × 0.10`                                      | Fishon                       |
| `discount`    | Promo code amount                                      | Absorbed by Fishon           |
| `taxAmount`   | `(subtotal + platformFee - discount) × 0.06`           | Government (future)          |
| `serviceFee`  | `(subtotal + platformFee - discount + tax) × 0.015`    | SenangPay (passed to angler) |
| `finalPrice`  | `subtotal + platformFee - discount + tax + serviceFee` | Paid by Angler               |

### Revenue Calculations

```typescript
// Captain's earnings (always same as subtotal)
captainEarnings = tripPrice * days;

// Fishon's net revenue
fishonRevenue = platformFee - discount;

// Tax collected (not revenue, held for government)
taxCollected = taxAmount; // Future

// Service fee (passed to angler, not Fishon's cost)
// Already included in finalPrice, not deducted from Fishon
```

---

## Database Schema Mapping

### Booking Model Fields

```prisma
model Booking {
  // === PRICING BREAKDOWN ===
  tripPrice  Decimal @db.Decimal(10, 2) // Captain's base price PER DAY
  discount   Json?   // { code, percentage, amount }
  tax        Json?   // { name, percentage, amount } (future)
  finalPrice Decimal @db.Decimal(10, 2) // Total angler pays

  // === FINANCIAL TRACKING ===
  days             Int      // Number of days booked
  platformFee      Decimal? @db.Decimal(10, 2) // 10% of (tripPrice × days)
  serviceFee       Decimal? @db.Decimal(10, 2) // 1.5% of final amount
  captainEarnings  Decimal? @db.Decimal(10, 2) // tripPrice × days
}
```

### Calculation Order (Database Storage)

```typescript
// 1. Calculate and store subtotal (captain's share)
const captainEarnings = tripPrice * days;

// 2. Calculate and store platform fee
const platformFee = captainEarnings * 0.1;

// 3. Extract discount amount from promo code
const discountAmount = discount?.amount || 0;

// 4. Calculate amount before service fee
const amountBeforeServiceFee = captainEarnings + platformFee - discountAmount;

// 5. Calculate and store service fee
const serviceFee = amountBeforeServiceFee * 0.015;

// 6. Calculate and store final price
const finalPrice = amountBeforeServiceFee + serviceFee;

// Store to database:
await prisma.booking.create({
  data: {
    tripPrice,
    days,
    discount:
      discountAmount > 0 ? { code, percentage, amount: discountAmount } : null,
    platformFee,
    serviceFee,
    captainEarnings,
    finalPrice,
    // ... other fields
  },
});
```

---

## Implementation Checklist

### ✅ Current Implementation

**fishon-market** (Booking Creation):

- [ ] `src/lib/booking/pricing.ts` - Pricing calculation service
- [ ] `src/app/api/bookings/create/route.ts` - Booking creation API
- [ ] Verify: platformFee, serviceFee, captainEarnings stored correctly

**fishon-captain** (Admin Dashboard):

- [x] `src/app/api/admin/promo-codes/[id]/stats/route.ts` - Promo statistics
- [x] Formula: `fishonRevenue = platformFee - discount`
- [ ] `src/app/(admin)/staff/bookings/page.tsx` - Booking financial summary
- [ ] `src/app/(admin)/staff/analytics/revenue/page.tsx` - Revenue dashboard

### 🔄 Files to Verify

1. **Booking Creation Flow** (fishon-market)

   ```typescript
   // File: src/lib/booking/pricing.ts (or similar)
   export function calculateBookingPrice(params: {
     tripPrice: number;
     days: number;
     discountAmount?: number;
     taxRate?: number;
   }) {
     const { tripPrice, days, discountAmount = 0, taxRate = 0 } = params;

     const captainEarnings = tripPrice * days;
     const platformFee = captainEarnings * PLATFORM_FEE_RATE;
     const amountBeforeServiceFee =
       captainEarnings + platformFee - discountAmount;
     const taxAmount = taxRate > 0 ? amountBeforeServiceFee * taxRate : 0;
     const amountAfterTax = amountBeforeServiceFee + taxAmount;
     const serviceFee = amountAfterTax * SERVICE_FEE_RATE;
     const finalPrice = amountAfterTax + serviceFee;

     return {
       captainEarnings,
       platformFee,
       serviceFee,
       taxAmount,
       finalPrice,
     };
   }
   ```

2. **Promo Code Validation** (fishon-market)

   ```typescript
   // File: src/lib/promo-code/validate.ts (or similar)
   export function validatePromoCodeDiscount(params: {
     promoCode: PromoCode;
     subtotal: number;
   }) {
     const maxDiscount = subtotal * MAX_DISCOUNT_RATE;

     let discountAmount = 0;
     if (promoCode.type === "PERCENTAGE") {
       discountAmount = subtotal * (promoCode.percentage / 100);
     } else if (promoCode.type === "FIXED") {
       discountAmount = promoCode.fixedAmount;
     }

     // Ensure discount doesn't exceed platform fee
     return Math.min(discountAmount, maxDiscount);
   }
   ```

3. **Revenue Analytics** (fishon-captain)

   ```typescript
   // File: src/app/api/admin/analytics/revenue/route.ts
   // Calculate total Fishon revenue
   const totalFishonRevenue = bookings
     .filter((b) => b.status === "PAID" || b.status === "COMPLETED")
     .reduce((sum, booking) => {
       const platformFee = Number(booking.platformFee || 0);
       const discountAmount = booking.discount?.amount || 0;
       return sum + (platformFee - discountAmount);
     }, 0);
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
  platformFee: 50.00
  serviceFee: 8.25
  finalPrice: 558.25
  fishonRevenue: 50.00
```

### Test Case 2: 10% Discount (Max)

```typescript
Input:
  tripPrice: 500
  days: 1
  discount: 50 (10%)

Expected Output:
  captainEarnings: 500.00
  platformFee: 50.00
  serviceFee: 7.50
  finalPrice: 507.50
  fishonRevenue: 0.00 ✅
```

### Test Case 3: 5% Discount

```typescript
Input:
  tripPrice: 500
  days: 1
  discount: 25 (5%)

Expected Output:
  captainEarnings: 500.00
  platformFee: 50.00
  serviceFee: 7.88
  finalPrice: 532.88
  fishonRevenue: 25.00
```

### Test Case 4: Multi-Day Booking

```typescript
Input:
  tripPrice: 500
  days: 3
  discount: 150 (10%)

Expected Output:
  captainEarnings: 1500.00
  platformFee: 150.00
  serviceFee: 22.50
  finalPrice: 1522.50
  fishonRevenue: 0.00 ✅
```

---

## Error Prevention Rules

### ⚠️ Common Mistakes to Avoid

1. **DO NOT** subtract service fee from Fishon revenue

   ```typescript
   // ❌ WRONG
   fishonRevenue = platformFee - discount - serviceFee;

   // ✅ CORRECT
   fishonRevenue = platformFee - discount;
   ```

2. **DO NOT** calculate service fee before discount

   ```typescript
   // ❌ WRONG
   serviceFee = (subtotal + platformFee) * 0.015;
   finalPrice = subtotal + platformFee - discount + serviceFee;

   // ✅ CORRECT
   const amountBeforeServiceFee = subtotal + platformFee - discount;
   serviceFee = amountBeforeServiceFee * 0.015;
   finalPrice = amountBeforeServiceFee + serviceFee;
   ```

3. **DO NOT** allow discount to exceed platform fee

   ```typescript
   // ❌ WRONG
   const discountAmount = promoCode.fixedAmount; // Could be > platformFee

   // ✅ CORRECT
   const maxDiscount = platformFee;
   const discountAmount = Math.min(promoCode.fixedAmount, maxDiscount);
   ```

4. **DO NOT** count tax as revenue

   ```typescript
   // ❌ WRONG
   fishonRevenue = platformFee + taxAmount - discount;

   // ✅ CORRECT
   fishonRevenue = platformFee - discount;
   taxCollected = taxAmount; // Separate tracking, not revenue
   ```

---

## Version History

### v1.0 - 25 November 2025 (Current)

- Initial documentation
- Established core formulas
- No tax implementation yet
- Service fee: 1.5% (SenangPay)
- Platform fee: 10%
- Max discount: 10%

### Future Changes

- Tax implementation (SST 6%)
- Possible service fee adjustment based on gateway
- Dynamic platform fee rates (captain tiers)

---

## Related Documents

- `docs/FISHON_REVENUE_POLICY.md` - High-level revenue policy explanation
- `docs/config/BOOKING_SYSTEM.md` - Booking flow and payment system
- `prisma/schema-market.prisma` - Booking model schema

---

## Maintenance Protocol

When updating financial calculations:

1. **Update this document FIRST**
2. Update all implementation files
3. Add migration if database schema changes
4. Update test cases
5. Verify in staging environment
6. Document changes in version history

**Critical**: All financial calculations must reference this document as the single source of truth.

---

_This is a living document. Any changes to financial calculations must be reflected here and communicated to the development team._
