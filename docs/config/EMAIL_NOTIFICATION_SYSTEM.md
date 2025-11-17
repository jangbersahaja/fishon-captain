# Email & Notification System - Complete Guide

**Last Updated**: November 17, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-market & fishon-captain

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Booking Flow: Manual vs Auto](#booking-flow-manual-vs-auto)
4. [Email Templates](#email-templates)
5. [Notification Types](#notification-types)
6. [API Integration](#api-integration)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

The Fishon platform uses a **dual-channel communication system** combining email and real-time notifications to keep anglers and captains informed throughout the booking lifecycle.

### Key Features

- ✅ **Flow-aware messaging**: Different content for MANUAL vs AUTO booking flows
- ✅ **Payment-aware**: Differentiates TOKENIZED (card) vs DIRECT (FPX/e-wallet) payments
- ✅ **Refund transparency**: Clear communication about refunds and charges
- ✅ **Real-time notifications**: Pusher-based instant delivery
- ✅ **User preferences**: Granular control over notification channels
- ✅ **Cross-app webhooks**: fishon-market → fishon-captain integration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Communication Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ @fishon/email │         │    Pusher    │                  │
│  │   Package    │         │   Real-time  │                  │
│  │ (Templates)  │         │  Websockets  │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                          │
│         ▼                        ▼                          │
│  ┌─────────────┐          ┌─────────────┐                   │
│  │Email Service│          │Notification  │                   │
│  │   Wrapper   │          │  Service    │                   │
│  └──────┬──────┘          └──────┬──────┘                   │
│         │                        │                          │
│         └────────┬───────────────┘                          │
│                  ▼                                          │
│         ┌────────────────┐                                  │
│         │  API Endpoints │                                  │
│         │  (Bookings)    │                                  │
│         └────────┬───────┘                                  │
│                  │                                          │
│                  ▼                                          │
│         ┌────────────────┐                                  │
│         │    Webhooks    │                                  │
│         │  (Cross-app)   │                                  │
│         └────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **@fishon/email Package**

- **Repository**: `github.com/jangbersahaja/fishon-email`
- **Technology**: React Email
- **Purpose**: Shared email templates for both apps
- **Templates**: 15+ production-ready templates

#### 2. **Email Service Wrappers**

- **fishon-market**: `src/lib/services/email-service.ts`
- **fishon-captain**: `src/lib/services/email-service.ts`
- **Purpose**: App-specific email sending logic
- **Transport**: Nodemailer + Zoho SMTP

#### 3. **Notification Service**

- **fishon-market**: `src/lib/services/notification-service.ts`
- **fishon-captain**: `src/lib/services/notification-service.ts`
- **Purpose**: In-app notification management
- **Storage**: PostgreSQL (Notification model)

- **Delivery**: Pusher (real-time)

#### 4. **Webhook System**

- **Sender**: fishon-market (`/lib/webhooks/webhook.ts`)
- **Receiver**: fishon-captain (`/api/webhooks/booking/route.ts`)
- **Purpose**: Cross-app booking event propagation
- **Security**: `x-captain-secret` header validation

---

## Booking Flow: Manual vs Auto

### Flow Comparison

| Aspect               | MANUAL Flow                       | AUTO Flow                              |
| -------------------- | --------------------------------- | -------------------------------------- |
| **User Experience**  | Request → Wait for approval → Pay | Pay upfront → Captain acknowledges     |
| **Initial Status**   | `PENDING`                         | `PAYMENT_AUTHORIZED`                   |
| **Payment Timing**   | After captain approval            | Before captain review                  |
| **Approval Step**    | ✅ Required                       | ❌ Skipped                             |
| **Acknowledge Step** | ❌ N/A                            | ✅ Required                            |
| **Risk**             | Lower (captain decides first)     | Higher (captain must refund if reject) |

### Flow Diagrams

#### MANUAL Flow

```
┌─────────────┐
│   Angler    │
│  Creates    │
│  Booking    │
└──────┬──────┘
       │ Status: PENDING
       │ Email: "Booking request sent"
       │ Notif: None (webhook to captain)
       ▼
┌─────────────┐
│   Captain   │
│  Reviews    │
│  Request    │
└──────┬──────┘
       │
       ├──── APPROVE ────┐
       │                 │ Status: AWAITING_PAYMENT
       │                 │ Email: "Booking approved - pay in 48h"
       │                 │ Notif: BOOKING_APPROVED
       │                 ▼
       │         ┌─────────────┐
       │         │   Angler    │
       │         │    Pays     │
       │         └──────┬──────┘
       │                │ Status: PAID
       │                │ Email: "Payment confirmed"
       │                │ Notif: BOOKING_PAID
       │                ▼
       │         [CONFIRMED]
       │
       └──── REJECT ────┐
                        │ Status: REJECTED
                        │ Email: "Booking rejected" (flow-aware)
                        │ Notif: BOOKING_REJECTED (flow-aware)
                        ▼
                  [CANCELLED]
```

#### AUTO Flow

```
┌─────────────┐
│   Angler    │
│  Creates    │
│  Booking    │
│  + Pays     │
└──────┬──────┘
       │ Status: PAYMENT_AUTHORIZED
       │ Email: "Payment secured - awaiting captain"
       │ Notif: None (webhook to captain)
       ▼
┌─────────────┐
│   Captain   │
│  Reviews    │
│  Payment    │
└──────┬──────┘
       │
       ├──── ACKNOWLEDGE ─┐
       │                  │ Status: PAID
       │                  │ Email: "Booking confirmed"
       │                  │ Notif: BOOKING_CONFIRMED
       │                  ▼
       │           [CONFIRMED]
       │
       └──── REJECT ─────┐
                         │ Status: REJECTED
                         │ Email: "Rejected + refund info"
                         │ Notif: BOOKING_REJECTED + refund info
                         ▼
                   [REFUNDED]
```

---

## Email Templates

### Booking Lifecycle Templates

#### 1. **Booking Created** (`booking-created.tsx`)

**Recipients**: Angler (primary), Captain (via separate email)

**Flow Awareness**: ✅ Yes

**Content Variants**:

```tsx
// MANUAL Flow (no payment yet)
<Text>
  Thank you for choosing Fishon! We've received your booking request
  and the captain will review it shortly.
</Text>

// AUTO Flow - TOKENIZED (Card)
<InfoBox>
  💳 Your card has been authorized (not charged yet).
  We'll only charge your card if the captain approves your booking.
</InfoBox>

// AUTO Flow - DIRECT (FPX/E-wallet)
<InfoBox>
  ✅ Payment received! Your payment of {totalPrice} has been received
  and is being held securely. It will be released to the captain
  once they approve your booking.

</InfoBox>
```

**Triggers**:

- `/api/bookings/create` (authenticated)
- `/api/bookings/create-guest` (guest)
- `/api/bookings/create-manual` (staff)

**Database Fields Used**:

- `note` - Angler's initial message to captain
- `bookingFlowType` - Determines content variant
- `paymentFlow` - TOKENIZED vs DIRECT messaging

---

#### 2. **Booking Approved** (`booking-approved.tsx`)

**Recipients**: Angler

**Flow**: MANUAL ONLY

**Content**:

```tsx
<Text>
  Great news! {charterName} has approved your booking for {tripDate}.
</Text>
<Text>
  ⏰ Complete your payment within 48 hours to confirm your spot.

</Text>
<Button href={paymentUrl}>
  Complete Payment
</Button>
```

**Triggers**:

- `/api/bookings/approve` (MANUAL flow only)

**Database Fields Used**: None specific

---

#### 3. **Booking Rejected** (`booking-rejected.tsx`)

**Recipients**: Angler

**Flow Awareness**: ✅ Yes

**Content Variants**:

```tsx
<Text>
  We're sorry, but your booking request for {charterName}
  could not be accommodated at this time.
</Text>;

{
  reason && <ReasonBox>Reason from Captain: {reason}</ReasonBox>;
}

// TOKENIZED Flow (Card) - No charge occurred
{
  paymentFlow === "TOKENIZED" && (
    <InfoBox>
      💳 Good news: Your card was only authorized, not charged. The
      authorization has been released and you will not see any charge on your
      statement.
    </InfoBox>
  );
}

// DIRECT Flow (FPX/E-wallet) - Refund initiated
{
  paymentFlow === "DIRECT" && refundAmount && (
    <InfoBox>
      💰 Refund initiated: We've started processing your refund of{" "}
      {refundAmount}. The funds should appear in your account within 3-5
      business days.
    </InfoBox>
  );
}
```

**Triggers**:

- `/api/bookings/reject`

**Database Fields Used**:

- `rejectionReason` - Captain's explanation for rejection
- `paymentFlow` - Determines refund vs no-charge messaging
- `refundAmount` - Amount being refunded (DIRECT flow)

---

#### 4. **Booking Confirmed - Angler** (`booking-confirmed-angler.tsx`)

**Recipients**: Angler

**Flow**: Both MANUAL and AUTO (different trigger points)

**Content**:

```tsx
<Text>
  Your booking for {charterName} is confirmed!
</Text>
<BookingDetails>
  Trip: {tripName}
  Date: {tripDate}

  Duration: {durationHours} hours
  Total: {finalPrice}
</BookingDetails>
<CaptainContact>
  Captain: {captainName}
  Email: {captainEmail}
  Phone: {captainPhone}
</CaptainContact>
```

**Triggers**:

- `/api/bookings/pay` (MANUAL flow - after payment)
- `/api/bookings/acknowledge` (AUTO flow - after captain acknowledgment)

**Database Fields Used**: None specific (pulls from relations)

---

#### 5. **Booking Confirmed - Captain** (`booking-confirmed-captain.tsx`)

**Recipients**: Captain

**Flow**: Both MANUAL and AUTO

**Content**:

```tsx
<Text>
  Good news! Your booking with {anglerName} is confirmed.
</Text>

<BookingDetails>
  Trip: {tripName}
  Date: {tripDate}
  Total: {finalPrice}
</BookingDetails>
<AnglerContact>
  Angler: {anglerName}
  Email: {anglerEmail}
  Phone: {anglerPhone}
</AnglerContact>
```

**Triggers**:

- `/api/bookings/pay` (MANUAL flow)
- `/api/bookings/acknowledge` (AUTO flow)

**Database Fields Used**: None specific

---

#### 6. **Booking Received - Captain** (`booking-received-captain.tsx`)

**Recipients**: Captain

**Flow**: Both MANUAL and AUTO

**Content**:

```tsx
<Text>
  You have a new booking request!

</Text>
<BookingDetails>
  Angler: {anglerName}
  Charter: {charterName}
  Trip: {tripName}
  Date: {tripDate}
  Duration: {durationHours} hours
  Total: {totalPrice}
</BookingDetails>
<Button href={bookingUrl}>
  Review Request
</Button>
```

**Triggers**:

- `/api/bookings/create` → webhook → captain email service
- `/api/payment/callback` (DIRECT flow completion)

**Database Fields Used**: None specific

---

### Additional Templates

| Template                       | Recipient | Purpose                      |
| ------------------------------ | --------- | ---------------------------- |
| `booking-cancelled.tsx`        | Captain   | Angler cancelled booking     |
| `booking-payment-reminder.tsx` | Angler    | Payment deadline approaching |
| `charter-registration.tsx`     | Captain   | Charter onboarding complete  |
| `captain-registration.tsx`     | Captain   | Account created              |
| `verification-code.tsx`        | Both      | Email verification           |
| `password-changed.tsx`         | Both      | Security alert               |
| `welcome.tsx`                  | Both      | First login                  |

---

## Notification Types

### fishon-market (Angler Notifications)

```typescript
enum NotificationType {
  // Booking lifecycle
  BOOKING_CREATED       // Legacy - old flow
  PAYMENT_AUTHORIZED    // NEW: Payment pre-authorized (AUTO flow)
  BOOKING_APPROVED      // Captain approved (MANUAL flow)
  PAYMENT_CAPTURED      // NEW: Payment captured (AUTO flow)
  BOOKING_CONFIRMED     // Booking confirmed (DIRECT flow)
  BOOKING_REJECTED      // Captain rejected
  PAYMENT_RELEASED      // NEW: Pre-auth released (TOKENIZED)
  BOOKING_PAID          // Payment confirmed (legacy)
  BOOKING_CANCELLED     // Booking cancelled
  PAYMENT_REFUNDED      // NEW: Refund processed

  // Review system
  REVIEW_SUBMITTED      // Review submitted for approval
  REVIEW_APPROVED       // Review approved and published
  REVIEW_REJECTED       // Review rejected by moderator

  // Account events
  ACCOUNT_VERIFIED      // Email verified
  PAYMENT_FAILED        // Payment processing failed

  // System
  SYSTEM_ANNOUNCEMENT   // Platform updates
}
```

### fishon-captain (Captain Notifications)

```typescript
enum NotificationType {
  BOOKING_RECEIVED      // New booking request
  PAYMENT_PENDING       // Payment received, needs acknowledgment
  BOOKING_APPROVED      // Captain approved booking
  BOOKING_PAID          // Payment confirmed
  BOOKING_CANCELLED     // Angler cancelled
  BOOKING_CONFIRMED     // Booking fully confirmed
  CHARTER_PUBLISHED     // Charter went live
  CHARTER_SUSPENDED     // Charter suspended by admin
  SYSTEM_ANNOUNCEMENT   // Platform updates
}
```

### Notification Content - Flow Aware

#### BOOKING_REJECTED (fishon-market)

```typescript
// Flow-aware message construction
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

await createNotification({
  userId: recipientUserId,
  type: "BOOKING_REJECTED",
  title: "Booking Update",
  message: notificationMessage,
  actionUrl: `/search`,
  actionLabel: "Find Other Charters",
  bookingId: bookingId,
  charterId: charterId,
  metadata: {
    charterName: charterName,
    reason: rejectionReason,
    paymentFlow: paymentFlow,
    refundInitiated: needsRefundProcessing,
  },
});
```

---

## API Integration

### fishon-market Booking APIs

#### Flow Decision Matrix

```typescript
// Determines MANUAL vs AUTO based on charter configuration
const bookingFlowType = await charterService.getCharterFlowType(charterId);
const isManualFlow = bookingFlowType === "MANUAL";

// Set appropriate status and deadlines
const initialStatus = isManualFlow ? "PENDING" : "PAYMENT_AUTHORIZED";

const approvalDeadline = isManualFlow ? computeApprovalDeadline() : null;
const acknowledgmentDeadline = !isManualFlow ? computeAckDeadline() : null;
```

#### Endpoint: `/api/bookings/create`

**Purpose**: Create authenticated angler booking

**Email Sent**:

1. ✅ `sendBookingCreatedEmail` → Angler (flow-aware)
2. ✅ `sendBookingReceivedCaptainEmail` → Captain (via webhook)

**Notification Created**:

- ❌ None (uses webhook to captain app)

**Webhook Sent**:

```typescript
{
  type: "booking.created",
  booking: {
    id: bookingId,
    tripId: tripId,
    charterId: charterId,
    status: status, // PENDING or PAYMENT_AUTHORIZED
    date: date,
    anglerName: anglerName,
    charterName: charterName,
    bookingFlowType: bookingFlowType // MANUAL or AUTO

  }
}
```

**Database Fields Set**:

- `note` - Angler's initial message to captain
- `bookingFlowType` - MANUAL or AUTO
- `paymentFlow` - TOKENIZED or DIRECT
- `paymentMethod` - CARD, FPX, EWALLET, MOCK

---

#### Endpoint: `/api/bookings/approve`

**Purpose**: Captain approves MANUAL flow booking

**Flow**: MANUAL ONLY

**Validation**:

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

**Transition**: `PENDING` → `AWAITING_PAYMENT`

**Email Sent**:

1. ✅ `sendBookingApprovedEmail` → Angler (with payment link + 48h deadline)

**Notification Created**:

1. ✅ `BOOKING_APPROVED` → Angler

**Webhook Sent**:

```typescript
{
  type: "booking.approved",
  booking: { ...details, status: "AWAITING_PAYMENT" }
}
```

---

#### Endpoint: `/api/bookings/acknowledge`

**Purpose**: Captain acknowledges AUTO flow payment

**Flow**: AUTO ONLY

**Validation**:

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

if (booking.status !== "PAYMENT_AUTHORIZED") {
  return NextResponse.json(
    {
      error: "Only payment_authorized bookings can be acknowledged",
    },
    { status: 409 }
  );
}
```

**Transition**: `PAYMENT_AUTHORIZED` → `PAID`

**Email Sent**:

1. ✅ `sendBookingConfirmedAnglerEmail` → Angler
2. ✅ `sendBookingConfirmedCaptainEmail` → Captain

**Notification Created**:

1. ✅ `BOOKING_CONFIRMED` → Angler

**Side Effects**:

- Unlocks conversation (captain can now message angler)

**Webhook Sent**:

```typescript
{
  type: "booking.acknowledged",
  booking: { ...details, status: "PAID" }
}
```

---

#### Endpoint: `/api/bookings/reject`

**Purpose**: Captain rejects booking (both flows)

**Flow**: Both MANUAL and AUTO

**Rejectable Statuses**: `PENDING`, `PAYMENT_AUTHORIZED`, `PAID` (DIRECT awaiting decision)

**Payment Handling**:

```typescript
// TOKENIZED flow (Card): Release token (no charge)
if (paymentFlow === "TOKENIZED" || paymentFlow === "MOCK") {
  await releasePayment(paymentIntentId);
  paymentReleasedAt = new Date();
}

// DIRECT flow (FPX/E-wallet): Must refund (already paid)
else if (paymentFlow === "DIRECT") {
  await initiateRefund({
    bookingId: id,
    reason: "CAPTAIN_REJECTION",
    refundType: "FULL",
    initiatedBy: "CAPTAIN",
  });
  needsRefundProcessing = true;
}
```

**Email Sent**:

1. ✅ `sendBookingRejectedEmail` → Angler (flow-aware with refund info)

**Notification Created**:

1. ✅ `BOOKING_REJECTED` → Angler (flow-aware message)

**Database Fields Updated**:

- `status` → `REJECTED`
- `rejectionReason` - Captain's explanation
- `refundAmount` - If DIRECT flow

- `refundStatus` - If DIRECT flow

**Webhook Sent**:

```typescript
{
  type: "booking.rejected",
  booking: {
    ...details,
    status: "REJECTED",
    rejectionReason: reason,
    paymentMethod: paymentMethod,
    paymentFlow: paymentFlow,
    refundInitiated: needsRefundProcessing
  }
}
```

---

#### Endpoint: `/api/bookings/pay`

**Purpose**: Angler completes payment (MANUAL flow)

**Flow**: MANUAL ONLY

**Transition**: `AWAITING_PAYMENT` → `PAID`

**Email Sent**:

1. ✅ `sendBookingConfirmedAnglerEmail` → Angler
2. ✅ `sendBookingConfirmedCaptainEmail` → Captain

**Notification Created**:

1. ✅ `BOOKING_PAID` → Angler

**Side Effects**:

- Unlocks conversation

---

### fishon-captain Webhook Handler

**Endpoint**: `/api/webhooks/booking/route.ts`

**Security**: Validates `x-captain-secret` header

**Supported Events**:

| Event                  | Source Status                 | Captain Notification | Captain Email   |
| ---------------------- | ----------------------------- | -------------------- | --------------- |
| `booking.created`      | PENDING or PAYMENT_AUTHORIZED | `BOOKING_RECEIVED`   | ✅ (via market) |
| `booking.approved`     | AWAITING_PAYMENT              | None                 | ❌              |
| `booking.acknowledged` | PAID                          | `BOOKING_CONFIRMED`  | ❌              |
| `booking.paid`         | PAID                          | `BOOKING_PAID`       | ❌              |
| `booking.rejected`     | REJECTED                      | None                 | ❌              |
| `booking.cancelled`    | CANCELLED                     | `BOOKING_CANCELLED`  | ❌              |

**Side Effects**:

- Revalidates captain dashboard pages
- Creates notification in captain database

---

## Configuration

### Environment Variables

#### fishon-market

```bash
# Email Configuration (Zoho SMTP)
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="465"
SMTP_USER="your-email@fishon.my"
SMTP_PASSWORD="your-smtp-password"
SMTP_SECURE="true"

# Pusher Configuration (Real-time notifications)
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="ap1"

# Webhook Configuration (Captain app integration)
CAPTAIN_WEBHOOK_URL="https://captain.fishon.my/api/webhooks/booking"
CAPTAIN_API_SECRET="your-shared-secret"

# App URLs (for email links)
NEXT_PUBLIC_APP_URL="https://fishon.my"
FISHON_CAPTAIN_API_URL="https://captain.fishon.my"
```

#### fishon-captain

```bash
# Email Configuration (Zoho SMTP)
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="465"
SMTP_USER="your-email@fishon.my"
SMTP_PASSWORD="your-smtp-password"
SMTP_SECURE="true"

# Pusher Configuration
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="ap1"

# Webhook Security
CAPTAIN_API_SECRET="your-shared-secret"

# Database Access
MARKET_DATABASE_URL="postgresql://user:pass@host/fishon-market"

# App URLs
NEXT_PUBLIC_APP_URL="https://captain.fishon.my"
```

### User Preferences

#### fishon-market (Granular Control)

```typescript
// NotificationPreferences model
{
  // Email preferences (per event type)
  emailBookingCreated: boolean;
  emailBookingApproved: boolean;
  emailBookingRejected: boolean;
  emailBookingPaid: boolean;
  emailBookingCancelled: boolean;
  emailReviewSubmitted: boolean;
  emailReviewApproved: boolean;
  emailReviewRejected: boolean;
  emailAccountVerified: boolean;
  emailPaymentFailed: boolean;
  emailSystemAnnouncement: boolean;

  // Push/in-app preferences (per event type)
  pushBookingCreated: boolean;
  pushBookingApproved: boolean;
  pushBookingRejected: boolean;
  pushBookingPaid: boolean;
  pushBookingCancelled: boolean;
  pushReviewSubmitted: boolean;
  pushReviewApproved: boolean;
  pushReviewRejected: boolean;
  pushAccountVerified: boolean;
  pushPaymentFailed: boolean;
  pushSystemAnnouncement: boolean;
}
```

#### fishon-captain (Basic Control)

```typescript
// NotificationPreferences model
{
  inAppEnabled: boolean; // All in-app notifications
  emailEnabled: boolean; // All email notifications
  bookingUpdates: boolean; // Booking-related events
  charterUpdates: boolean; // Charter-related events
  systemUpdates: boolean; // Platform announcements
}
```

### Database Schema

#### Booking Model Fields (fishon-market)

**Communication-Related Fields**:

```prisma
model Booking {
  // ... other fields ...

  // === CONVERSATION ===
  note            String? // ✅ Angler's initial note to captain
  captainResponse String? // ✅ Captain's response/instructions
  rejectionReason String? // ✅ Captain's rejection explanation
  chatId          String? // Future: Link to chat conversation

  // Relations
  notifications   Notification[]
  conversation    Conversation?
}
```

**✅ Confirmed**: `note` and `rejectionReason` fields exist in production schema (lines 359-360)

---

## Testing

### Email Testing

#### 1. **Development Environment**

Use email testing service (Mailtrap, MailHog, etc.):

```bash
# .env.local
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_U<https://dashboard.pusher.com>
SMTP_PASSWORD="your-mailtrap-password"
SMTP_SECURE="false"

```

#### 2. **Preview Templates**

```bash
cd fishon-email
npm run dev
# Open http://localhost:3000 to preview all templates
```

#### 3. **Test Email Sending**

```typescript
// Test script
import { sendBookingCreatedEmail } from "@/lib/services/email-service";

await sendBookingCreatedEmail({
  to: "test@example.com",
  userName: "Test User",
  charterName: "Test Charter",
  tripName: "Test Trip",
  tripDate: "2025-12-01",
  tripDays: 1,
  durationHours: 4,
  totalPrice: "RM 500",
  confirmationUrl: "https://fishon.my/bookings/test",
  paymentFlow: "TOKENIZED",
});
```

### Notification Testing

#### 1. **Pusher Debug Console**

Visit <https://dashboard.pusher.com> → Your App → Debug Console

Monitor real-time events:

- Channel subscriptions
- Message delivery
- Connection status

#### 2. **Test Notification Creation**

```typescript
import { createNotification } from "@/lib/services/notification-service";

await createNotification({
  userId: "test-user-id",
  type: "BOOKING_APPROVED",
  title: "Test Notification",
  message: "This is a test message",
  actionUrl: "/test",
  actionLabel: "View Test",
});
```

#### 3. **Check Notification Preferences**

```typescript
import { getUserPreferences } from "@/lib/services/notification-service";

const prefs = await getUserPreferences("test-user-id");
console.log(prefs);
```

### Webhook Testing

#### 1. **Local Testing with ngrok**

```bash
# Terminal 1: Start fishon-captain
npm run dev

# Terminal 2: Expose local server
ngrok http 3000

# Update fishon-market .env.local
CAPTAIN_WEBHOOK_URL="https://your-ngrok-url.ngrok.io/api/webhooks/booking"
```

#### 2. **Manual Webhook Trigger**

```bash
curl -X POST https://captain.fishon.my/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -H "x-captain-secret: your-secret" \
  -d '{
    "type": "booking.created",
    "booking": {
      "id": "test-123",
      "tripId": "trip-456",
      "charterId": "charter-789",
      "status": "PENDING",
      "date": "2025-12-01",
      "anglerName": "Test Angler",
      "charterName": "Test Charter"
    }
  }'
```

#### 3. **Check Webhook Logs**

```typescript
// fishon-captain webhook handler logs
console.log("🔔 [WEBHOOK] Received request");

console.log("🔑 [WEBHOOK] Checking secret...");
console.log("📨 Webhook received:", type, "for booking", bookingId);
console.log("✅ Notification sent to captain", captainUserId);
```

### Flow Testing Checklist

#### MANUAL Flow

- [ ] Create booking → Verify angler email (no payment info)
- [ ] Check captain receives webhook → Notification created
- [ ] Captain approves → Verify angler email + notification (payment link)
- [ ] Captain rejects → Verify "not charged" message (TOKENIZED) or refund info (DIRECT)
- [ ] Angler pays → Verify confirmation emails to both parties

#### AUTO Flow

- [ ] Create booking with payment → Verify angler email (payment secured message)
- [ ] Check captain receives webhook → Notification created

- [ ] Captain acknowledges → Verify confirmation emails to both parties
- [ ] Captain rejects TOKENIZED → Verify "authorization released" message
- [ ] Captain rejects DIRECT → Verify refund initiation message

---

## Troubleshooting

### Email Issues

#### Problem: Emails not sending

**Check**:

1. SMTP credentials in environment variables
2. Email service logs: `console.log("[email-service]")`
3. Zoho SMTP status
4. Firewall/network blocking port 465

**Solution**:

```bash
# Test SMTP connection
telnet smtppro.zoho.com 465

# Check logs
grep "email-service" logs/app.log

# Verify environment
echo $SMTP_HOST $SMTP_USER
```

#### Problem: Wrong email template

**Check**:

1. `bookingFlowType` value in database
2. `paymentFlow` value in database
3. Template conditional logic

**Solution**:

```sql
-- Check booking flow configuration
SELECT id, bookingFlowType, paymentFlow, status
FROM "Booking"
WHERE id = 'your-booking-id';
```

### Notification Issues

#### Problem: Notifications not appearing

**Check**:

1. Pusher connection status (browser console)
2. User preferences (notifications enabled?)
3. Channel subscription (correct userId?)

4. Database notification record created?

**Solution**:

```typescript
// Check Pusher connection

window.Pusher.log = (msg) => console.log(msg);

// Check user preferences
const prefs = await getUserPreferences(userId);
console.log("Notification preferences:", prefs);

// Check database
SELECT * FROM "Notification"
WHERE "userId" = 'user-id'
ORDER BY "createdAt" DESC
LIMIT 10;
```

#### Problem: Duplicate notifications

**Check**:

1. Multiple Pusher subscriptions (component mounted twice?)
2. StrictMode in development (React 18)
3. Webhook retry logic

**Solution**:

```typescript
// Add cleanup in useEffect
useEffect(() => {
  const channel = pusher.subscribe(`private-user-${userId}`);

  return () => {
    channel.unbind_all();
    pusher.unsubscribe(`private-user-${userId}`);
  };
}, [userId]);
```

### Webhook Issues

#### Problem: Captain not receiving booking notifications

**Check**:

1. `CAPTAIN_WEBHOOK_URL` set in fishon-market
2. `CAPTAIN_API_SECRET` matches in both apps

3. Network connectivity (firewall, DNS)
4. Webhook logs in both apps

**Solution**:

```bash
# fishon-market logs
grep "webhook" logs/app.log | grep "booking.created"

# fishon-captain logs
grep "WEBHOOK" logs/app.log | grep "Received request"

# Test webhook manually
curl -X POST $CAPTAIN_WEBHOOK_URL \
  -H "x-captain-secret: $CAPTAIN_API_SECRET" \
  -d '{"type":"booking.created","booking":{"id":"test"}}'
```

#### Problem: Webhook secret mismatch

**Check**:

1. Secret matches in both apps
2. No trailing whitespace in env vars
3. Environment loaded correctly

**Solution**:

```bash
# Verify secrets match
# fishon-market
echo "Market: $CAPTAIN_API_SECRET"

# fishon-captain
echo "Captain: $CAPTAIN_API_SECRET"

# Should be identical
```

### Database Issues

#### Problem: note or rejectionReason not saving

**Check**:

1. Fields exist in schema (they do - lines 359-360)
2. Prisma client regenerated after schema changes
3. Value being passed to API
4. Database migration applied

**Solution**:

```bash
# Regenerate Prisma client
npx prisma generate

# Check schema
npx prisma db pull

# Verify in database
psql $DATABASE_URL -c "SELECT note, rejectionReason FROM \"Booking\" WHERE id = 'booking-id';"
```

---

## Quick Reference

### Email Sending Functions

```typescript
// fishon-market
import {
  sendBookingCreatedEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendBookingConfirmedAnglerEmail,
  sendBookingReceivedCaptainEmail,
  sendBookingConfirmedCaptainEmail,
} from "@/lib/services/email-service";

// fishon-captain
import {
  sendBookingReceivedCaptainEmail,
  sendBookingConfirmedCaptainEmail,
  sendCharterRegistration,
} from "@/lib/services/email-service";
```

### Notification Creation

```typescript
import { createNotification } from "@/lib/services/notification-service";

await createNotification({
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,<https://github.com/jangbersahaja/fishon-email>
  bookingId?: strin<https://pusher.com/docs>
  charterId?: strin<https://react.email>
  metadata?: Reco<https://www.zoho.com/mail/help/zoho-smtp.html>
});
```

### Webhook Sending

```typescript
import { sendWithRetry } from "@/lib/webhooks/webhook";

sendWithRetry(webhookUrl, payload, {
  headers: { "x-captain-secret": secret },
  attempts: 3,
  baseDelayMs: 300,
});
```

---

## Migration Notes

### From Legacy Email System

If migrating from old email templates:

1. ✅ Install `@fishon/email` package
2. ✅ Update email service to use new templates
3. ✅ Remove old template files
4. ✅ Test all email sending paths
5. ✅ Update environment variables if needed

### Adding New Email Template

1. Create template in `fishon-email/src/emails/`
2. Export from `fishon-email/src/index.ts`
3. Add render function to email service wrapper
4. Update this documentation with template details

### Adding New Notification Type

1. Add enum value to Prisma schema
2. Run migration: `npx prisma migrate dev`
3. Update notification service type definitions
4. Add handling in relevant API endpoints
5. Update this documentation

---

## Support & Resources

- **Email Templates**: <https://github.com/jangbersahaja/fishon-email>
- **Pusher Docs**: <https://pusher.com/docs>
- **React Email**: <https://react.email>
- **Zoho SMTP**: <https://www.zoho.com/mail/help/zoho-smtp.html>

**For questions or issues**: Contact development team

---

**Document Maintained By**: Development Team  
**Last Review**: November 17, 2025
