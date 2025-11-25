# Fishon Revenue Policy

## Overview

Fishon operates on a commission-based model where we earn a percentage of each booking while ensuring captains receive their base price.

---

## Pricing Structure

### Captain's Base Price

- Captain sets the **base price** (stored in Trip model)
- Captain can optionally set a **promo price** (currently not in use)
- **Captain always receives**: Base price (or promo price if active)

### Angler's Payment

Anglers pay more than the captain's base price to cover platform and payment processing fees:

```
Angler Payment = Base Price + Platform Fee + Service Fee - Discount + Tax
```

**Example:**

```
Captain's base price: RM 1,000
Platform fee (10%): RM 100
Service fee (1.5%): RM 16.50
Subtotal: RM 1,116.50
Discount (if any): -RM 50
Tax (future): RM 0
─────────────────────────
Final Price: RM 1,066.50
```

---

## Revenue Breakdown

### 1. Platform Fee (10%)

- **Calculation**: 10% of (tripPrice × days)
- **Purpose**: Fishon's commission for marketplace services
- **Example**: RM 1,000 × 10% = RM 100

### 2. Service Fee (1.5%)

- **Calculation**: 1.5% of final payment amount
- **Purpose**: SenangPay payment gateway charges
- **Who pays**: Passed to angler in final price
- **Example**: RM 1,066.50 × 1.5% ≈ RM 16.50

### 3. Discount Impact

- **Who absorbs**: Fishon (deducted from platform fee)
- **Maximum**: 10% (cannot exceed platform fee)
- **Why limit**: Ensures Fishon doesn't operate at a loss

**Example with discount:**

```
Platform fee: RM 100
Discount given: -RM 50
Service fee: -RM 16.50
─────────────────────────
Fishon net revenue: RM 33.50
```

### 4. Tax (Future Implementation)

- **SST (6%)**: Will be collected and remitted to government
- **Not revenue**: Fishon holds and pays to tax authorities
- **Calculation**: Added on top of subtotal

---

## Financial Flow

### Money In (from Angler)

```
RM 1,066.50 (Final Price)
```

### Money Out

```
Captain earnings: RM 1,000.00 (base price)
Service fee:      RM   16.50 (to SenangPay)
Discount covered: RM   50.00 (absorbed by Fishon)
─────────────────────────────
Fishon net:       RM   33.50
```

---

## Database Fields Reference

### Booking Model (`schema-market.prisma`)

```prisma
model Booking {
  // Price fields
  tripPrice       Decimal  // Captain's base price PER DAY
  finalPrice      Decimal  // Total angler pays
  discount        Json?    // { code, percentage, amount }
  tax             Json?    // { name, percentage, amount } (future)

  // Financial tracking
  platformFee     Decimal? // 10% of (tripPrice × days)
  serviceFee      Decimal? // 1.5% of finalPrice
  captainEarnings Decimal? // tripPrice × days
}
```

### Calculation Formula in Code

```typescript
// Base calculation
const subtotal = tripPrice * days; // What captain gets

// Fishon's share
const platformFee = subtotal * 0.1; // 10% commission

// Gateway cost (passed to angler)
const serviceFee = (subtotal + platformFee - discount) * 0.015;

// What angler pays
const finalPrice = subtotal + platformFee + serviceFee - discount;

// Fishon's actual revenue
const fishonRevenue = platformFee - discount - serviceFee;
```

---

## Promo Code Impact

### Universal Codes (Public)

- **Who uses**: Anyone with the code
- **Tracking**: Total bookings and sales
- **Metrics shown**:
  - Total Sales (angler payments)
  - Fishon Revenue (net after discount)
  - Total Discount Given

### Registration Codes (Assigned)

- **Who uses**: Specific assigned users
- **Tracking**: Assignments + redemptions
- **Metrics shown**:
  - Conversion Rate (% of assigned users who used it)
  - Total Sales
  - Fishon Revenue

### Discount Economics

- **Maximum discount**: 10% (limited to platform fee)
- **Fishon absorbs**: All discount amounts
- **Captain protected**: Always gets full base price
- **SenangPay fee**: Still deducted from net

**Example Impact:**

```
Without discount:
Platform fee:     RM 100.00
Service fee:      RM  16.50
Fishon revenue:   RM  83.50

With RM 50 discount:
Platform fee:     RM 100.00
Discount:         -RM  50.00
Service fee:      -RM  16.50
Fishon revenue:   RM  33.50 (60% reduction)
```

---

## Admin Dashboard Metrics

### Promo Code Statistics Page

**1. Total Bookings**

- Count of all bookings using this code
- Shows usage/max uses ratio

**2. Total Discount Given**

- Sum of all discount amounts absorbed by Fishon
- Directly reduces Fishon revenue

**3. Total Sales**

- Sum of all `finalPrice` from paid bookings
- What anglers actually paid

**4. Fishon Revenue**

- Net earnings: `platformFee - discount - serviceFee`
- Shows actual profit after costs

**5. Conversion Rate** (Registration codes only)

- Percentage of assigned users who redeemed
- Measures marketing effectiveness

---

## Future Considerations

### Tax Implementation (SST 6%)

When implemented:

```
Base price:       RM 1,000.00
Platform fee:     RM   100.00
Subtotal:         RM 1,100.00
Tax (6%):         RM    66.00
Service fee:      RM    17.49
Discount:         -RM   50.00
─────────────────────────────
Final price:      RM 1,133.49

Revenue breakdown:
- Captain gets:   RM 1,000.00
- Tax remitted:   RM    66.00 (not revenue)
- Service fee:    -RM    17.49
- Discount:       -RM    50.00
─────────────────────────────
Fishon net:       RM    50.00
```

**Important**: Tax is collected but not revenue—it's held and remitted to government.

---

## Key Principles

1. **Captain Protection**: Always receives full base price regardless of discounts
2. **Fishon Risk**: Absorbs all promotional discounts from commission
3. **Gateway Transparency**: Service fees passed to customer, not absorbed
4. **Maximum Discount**: Cannot exceed platform fee (10% limit)
5. **Tax Neutrality**: When implemented, tax is collected but not counted as revenue

---

## Summary

**Fishon earns money through:**

- ✅ 10% platform fee on captain's base price
- ✅ Markup to cover SenangPay fees (passed to angler)

**Fishon loses money through:**

- ❌ Promotional discounts (absorbed from platform fee)
- ❌ Payment gateway fees (but passed to angler)

**Captain always receives:**

- ✅ Full base price (100%)
- ✅ No risk from platform promotions
- ✅ Predictable earnings per booking

---

_Last updated: November 25, 2025_
