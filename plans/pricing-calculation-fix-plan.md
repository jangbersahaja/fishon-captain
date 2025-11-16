# Pricing Calculation Fix Plan

## Problem Summary

**Current Issue**: Earnings and platform fees show RM0 for all bookings because:

1. `platformFee` and `captainEarnings` are never calculated during booking creation
2. Pricing calculation is too simple (only `tripPrice * days`)
3. No payment gateway fees, platform fees, or discount calculations

## Correct Pricing Structure

### Formula Breakdown

```
Trip Price (base): RM500
Days: 1
Subtotal: RM500

Platform Fee (10%): +RM50
Discount/Promo (e.g. 10%): -RM50
Payment Gateway Fee (1.5%): +RM7.50
SST (not yet): +RM0

Final Price (what angler pays): RM507.50
Captain Earnings: RM450 (RM500 - RM50 platform fee)
```

### Key Rules

- **Platform Fee**: Always 10% of trip price (no packages yet, all BASIC)
- **Payment Gateway Fee**: 1.5% of final price
- **Discount**: Applied as percentage of trip price
- **SST**: Not applicable yet
- **Captain Earnings**: Trip Price - Platform Fee

## Implementation Strategy

### Phase 1: Add Pricing Calculation Functions (Both Apps)

**File**: `/fishon-market/src/lib/services/pricing-service.ts` (NEW)
**File**: `/fishon-captain/src/lib/services/pricing-service.ts` (NEW - copied from market)

```typescript
export interface PricingBreakdown {
  tripPrice: number; // Base price per day
  days: number; // Number of days
  subtotal: number; // tripPrice * days
  platformFee: number; // 10% of subtotal
  discount: number; // Promo code discount amount
  paymentGatewayFee: number; // 1.5% of (subtotal + platformFee - discount)
  sst: number; // Future: SST tax
  finalPrice: number; // What angler pays
  captainEarnings: number; // What captain receives (subtotal - platformFee)
}

export interface PricingInput {
  tripPrice: number;
  days: number;
  promoCode?: {
    code: string;
    percentage: number; // e.g., 10 for 10%
  };
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tripPrice, days, promoCode } = input;

  // Step 1: Subtotal
  const subtotal = tripPrice * days;

  // Step 2: Platform Fee (10% of subtotal)
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100;

  // Step 3: Discount (if promo code applied)
  const discount = promoCode
    ? Math.round(subtotal * (promoCode.percentage / 100) * 100) / 100
    : 0;

  // Step 4: Amount before gateway fee
  const amountBeforeGateway = subtotal + platformFee - discount;

  // Step 5: Payment Gateway Fee (1.5% of amount)
  const paymentGatewayFee = Math.round(amountBeforeGateway * 0.015 * 100) / 100;

  // Step 6: SST (future - currently 0)
  const sst = 0;

  // Step 7: Final Price
  const finalPrice =
    Math.round((amountBeforeGateway + paymentGatewayFee + sst) * 100) / 100;

  // Step 8: Captain Earnings (subtotal minus platform fee)
  const captainEarnings = Math.round((subtotal - platformFee) * 100) / 100;

  return {
    tripPrice,
    days,
    subtotal,
    platformFee,
    discount,
    paymentGatewayFee,
    sst,
    finalPrice,
    captainEarnings,
  };
}
```

### Phase 2: Update Booking Creation (fishon-market)

**File**: `/fishon-market/src/app/api/bookings/create/route.ts`

**Changes**:

1. Import `calculatePricing` function
2. Calculate breakdown before creating booking
3. Store `platformFee` and `captainEarnings` in booking record

```typescript
// Calculate pricing breakdown
const pricingBreakdown = calculatePricing({
  tripPrice: Number(trip.price),
  days: ds,
  promoCode: promoCode
    ? {
        code: promoCode,
        percentage: 10, // TODO: Fetch from PromoCode table
      }
    : undefined,
});

// Create booking with financial fields
return await tx.booking.create({
  data: {
    // ... existing fields ...
    tripPrice: pricingBreakdown.subtotal,
    finalPrice: pricingBreakdown.finalPrice,
    platformFee: pricingBreakdown.platformFee,
    captainEarnings: pricingBreakdown.captainEarnings,
    discount: promoCode
      ? {
          code: promoCode,
          percentage: 10,
          amount: pricingBreakdown.discount,
        }
      : undefined,
  },
});
```

### Phase 3: Update UI to Show Breakdown (fishon-market)

**File**: `/fishon-market/src/app/(marketplace)/book/[charterId]/ui/BookingSummaryCard.tsx`

**Add Price Breakdown**:

```tsx
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span>
      Trip Price ({days} {days > 1 ? "days" : "day"})
    </span>
    <span>RM {subtotal}</span>
  </div>
  <div className="flex justify-between">
    <span>Platform Fee (10%)</span>
    <span>+RM {platformFee}</span>
  </div>
  {discount > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Discount ({promoCode})</span>
      <span>-RM {discount}</span>
    </div>
  )}
  <div className="flex justify-between">
    <span>Payment Gateway Fee (1.5%)</span>
    <span>+RM {paymentGatewayFee}</span>
  </div>
  <div className="border-t pt-2 flex justify-between font-semibold">
    <span>Total</span>
    <span>RM {finalPrice}</span>
  </div>
</div>
```

### Phase 4: Update CheckoutForm (fishon-market)

**File**: `/fishon-market/src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`

**Replace `estTotal` calculation**:

```typescript
const pricingBreakdown = useMemo(() => {
  const p = chosenTrip?.price ?? 0;
  return calculatePricing({
    tripPrice: p,
    days: Math.max(1, days),
    // promoCode: promoCodeInput, // Phase 2: Add promo code support
  });
}, [chosenTrip?.price, days]);

const estTotal = pricingBreakdown.finalPrice;
```

### Phase 5: Promo Code System (Future)

**Database Schema** (fishon-market):

```prisma
model PromoCode {
  id            String   @id @default(cuid())
  code          String   @unique
  percentage    Int      // Discount percentage (10 = 10%)
  maxUses       Int?     // Max uses allowed
  usedCount     Int      @default(0)
  validFrom     DateTime
  validUntil    DateTime
  isActive      Boolean  @default(true)
  charterIds    String[] // Empty = applies to all charters
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**API Endpoint**: `/api/promo-codes/validate`

**UI Component**: Promo code input in CheckoutForm

### Phase 6: Fix Existing Bookings (Migration)

**File**: `/fishon-market/scripts/backfill-booking-financials.ts`

```typescript
// Recalculate platformFee and captainEarnings for existing PAID bookings
const bookings = await prisma.booking.findMany({
  where: {
    status: "PAID",
    OR: [{ platformFee: null }, { captainEarnings: null }],
  },
});

for (const booking of bookings) {
  const pricing = calculatePricing({
    tripPrice: Number(booking.tripPrice),
    days: booking.days,
    // Note: Can't retroactively apply promo codes
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      platformFee: pricing.platformFee,
      captainEarnings: pricing.captainEarnings,
    },
  });
}
```

## Files to Create/Modify

### NEW Files

1. `/fishon-market/src/lib/services/pricing-service.ts`
2. `/fishon-captain/src/lib/services/pricing-service.ts` (copy from market)
3. `/fishon-market/scripts/backfill-booking-financials.ts`

### MODIFY Files

1. `/fishon-market/src/app/api/bookings/create/route.ts`
2. `/fishon-market/src/app/api/bookings/create-guest/route.ts`
3. `/fishon-market/src/app/(marketplace)/book/[charterId]/ui/CheckoutForm.tsx`
4. `/fishon-market/src/app/(marketplace)/book/[charterId]/ui/BookingSummaryCard.tsx`

## Testing Checklist

- [ ] Create new booking → verify platformFee and captainEarnings saved correctly
- [ ] Captain earnings page → verify amounts show correctly
- [ ] Finance dashboard → verify revenue stats calculate correctly
- [ ] Booking summary → verify price breakdown displays correctly
- [ ] Run migration script → verify existing bookings updated
- [ ] Test with promo code (future) → verify discount applied correctly

## Rollout Plan

1. **Step 1**: Create pricing-service.ts in both apps
2. **Step 2**: Update booking creation endpoints
3. **Step 3**: Update UI components
4. **Step 4**: Test with new bookings
5. **Step 5**: Run migration for existing bookings
6. **Step 6**: Verify finance pages show correct data
