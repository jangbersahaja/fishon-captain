# Dual-Flow Booking System: Card Tokenization vs. Direct Payment

## Overview

The booking system now supports **TWO payment flows** based on payment method selection:

### Flow A: Card Tokenization (Pseudo Pre-Authorization)

- **Payment Method**: Credit/Debit Card
- **Flow Type**: `TOKENIZED`
- **Status**: `PAYMENT_PENDING` → `PAID` (or `REJECTED`)
- **User Experience**: "Your card will only be charged if captain approves"

### Flow B: Direct Payment (Immediate Charge)

- **Payment Methods**: FPX, E-wallet (GrabPay, TNG, Boost, etc.)
- **Flow Type**: `DIRECT`
- **Status**: `PAID` → `PAID` (confirmed) or `REJECTED` (refund initiated)
- **User Experience**: "Payment completes immediately, refund if captain declines"

---

## Technical Implementation

### Database Schema

```prisma
model Booking {
  // Payment tracking
  paymentMethod        String? // "CARD", "FPX", "EWALLET"
  paymentFlow          String? // "TOKENIZED", "DIRECT"
  paymentIntentId      String? // Token ID (TOKENIZED) or booking ID (DIRECT)
  paymentAuthorizedAt  DateTime? // Token created (TOKENIZED only)
  paymentCapturedAt    DateTime? // Charged (both flows)
  paymentReleasedAt    DateTime? // Token released (TOKENIZED only)

  // Booking status
  status BookingStatus // PAYMENT_PENDING (tokenized) or PAID (direct)
  expiresAt DateTime   // Captain approval deadline (both flows)
}
```

### Flow Comparison Table

| Aspect                | TOKENIZED (Card)            | DIRECT (FPX/E-wallet)              |
| --------------------- | --------------------------- | ---------------------------------- |
| **When angler pays**  | Never (until approved)      | Immediately at booking             |
| **Initial status**    | `PAYMENT_PENDING`           | `PAID`                             |
| **Money held?**       | Card token stored           | Money charged to angler            |
| **Captain approval**  | Charges card                | Just confirms booking              |
| **Captain rejection** | Releases token (no charge)  | **MUST refund angler**             |
| **Angler risk**       | Very low (card not charged) | Medium (refund takes 3-5 days)     |
| **Platform risk**     | Low (no money movement)     | High (hold funds, process refunds) |
| **Refund needed?**    | Only if charged already     | YES (if captain rejects)           |

---

## Booking Creation Flow

### TOKENIZED Flow (Card)

```typescript
// 1. Angler submits booking with card details
const paymentIntent = await createPaymentIntent({
  bookingId: "booking-123",
  amount: 500,
  paymentMethod: "CARD",
  cardDetails: { number, cvv, expiryMonth, expiryYear },
  customerName,
  customerEmail,
  customerPhone,
});

// 2. Store token without charging
// paymentIntent.paymentIntentId = "token-abc123"
// paymentIntent.requiresRedirect = false

// 3. Create booking
await prisma.booking.create({
  data: {
    status: "PAYMENT_PENDING", // Not charged yet
    paymentMethod: "CARD",
    paymentFlow: "TOKENIZED",
    paymentIntentId: paymentIntent.paymentIntentId,
    paymentAuthorizedAt: new Date(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h captain deadline
  },
});

// 4. Notify captain: "New PAID booking request (card held)"
```

### DIRECT Flow (FPX/E-wallet)

```typescript
// 1. Angler submits booking
const paymentIntent = await createPaymentIntent({
  bookingId: "booking-123",
  amount: 500,
  paymentMethod: "FPX", // or "EWALLET"
  customerName,
  customerEmail,
  customerPhone,
});

// 2. Redirect angler to payment gateway
// paymentIntent.requiresRedirect = true
// paymentIntent.redirectUrl = "https://app.senangpay.my/payment/..."

// 3. Angler completes payment (callback receives transaction)
// Callback creates booking:
await prisma.booking.create({
  data: {
    status: "PAID", // Already charged!
    paymentMethod: "FPX",
    paymentFlow: "DIRECT",
    paymentIntentId: bookingId, // No token
    paymentTransactionId: transactionId, // From callback
    paymentCapturedAt: new Date(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h captain deadline
  },
});

// 4. Notify captain: "New booking - angler already paid, please review"
```

---

## Captain Approval/Rejection

### Approval Logic

```typescript
// Check payment flow
if (booking.paymentFlow === "TOKENIZED") {
  // CARD: Charge the token now
  const result = await capturePayment(
    booking.paymentIntentId,
    booking.finalPrice,
    booking.id
  );

  if (result.success) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "PAID",
        paymentTransactionId: result.transactionId,
        paymentCapturedAt: new Date(),
      },
    });
    // Send "Payment Captured" notification
  } else {
    // Handle capture failure (retry, notify angler)
  }
} else if (booking.paymentFlow === "DIRECT") {
  // FPX/E-wallet: Already paid, just confirm
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "PAID", // Keep PAID status
      captainDecisionAt: new Date(),
    },
  });
  // Send "Booking Confirmed" notification
}
```

### Rejection Logic

```typescript
// Check payment flow
if (booking.paymentFlow === "TOKENIZED") {
  // CARD: Release token (no charge, no refund)
  await releasePayment(booking.paymentIntentId);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "REJECTED",
      paymentReleasedAt: new Date(),
    },
  });
  // Send "Request Declined" notification (no refund mention)
} else if (booking.paymentFlow === "DIRECT") {
  // FPX/E-wallet: MUST REFUND (angler already paid)
  const refund = await initiateRefund({
    bookingId: booking.id,
    reason: "CAPTAIN_REJECTION",
    refundType: "FULL",
  });

  await refundPayment(
    booking.paymentTransactionId!,
    refund.refundAmount,
    "Captain declined booking"
  );

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "REJECTED",
      refundStatus: "PROCESSING",
    },
  });
  // Send "Request Declined - Refund Processing" notification
}
```

---

## Cancellation Logic

### Angler Cancels Before Approval

```typescript
if (booking.status === "PAYMENT_PENDING") {
  // TOKENIZED flow only (DIRECT goes straight to PAID)

  // Release token
  await releasePayment(booking.paymentIntentId!);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      paymentReleasedAt: new Date(),
    },
  });
  // No refund needed (card never charged)
}
```

### Angler Cancels After Confirmation (PAID status)

```typescript
if (booking.status === "PAID") {
  // Apply cancellation policy (both flows)
  const refundCalc = calculateRefundAmount(booking);

  // Initiate refund
  const refund = await initiateRefund({
    bookingId: booking.id,
    reason: "ANGLER_CANCELLATION",
    refundType: refundCalc.refundAmount > 0 ? "POLICY_BASED" : "NONE",
  });

  if (refundCalc.refundAmount > 0) {
    await refundPayment(
      booking.paymentTransactionId!,
      refund.refundAmount,
      `Cancellation ${refundCalc.daysBeforeTrip} days before trip`
    );
  }

  // Update captain earnings (partial payment if late cancellation)
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      captainEarnings: refundCalc.captainAmount,
      refundStatus: refundCalc.refundAmount > 0 ? "PROCESSING" : null,
    },
  });
}
```

---

## Expiration Logic (Captain Doesn't Respond)

```typescript
// Find bookings past expiration deadline
const expiredBookings = await prisma.booking.findMany({
  where: {
    OR: [
      { status: "PAYMENT_PENDING" }, // Tokenized flow
      {
        status: "PAID",
        paymentFlow: "DIRECT",
        captainDecisionAt: null, // Direct flow, not yet approved
      },
    ],
    expiresAt: { lt: new Date() },
  },
});

for (const booking of expiredBookings) {
  if (booking.paymentFlow === "TOKENIZED") {
    // Release token (no charge, no refund)
    await releasePayment(booking.paymentIntentId!);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "EXPIRED",
        paymentReleasedAt: new Date(),
      },
    });
    // Notify angler: "Request expired (no charge)"
  } else if (booking.paymentFlow === "DIRECT") {
    // MUST REFUND (angler already paid)
    const refund = await initiateRefund({
      bookingId: booking.id,
      reason: "AUTHORIZATION_EXPIRED",
      refundType: "FULL",
    });

    await refundPayment(
      booking.paymentTransactionId!,
      refund.refundAmount,
      "Captain didn't respond within 12 hours"
    );

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "EXPIRED",
        refundStatus: "PROCESSING",
      },
    });
    // Notify angler: "Request expired - Refund processing"
  }
}
```

---

## UI/UX Considerations

### Payment Method Selector

```tsx
<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
  <RadioGroupItem value="CARD">
    <CreditCard />
    <span>Credit/Debit Card</span>
    <Badge variant="success">No Charge Until Approved</Badge>
  </RadioGroupItem>

  <RadioGroupItem value="FPX">
    <Building />
    <span>Online Banking (FPX)</span>
    <Badge variant="warning">Immediate Payment</Badge>
  </RadioGroupItem>

  <RadioGroupItem value="EWALLET">
    <Wallet />
    <span>E-Wallet</span>
    <Badge variant="warning">Immediate Payment</Badge>
  </RadioGroupItem>
</RadioGroup>;

{
  paymentMethod === "CARD" && (
    <InfoBox variant="success">
      Your card will only be charged if the captain approves your booking. No
      charge if declined.
    </InfoBox>
  );
}

{
  (paymentMethod === "FPX" || paymentMethod === "EWALLET") && (
    <InfoBox variant="warning">
      Payment completes immediately. If captain declines, refund takes 3-5
      business days.
    </InfoBox>
  );
}
```

### Booking Confirmation Messages

```tsx
// TOKENIZED flow
if (booking.paymentFlow === "TOKENIZED") {
  return (
    <Alert variant="success">
      <ShieldCheck className="h-4 w-4" />
      <AlertTitle>Card Authorized</AlertTitle>
      <AlertDescription>
        Your card has been authorized but not charged. You'll only be charged if
        the captain approves your booking within 12 hours.
      </AlertDescription>
    </Alert>
  );
}

// DIRECT flow
if (booking.paymentFlow === "DIRECT") {
  return (
    <Alert variant="info">
      <Clock className="h-4 w-4" />
      <AlertTitle>Payment Received</AlertTitle>
      <AlertDescription>
        Your payment is confirmed. Awaiting captain approval (within 12 hours).
        If declined, full refund will be processed automatically.
      </AlertDescription>
    </Alert>
  );
}
```

### Captain Dashboard Badge

```tsx
if (booking.paymentFlow === "TOKENIZED") {
  return <Badge variant="blue">Card Held</Badge>;
}

if (booking.paymentFlow === "DIRECT") {
  return <Badge variant="green">Already Paid</Badge>;
}
```

---

## Risk Analysis

### TOKENIZED Flow (Card)

✅ **Pros**:

- Zero risk for angler (card not charged if rejected)
- No refund processing needed on rejection
- Better user experience

❌ **Cons**:

- Card authorization may fail at approval time
- Need retry logic for failed captures
- Token expires after 30 days (not an issue for 12h window)

### DIRECT Flow (FPX/E-wallet)

✅ **Pros**:

- Payment guaranteed (no capture failures)
- Popular payment methods in Malaysia
- No card required

❌ **Cons**:

- Angler money at risk (3-5 day refund wait)
- Platform holds funds temporarily
- Higher customer support load (refund inquiries)
- Captain rejection rate impacts angler trust

---

## Recommendations

### Phase 1: Launch with Both Flows

- Implement both TOKENIZED and DIRECT flows
- Set CARD as default/recommended method
- Show clear warnings for FPX/E-wallet

### Phase 2: Monitor Metrics

- Track captain rejection rates by payment method
- Measure refund processing times
- Survey angler satisfaction

### Phase 3: Optimize Based on Data

- If rejection rate < 5%: Promote all payment methods equally
- If rejection rate > 15%: Restrict to CARD only, or add captain deposits
- If refunds slow: Add auto-approval for trusted captains

### Alternative: Card-Only Launch

If FPX/E-wallet refunds are too risky initially:

1. Launch with CARD (TOKENIZED) only
2. Monitor system stability
3. Add FPX/E-wallet after 2-3 months of successful operation

---

## Testing Checklist

### TOKENIZED Flow

- [ ] Card tokenization succeeds
- [ ] Booking created with PAYMENT_PENDING status
- [ ] Captain approval charges card
- [ ] Captain rejection releases token (no charge)
- [ ] Angler cancellation releases token
- [ ] Authorization expiration releases token
- [ ] Failed capture triggers retry + notification

### DIRECT Flow

- [ ] FPX payment redirects correctly
- [ ] Callback creates booking with PAID status
- [ ] Captain approval confirms (no payment action)
- [ ] Captain rejection initiates refund
- [ ] Angler cancellation applies policy + refund
- [ ] Authorization expiration initiates refund
- [ ] Refund status tracking works

### Edge Cases

- [ ] Captain approves AFTER expiration (should fail)
- [ ] Duplicate bookings prevented (race condition)
- [ ] Network failure during capture (retry logic)
- [ ] Refund API failure (manual intervention alert)
- [ ] Token already charged (don't charge twice)
