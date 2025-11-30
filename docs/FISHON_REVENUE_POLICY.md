# Fishon Revenue Policy

## Overview

Fishon operates on a commission-based model where we earn a percentage of each booking while ensuring captains receive their base price. As of November 2025, we've updated our pricing model to:

1. **Hide commission from anglers** (baked into displayed trip price)
2. **Cap commission at RM100** for larger trips
3. **Increase service fee to 2%** (1.5% SenangPay + 0.5% Fishon)

---

## Pricing Structure

### Captain's Base Price

- Captain sets the **base price** (stored in Trip model as `price` or `priceOverride`)
- Admin can override with **priceOverride** via pricing dashboard
- **Captain always receives**: Base price × days (unchanged by commission)

### Display Price (What Angler Sees)

```
Display Price = Base Price + Commission (baked in)
```

The commission is HIDDEN from anglers - they only see a single trip price.

### Angler's Payment

```
Final Price = Display Price - Discount + Service Fee
            = (Base Price + Commission) - Discount + (2% Service Fee)
```

**Example (RM 500 trip, 1 day):**

```
Captain's base price:       RM  500
Commission (10%, capped):   RM   50 (hidden)
─────────────────────────────────────
Display Price (angler sees): RM  550

Service fee (2%):           RM   11
─────────────────────────────────────
Final Price (angler pays):   RM  561
```

**Example (RM 2,000 trip, 1 day - Cap Applied):**

```
Captain's base price:       RM 2,000
Commission (CAPPED):        RM   100 (not RM 200!)
─────────────────────────────────────
Display Price (angler sees): RM 2,100

Service fee (2%):           RM    42
─────────────────────────────────────
Final Price (angler pays):   RM 2,142
```

---

## Revenue Breakdown

### 1. Platform Fee (Commission) - 10%, CAPPED at RM100

- **Calculation**: `min(tripPrice × days × 0.10, RM100)`
- **Purpose**: Fishon's commission for marketplace services
- **Visibility**: HIDDEN from anglers (baked into display price)
- **Examples**:
  - RM 500 trip → RM 50 commission
  - RM 1,000 trip → RM 100 commission (exactly at cap)
  - RM 2,000 trip → RM 100 commission (capped!)

### 2. Service Fee (2%)

- **Calculation**: 2% of amount before service fee (display price - discount)
- **Split**:
  - **1.5%** → SenangPay (payment gateway)
  - **0.5%** → Fishon (service revenue)
- **Who pays**: Added to angler's final price
- **Example**: RM 550 × 2% = RM 11 (RM 8.25 SenangPay, RM 2.75 Fishon)

### 3. Discount Impact

- **Who absorbs**: Fishon (deducted from platform fee first)
- **Maximum**: Cannot exceed commission + Fishon's 0.5% service portion
- **Captain protected**: Always gets full base price

**Example with RM 50 discount:**

```
Display price:      RM 550 (500 base + 50 commission)
Discount:          -RM  50
Amount after disc:  RM 500
Service fee (2%):   RM  10
─────────────────────────────────
Final Price:        RM 510

Revenue breakdown:
- Captain receives:  RM 500.00
- Fishon commission: RM   0.00 (50 - 50 absorbed)
- Fishon service:    RM   2.50 (0.5% of 500)
- SenangPay:         RM   7.50 (1.5% of 500)
```

### 4. Tax (Future Implementation)

- **SST (6%)**: Will be collected and remitted to government
- **Not revenue**: Fishon holds and pays to tax authorities
- **Calculation**: Added after discount, before service fee

---

## Financial Flow

### Money In (from Angler) - RM 500 trip

```
RM 561.00 (Final Price)
```

### Money Out

```
Captain earnings:     RM 500.00 (base price × days)
SenangPay fee:        RM   8.25 (1.5% of display price)
─────────────────────────────────
Fishon net revenue:   RM  52.75 (commission + 0.5% service)
```

### Fishon's Total Revenue Formula

```
Fishon Revenue = (Commission - Discount) + (0.5% of amount after discount)
               = (platformFee - discount) + (serviceFee × 0.25)
```

---

## Database Fields Reference

### Booking Model (`schema-market.prisma`)

```prisma
model Booking {
  // Price fields
  tripPrice       Decimal  // Captain's base price PER DAY (NOT display price!)
  finalPrice      Decimal  // Total angler pays
  discount        Json?    // { code, percentage, amount }
  tax             Json?    // { name, percentage, amount } (future)

  // Financial tracking
  platformFee     Decimal? // min(10% of subtotal, RM100) - CAPPED!
  serviceFee      Decimal? // 2% of (subtotal + platformFee - discount)
  captainEarnings Decimal? // tripPrice × days (unchanged)
}
```

### Calculation Formula in Code

```typescript
// Base calculation
const subtotal = tripPrice * days; // What captain gets

// Fishon's share (CAPPED!)
const platformFee = Math.min(subtotal * 0.1, 100);

// Display price (what angler sees)
const displayPrice = tripPrice + platformFee / days;

// Amount after discount
const amountBeforeServiceFee = subtotal + platformFee - discount;

// Service fee (2%)
const serviceFee = amountBeforeServiceFee * 0.02;

// What angler pays
const finalPrice = amountBeforeServiceFee + serviceFee;

// Fishon's total revenue
const fishonRevenue = platformFee - discount + serviceFee * 0.25;
```

---

## Key Differences from Previous Model

| Aspect                | Previous (Pre-Nov 2025) | Current                           |
| --------------------- | ----------------------- | --------------------------------- |
| Commission visibility | Shown to angler         | Hidden (baked in)                 |
| Commission cap        | No cap                  | RM100 maximum                     |
| Service fee           | 1.5% (SenangPay only)   | 2% (1.5% SenangPay + 0.5% Fishon) |
| Captain earnings      | subtotal - platformFee  | subtotal (unchanged!)             |

---

## Key Principles

1. **Captain Protection**: Always receives full base price regardless of discounts or commission
2. **Commission Cap**: Large trips (>RM1,000) have commission capped at RM100
3. **Hidden Commission**: Anglers see a single trip price (commission baked in)
4. **Fishon Risk**: Absorbs all promotional discounts from commission
5. **Service Fee Split**: 2% total (1.5% SenangPay + 0.5% Fishon revenue)
6. **Tax Neutrality**: When implemented, tax is collected but not counted as revenue

---

## Summary

**Fishon earns money through:**

- ✅ 10% platform fee on captain's base price (capped at RM100)
- ✅ 0.5% service fee (new revenue stream)

**Fishon costs:**

- ❌ Promotional discounts (absorbed from commission)
- ❌ 1.5% SenangPay gateway fees (passed to angler)

**Captain always receives:**

- ✅ Full base price (100%) - NEVER reduced by commission
- ✅ No risk from platform promotions
- ✅ Predictable earnings per booking

---

_Last updated: July 7, 2025_
