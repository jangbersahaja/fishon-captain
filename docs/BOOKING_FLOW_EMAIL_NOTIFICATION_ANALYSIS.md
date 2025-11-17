# Booking Flow Email & Notification Analysis

**Date**: November 17, 2025  
**Status**: ✅ Analysis Complete  
**Superseded By**: `EMAIL_NOTIFICATION_SYSTEM.md`

---

> ⚠️ **Note**: This document contains the initial analysis of booking flow differences.  
> **For complete documentation, refer to: `EMAIL_NOTIFICATION_SYSTEM.md`**

---

## Executive Summary

✅ **Both MANUAL and AUTO booking flows have differentiated email and notification services**  
✅ **Refund status IS communicated to anglers when booking is rejected**  
✅ **New acknowledge API exists for AUTO flow**  
✅ **Payment flow awareness is implemented throughout**

---

## Flow Type Overview

### MANUAL Flow (Request & Approve)

**Flow**: Request → Captain Approves → Angler Pays → Confirmed

**Initial Status**: `PENDING`  
**Booking Flow Type**: `MANUAL`  
**Deadlines**:

- `approvalDeadline`: Captain must approve within timeframe
- `paymentDeadline`: Angler must pay within 48h after approval

**Payment Timing**: AFTER captain approval

### AUTO Flow (Instant Booking)

**Flow**: Angler Pays → Captain Acknowledges → Confirmed

**Initial Status**: `PAYMENT_AUTHORIZED`  
**Booking Flow Type**: `AUTO`  
**Deadlines**:

- `acknowledgmentDeadline`: Captain must acknowledge within 12h

**Payment Timing**: BEFORE captain review (pre-authorized or captured)

---

## Email Service Differences

### 1. **Booking Created Email** (`sendBookingCreatedEmail`)

**Location**: `/api/bookings/create`, `/api/bookings/create-guest`

**Parameters Include**:

```typescript
{
  paymentFlow?: "TOKENIZED" | "DIRECT" // NEW parameter
}
```

**Template Behavior** (`BookingCreatedEmail.tsx`):

#### MANUAL Flow (No payment yet)

- No special payment messaging
- Standard "booking request sent for review" message

#### AUTO Flow - TOKENIZED (Card)

```tsx
{
  paymentFlow === "TOKENIZED" && (
    <Text>
      💳 Your card has been authorized (not charged yet). We'll only charge your
      card if the captain approves your booking.
    </Text>
  );
}
```

#### AUTO Flow - DIRECT (FPX/E-wallet)

```tsx
{
  paymentFlow === "DIRECT" && (
    <Text>
      ✅ Payment received! Your payment of {totalPrice} has been received and is
      being held securely. It will be released to the captain once they approve
      your booking.
    </Text>
  );
}
```

### 2. **Booking Approved Email** (`sendBookingApprovedEmail`)

**Location**: `/api/bookings/approve`

**Flow**: MANUAL ONLY

**Behavior**:

- Only sent for MANUAL flow bookings (status: `PENDING` → `AWAITING_PAYMENT`)
- Includes payment link with 48h deadline
- AUTO flow bookings skip this entirely (already paid)

**API Validation**:

```typescript
if (booking.bookingFlowType !== "MANUAL") {
  return NextResponse.json(
    {
      error:
        "Only manual flow bookings can be approved. Auto flow bookings are already paid.",
    },
    { status: 409 }
  );
}
```

### 3. **Booking Rejected Email** (`sendBookingRejectedEmail`)

**Location**: `/api/bookings/reject`

**Parameters Include**:

```typescript
{
  paymentFlow?: "TOKENIZED" | "DIRECT"
  refundAmount?: string // For DIRECT flow
}
```

**Template Behavior** (`BookingRejectedEmail.tsx`):

#### TOKENIZED Flow (Card pre-auth)

```tsx
{
  paymentFlow === "TOKENIZED" && (
    <Section style={infoBox}>
      <Text>
        💳 Good news: Your card was only authorized, not charged. The
        authorization has been released and you will not see any charge on your
        statement.
      </Text>
    </Section>
  );
}
```

#### DIRECT Flow (FPX/E-wallet - refund needed)

```tsx
{
  paymentFlow === "DIRECT" && refundAmount && (
    <Section style={infoBox}>
      <Text>
        💰 Refund initiated: We've started processing your refund of{" "}
        {refundAmount}. The funds should appear in your account within 3-5
        business days.
      </Text>
    </Section>
  );
}
```

**✅ YES - Refund status IS clearly communicated to anglers**

### 4. **Booking Confirmed Email** (`sendBookingConfirmedAnglerEmail` + `sendBookingConfirmedCaptainEmail`)

**Location**: `/api/bookings/acknowledge`, `/api/bookings/pay`

**Flow-Specific Usage**:

- **MANUAL Flow**: Sent after payment (`/api/bookings/pay`)
- **AUTO Flow**: Sent after captain acknowledgment (`/api/bookings/acknowledge`)

**No flow-specific content** (both flows reach same "confirmed" state)

---

## Notification Service Differences

### 1. **Booking Created Notification**

**MANUAL Flow**:

- ❌ No angler notification (uses webhook to notify captain)
- ✅ Captain receives `BOOKING_RECEIVED` notification via webhook

**AUTO Flow**:

- ❌ No angler notification (payment already secured)
- ✅ Captain receives `BOOKING_RECEIVED` notification via webhook

**Note**: Both flows use webhook for captain notification, no direct notification creation in create routes

### 2. **Booking Approved Notification**

**MANUAL Flow Only** (`/api/bookings/approve`):

```typescript
await createNotification({
  userId: recipientUserId,
  type: "BOOKING_APPROVED",
  title: "Booking Approved! 🎉",
  message: `${trip.charter.name} approved your booking for ${date}. 
           Complete your payment within 48 hours to confirm your spot!`,
  actionUrl: `/book/payment/${bookingId}`,
  actionLabel: "Complete Payment",
});
```

**AUTO Flow**: N/A (skips approval step)

### 3. **Booking Rejected Notification**

**Location**: `/api/bookings/reject`

**Flow-Aware Message**:

```typescript
let notificationMessage = `Unfortunately, ${charterName} couldn't accommodate your booking request.`;

if (needsRefundProcessing) {
  // DIRECT flow: Mention refund
  notificationMessage +=
    " Your payment will be refunded within 3-5 business days.";
} else if (paymentReleasedAt) {
  // TOKENIZED flow: No charge
  notificationMessage += " Your card was not charged.";
}

if (rejectionReason) {
  notificationMessage += ` Reason: ${rejectionReason}`;
}
```

**✅ YES - Notification includes refund information based on payment flow**

### 4. **Booking Confirmed Notification**

**AUTO Flow** (`/api/bookings/acknowledge`):

```typescript
await createNotification({
  userId: recipientUserId,
  type: "BOOKING_CONFIRMED",
  title: "Booking Confirmed! 🎉",
  message: `Your booking for ${charterName} on ${date} has been confirmed by the captain!`,
  actionUrl: `/account/bookings/${bookingId}`,
  actionLabel: "View Booking",
});
```

**MANUAL Flow** (`/api/bookings/pay`):

```typescript
await createNotification({
  userId: recipientUserId,
  type: "BOOKING_PAID",
  title: "Payment Received! 💰",
  message: `Your payment has been received. Your booking for ${charterName} is now confirmed!`,
  actionUrl: `/account/bookings/${bookingId}`,
  actionLabel: "View Details",
});
```

**Difference**: Different notification types (`BOOKING_CONFIRMED` vs `BOOKING_PAID`) and slightly different messaging

---

## Acknowledge API (`/api/bookings/acknowledge`)

### Purpose

**AUTO Flow Only**: Transition `PAYMENT_AUTHORIZED` → `PAID` when captain acknowledges payment

### Key Features

1. **Flow Validation**:

```typescript
if (booking.bookingFlowType !== "AUTO") {
  return NextResponse.json(
    {
      error:
        "Only auto flow bookings can be acknowledged. Manual flow bookings need approval first.",
    },
    { status: 409 }
  );
}
```

2. **Status Validation**:

```typescript
if (booking.status !== "PAYMENT_AUTHORIZED") {
  return NextResponse.json(
    {
      error: "Only payment_authorized bookings can be acknowledged",
    },
    { status: 409 }
  );
}
```

3. **Deadline Check**:

```typescript
if (
  booking.acknowledgmentDeadline &&
  booking.acknowledgmentDeadline < new Date()
) {
  return NextResponse.json(
    {
      error: "Acknowledgment deadline expired. Booking may be cancelled.",
    },
    { status: 409 }
  );
}
```

4. **Actions After Acknowledgment**:
   - ✅ Update status to `PAID`
   - ✅ Set `captainDecisionAt`
   - ✅ Unlock conversation (so captain can message angler)
   - ✅ Send notification to angler (`BOOKING_CONFIRMED`)
   - ✅ Send confirmation emails to both angler and captain
   - ✅ Send webhook to captain app (`booking.acknowledged`)

### Webhook Payload

```typescript
{
  type: "booking.acknowledged",
  booking: {
    id: bookingId,
    tripId: tripId,
    charterId: charterId,
    status: "PAID",
    bookingFlowType: "AUTO"
  }
}
```

---

## Captain Webhook Handler

**Location**: `fishon-captain/src/app/api/webhooks/booking/route.ts`

### Supported Events

| Event                     | Flow   | Captain Notification Type |
| ------------------------- | ------ | ------------------------- |
| `booking.created`         | Both   | `BOOKING_RECEIVED`        |
| `booking.payment_pending` | Both   | `PAYMENT_PENDING`         |
| `booking.acknowledged`    | AUTO   | `BOOKING_CONFIRMED`       |
| `booking.paid`            | MANUAL | `BOOKING_PAID`            |
| `booking.cancelled`       | Both   | `BOOKING_CANCELLED`       |
| `booking.confirmed`       | Both   | `BOOKING_CONFIRMED`       |

### Auto Flow Specific Handler

```typescript
case "booking.acknowledged":
  await createNotification({
    type: "BOOKING_CONFIRMED",
    userId: captainUserId,
    title: "Booking Confirmed! ✅",
    message: `Booking with ${anglerName} for ${charterName} on ${date} has been confirmed. Payment secured!`,
    actionUrl: `/captain/bookings/${bookingId}`,
    actionLabel: "View Details"
  });
  break;
```

---

## Refund Communication Summary

### ✅ Anglers ARE informed about refund status in multiple ways

#### 1. **In-App Notification** (Real-time)

```typescript
// DIRECT flow rejection
notificationMessage +=
  " Your payment will be refunded within 3-5 business days.";

// TOKENIZED flow rejection
notificationMessage += " Your card was not charged.";
```

#### 2. **Email** (Persistent record)

**TOKENIZED Flow**:

- Green info box: "💳 Good news: Your card was only authorized, not charged. The authorization has been released..."

**DIRECT Flow**:

- Green info box: "💰 Refund initiated: We've started processing your refund of RM XXX. The funds should appear in your account within 3-5 business days."

#### 3. **Notification Metadata** (For future reference)

```typescript
metadata: {
  paymentFlow: "TOKENIZED" | "DIRECT",
  refundInitiated: boolean,
  charterName: string,
  reason: string
}
```

---

## API Endpoint Flow Summary

| Endpoint                    | Manual Flow                   | Auto Flow                     | Email                | Notification          |
| --------------------------- | ----------------------------- | ----------------------------- | -------------------- | --------------------- |
| `/api/bookings/create`      | ✅ Creates PENDING            | ✅ Creates PAYMENT_AUTHORIZED | ✅ Both (flow-aware) | ❌ (uses webhook)     |
| `/api/bookings/approve`     | ✅ PENDING → AWAITING_PAYMENT | ❌ N/A                        | ✅ Approval email    | ✅ BOOKING_APPROVED   |
| `/api/bookings/acknowledge` | ❌ N/A                        | ✅ PAYMENT_AUTHORIZED → PAID  | ✅ Confirmation      | ✅ BOOKING_CONFIRMED  |
| `/api/bookings/pay`         | ✅ AWAITING_PAYMENT → PAID    | ❌ N/A                        | ✅ Confirmation      | ✅ BOOKING_PAID       |
| `/api/bookings/reject`      | ✅ Any → REJECTED             | ✅ Any → REJECTED             | ✅ Both (flow-aware) | ✅ Flow-aware message |

---

## Key Findings

### ✅ Strengths

1. **Flow Differentiation**: Email and notification content is properly differentiated between MANUAL and AUTO flows
2. **Refund Transparency**: Clear communication about refunds (DIRECT) vs no-charge (TOKENIZED)
3. **API Validation**: Proper flow-type validation prevents cross-flow operations
4. **Acknowledge API**: Well-implemented for AUTO flow with proper validations
5. **Webhook Integration**: Captain app receives appropriate notifications for both flows
6. **Payment Flow Awareness**: Templates correctly display different messages based on payment method

### ⚠️ Considerations

1. **Notification Type Consistency**:
   - AUTO uses `BOOKING_CONFIRMED` after acknowledgment
   - MANUAL uses `BOOKING_PAID` after payment
   - Consider if both should use same type for consistency

2. **Webhook Event Names**:
   - `booking.acknowledged` is AUTO-specific
   - `booking.paid` is MANUAL-specific
   - Both converge to `PAID` status but use different events

3. **Email Template Reuse**:
   - Same confirmation email templates used for both flows
   - Could add subtle flow-specific messaging if needed

---

## Schema Status

### ✅ **Database Fields Confirmed**

- ✅ **Verified**: `note` and `rejectionReason` fields exist in production schema
- **Location**: `fishon-market/prisma/schema.prisma` (lines 359-360)
- **Fields**:
  ```prisma
  note            String? // Angler's initial note
  rejectionReason String? // Captain's rejection reason
  ```
- **Status**: Ready for use in production (no migration needed)

---

## Conclusion

**Email and notification services are well-configured for both MANUAL and AUTO booking flows**, with proper differentiation and payment-flow-aware messaging. The system correctly communicates refund status to anglers through multiple channels (notification + email). The new acknowledge API is properly implemented for AUTO flow with comprehensive validation.

---

## Migration to New Documentation

This analysis document has been superseded by comprehensive documentation:

### **📚 Primary Reference**: `EMAIL_NOTIFICATION_SYSTEM.md`

**What's in the new doc**:

- ✅ Complete email template catalog with code examples
- ✅ Flow diagrams for both MANUAL and AUTO flows
- ✅ API endpoint integration guide with validation examples
- ✅ Configuration instructions (environment variables, user preferences)
- ✅ Testing procedures (email, notifications, webhooks)
- ✅ Troubleshooting guide with common issues and solutions
- ✅ Quick reference sections for developers

**Old Documentation**: Moved to `docs/archive/email-notification-old/`

### Testing Checklist

Refer to `EMAIL_NOTIFICATION_SYSTEM.md` section "Testing" for:

- [ ] MANUAL flow end-to-end testing
- [ ] AUTO flow end-to-end testing
- [ ] Payment flow variations (TOKENIZED vs DIRECT)
- [ ] Webhook delivery verification
- [ ] Email template preview and testing

**Next Steps**: Refer to `EMAIL_NOTIFICATION_SYSTEM.md` for complete implementation guide, testing procedures, and troubleshooting.

---

## Migration to New Documentation

This analysis document has been superseded by comprehensive documentation:

**Primary Reference**: `EMAIL_NOTIFICATION_SYSTEM.md`

**What's in the new doc**:

- ✅ Complete email template catalog with code examples
- ✅ Flow diagrams for both MANUAL and AUTO flows
- ✅ API endpoint integration guide
- ✅ Configuration instructions (environment variables, user preferences)
- ✅ Testing procedures (email, notifications, webhooks)
- ✅ Troubleshooting guide with solutions
- ✅ Quick reference sections

**Old Documentation**: Moved to `docs/archive/email-notification-old/`
