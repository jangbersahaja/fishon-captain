# Booking System - Complete Guide

**Last Updated**: November 21, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-market & fishon-captain

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Booking Flows](#booking-flows)
4. [Payment Integration](#payment-integration)
5. [Status Management](#status-management)
6. [Webhook Integration](#webhook-integration)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The Booking System enables anglers to book fishing charters through fishon-market, with captains managing bookings through fishon-captain dashboard. The system supports two distinct booking flows (MANUAL and AUTO) with integrated payment processing and real-time notifications.

### Key Features

- ✅ **Dual booking flows**: MANUAL (approve-then-pay) and AUTO (pay-then-acknowledge)
- ✅ **Cross-app integration**: fishon-market ↔ fishon-captain via webhooks
- ✅ **Payment processing**: Tokenized (card) and direct (FPX/e-wallet) flows
- ✅ **Real-time notifications**: Pusher-based instant updates
- ✅ **Email notifications**: Flow-aware messaging at each status change
- ✅ **Automatic expiry**: Time-limited holds with auto-cancellation
- ✅ **Guest booking support**: Anonymous booking with email tracking

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Booking System Flow                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────┐         ┌─────────────┐                  │
│  │fishon-market│         │fishon-captain│                 │
│  │  (Angler)   │         │  (Captain)   │                 │
│  └──────┬──────┘         └──────┬───────┘                 │
│         │                       │                          │
│         │ 1. Create Booking     │                          │
│         ├──────────────────────▶│                          │
│         │   POST /api/bookings  │                          │
│         │                       │                          │
│         │ 2. Webhook            │                          │
│         ├──────────────────────▶│                          │
│         │   booking.created     │                          │
│         │                       │                          │
│         │                       │ 3. Captain Reviews       │
│         │                       │    Dashboard             │
│         │                       │                          │
│         │ 4. Approve/Reject     │                          │
│         │◀──────────────────────┤                          │
│         │   MANUAL: Approve     │                          │
│         │   AUTO: Acknowledge   │                          │
│         │                       │                          │
│         │ 5. Payment (MANUAL)   │                          │
│         │   or Confirmation     │                          │
│         │   (AUTO)              │                          │
│         │                       │                          │
└────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **fishon-market (Angler Side)**

- **Booking Creation**: `/api/bookings/create`, `/api/bookings/create-guest`
- **Payment Processing**: SenangPay integration (card, FPX, e-wallet)
- **Status Tracking**: Real-time updates via Pusher
- **Email Notifications**: Flow-aware booking confirmations

#### 2. **fishon-captain (Captain Side)**

- **Webhook Receiver**: `/api/webhooks/booking`
- **Booking Management**: Dashboard with action buttons
- **Approval/Rejection**: `/api/bookings/approve`, `/api/bookings/reject`
- **Acknowledgment**: `/api/bookings/acknowledge` (AUTO flow only)

#### 3. **Shared Components**

- **Database**: PostgreSQL (separate databases, synced via webhooks)
- **Notifications**: Pusher channels for real-time updates
- **Email Service**: Zoho SMTP with React Email templates
- **Payment Gateway**: SenangPay (tokenization + direct payment)

---

## Booking Flows

### Flow Types

The system supports two booking flows, configured per charter:

```typescript
type BookingFlowType = "MANUAL" | "AUTO";
```

### MANUAL Flow (Approve-Then-Pay)

**User Experience**: "Request booking → Captain approves → Pay within 48h"

**Flow Diagram**:

```
Angler                     Captain                   Status
  │                          │
  ├─ Submit Request          │                     PENDING
  │                          │
  │                          ├─ Review Request
  │                          │
  │                          ├─ APPROVE ────────▶ AWAITING_PAYMENT
  │◀─ Notification           │
  │   "Approved! Pay now"    │
  │                          │
  ├─ Complete Payment        │                     PAID
  │                          │◀─ Notification
  │◀─ Confirmation           │   "Payment received"
  │                          │
```

**Key Characteristics**:

- Lower risk for angler (no payment upfront)
- Captain decides before money is involved
- 48-hour payment deadline after approval
- Auto-cancels if payment not received

**Status Transitions**:

```
PENDING → AWAITING_PAYMENT → PAID (confirmed)
       → REJECTED (if declined)
       → EXPIRED (if approval timeout)
```

### AUTO Flow (Pay-Then-Acknowledge)

**User Experience**: "Pay upfront → Captain acknowledges → Confirmed"

**Flow Diagram**:

```
Angler                     Captain                   Status
  │                          │
  ├─ Submit + Pay            │               PAYMENT_AUTHORIZED
  │                          │
  │                          ├─ Review Payment
  │                          │
  │                          ├─ ACKNOWLEDGE ──────▶ PAID
  │◀─ Confirmation           │
  │                          │◀─ Notification
  │                          │
```

**Key Characteristics**:

- Higher risk for angler (payment upfront)
- Captain must acknowledge or reject quickly
- Payment held/authorized until decision
- Refund required if captain rejects

**Status Transitions**:

```
PAYMENT_AUTHORIZED → PAID (acknowledged)
                  → REJECTED (refund initiated)
                  → EXPIRED (if ack timeout)
```

---

## Payment Integration

### Payment Methods

```typescript
type PaymentMethod = "CARD" | "FPX" | "EWALLET" | "MOCK";
```

### Payment Flows

```typescript
type PaymentFlow = "TOKENIZED" | "DIRECT";
```

#### TOKENIZED Flow (Card)

**Mechanism**: Card tokenization (pseudo pre-authorization)

**Process**:

1. Angler enters card details
2. System creates payment intent with SenangPay
3. Card is tokenized (not charged)
4. Token stored in `paymentIntentId`
5. If approved: Token is captured (charged)
6. If rejected: Token is released (no charge)

**Database Fields**:

```typescript
{
  paymentMethod: "CARD",
  paymentFlow: "TOKENIZED",
  paymentIntentId: "token_abc123",
  paymentAuthorizedAt: Date, // Token created
  paymentCapturedAt?: Date,  // Charged
  paymentReleasedAt?: Date,  // Released (if rejected)
}
```

**Angler Message**:

> "Your card will only be charged if the captain approves your booking. No charge will occur if they decline."

#### DIRECT Flow (FPX/E-wallet)

**Mechanism**: Immediate payment capture

**Process**:

1. Angler selects FPX or e-wallet
2. Redirected to payment gateway
3. Payment completed immediately
4. Booking created with `PAID` or `PAYMENT_AUTHORIZED` status
5. If rejected: Refund initiated automatically

**Database Fields**:

```typescript
{
  paymentMethod: "FPX" | "EWALLET",
  paymentFlow: "DIRECT",
  paymentIntentId: bookingId,
  paymentTransactionId: "txn_xyz789",
  paymentCapturedAt: Date, // Payment received
  refundAmount?: number,   // If refunded
  refundStatus?: string,   // Refund state
}
```

**Angler Message**:

> "Payment completed! Your funds are held securely and will be released to the captain once they approve. If they decline, we'll refund you within 3-5 business days."

---

## Status Management

### Booking Status Enum

```prisma
enum BookingStatus {
  PENDING               // MANUAL: Awaiting captain approval
  PAYMENT_AUTHORIZED    // AUTO: Payment held, awaiting acknowledgment
  AWAITING_PAYMENT      // MANUAL: Approved, awaiting angler payment
  PAID                  // Confirmed (payment captured)
  REJECTED              // Captain rejected
  CANCELLED             // Angler cancelled
  COMPLETED             // Trip completed
  EXPIRED               // Approval/payment deadline passed
}
```

### Status Transition Matrix

| From                    | To                   | Trigger             | Flow Type    |
| ----------------------- | -------------------- | ------------------- | ------------ |
| `PENDING`               | `AWAITING_PAYMENT`   | Captain approves    | MANUAL       |
| `PENDING`               | `REJECTED`           | Captain rejects     | MANUAL       |
| `PENDING`               | `EXPIRED`            | Approval timeout    | MANUAL       |
| `PAYMENT_AUTHORIZED`    | `PAID`               | Captain acknowledges| AUTO         |
| `PAYMENT_AUTHORIZED`    | `REJECTED`           | Captain rejects     | AUTO         |
| `PAYMENT_AUTHORIZED`    | `EXPIRED`            | Ack timeout         | AUTO         |
| `AWAITING_PAYMENT`      | `PAID`               | Angler pays         | MANUAL       |
| `AWAITING_PAYMENT`      | `EXPIRED`            | Payment timeout     | MANUAL       |
| `PAID`                  | `CANCELLED`          | Angler cancels      | Both         |
| `PAID`                  | `COMPLETED`          | Trip date passed    | Both         |

### Automatic Expiry

**Approval Deadline** (MANUAL flow):

- **Duration**: 12-24 hours (configurable per charter)
- **Trigger**: Set when booking created
- **Action**: Auto-reject with `EXPIRED` status
- **Notification**: Captain notified of missed deadline

**Payment Deadline** (MANUAL flow):

- **Duration**: 48 hours after approval
- **Trigger**: Set when captain approves
- **Action**: Auto-cancel with `EXPIRED` status
- **Notification**: Angler reminded at 24h and 1h before expiry

**Acknowledgment Deadline** (AUTO flow):

- **Duration**: 24 hours (configurable per charter)
- **Trigger**: Set when payment authorized
- **Action**: Auto-reject with refund
- **Notification**: Captain reminded at intervals

---

## Webhook Integration

### Webhook Flow: fishon-market → fishon-captain

**Endpoint**: `POST https://captain.fishon.my/api/webhooks/booking`

**Authentication**: `x-captain-secret` header

**Events**:

| Event                  | Trigger                     | Payload                          |
| ---------------------- | --------------------------- | -------------------------------- |
| `booking.created`      | Booking created (either flow) | Full booking object            |
| `booking.approved`     | Captain approves (MANUAL)   | Updated status + timestamps      |
| `booking.acknowledged` | Captain acks (AUTO)         | Updated status + timestamps      |
| `booking.paid`         | Angler pays (MANUAL)        | Payment details                  |
| `booking.rejected`     | Captain rejects             | Rejection reason                 |
| `booking.cancelled`    | Angler cancels              | Cancellation reason              |

**Example Payload**:

```json
{
  "type": "booking.created",
  "booking": {
    "id": "booking_123",
    "userId": "user_456",
    "charterId": "charter_789",
    "status": "PENDING",
    "bookingFlowType": "MANUAL",
    "paymentFlow": "TOKENIZED",
    "anglerName": "John Doe",
    "anglerEmail": "john@example.com",
    "tripName": "Half Day Fishing",
    "tripDate": "2025-12-01",
    "totalPrice": 500,
    "adults": 2,
    "children": 1
  }
}
```

### Webhook Handler Implementation

**Location**: `src/app/api/webhooks/booking/route.ts`

**Process**:

1. Validate `x-captain-secret` header
2. Parse event type from payload
3. Find or create booking in captain database
4. Send notification to captain via Pusher
5. Send email to captain (for `booking.created`)
6. Revalidate relevant dashboard pages
7. Return 200 OK

**Security**:

```typescript
const secret = request.headers.get("x-captain-secret");
if (secret !== process.env.CAPTAIN_API_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Retry Policy**:

- Max 3 attempts
- Exponential backoff: 300ms, 600ms, 1200ms
- Logged in both apps for debugging

---

## API Reference

### fishon-market APIs

#### 1. Create Booking (Authenticated)

**Endpoint**: `POST /api/bookings/create`

**Authentication**: Required (session)

**Request**:

```json
{
  "charterId": "charter_123",
  "tripId": "trip_456",
  "date": "2025-12-01",
  "adults": 2,
  "children": 1,
  "note": "First time fishing!",
  "paymentMethod": "CARD",
  "cardDetails": {
    "number": "4111111111111111",
    "cvv": "123",
    "expiryMonth": 12,
    "expiryYear": 2026
  }
}
```

**Response**:

```json
{
  "bookingId": "booking_789",
  "status": "PENDING",
  "expiresAt": "2025-12-01T12:00:00Z",
  "paymentAuthorized": true
}
```

#### 2. Create Guest Booking

**Endpoint**: `POST /api/bookings/create-guest`

**Authentication**: None (guest)

**Request**:

```json
{
  "charterId": "charter_123",
  "tripId": "trip_456",
  "date": "2025-12-01",
  "adults": 2,
  "children": 1,
  "guestEmail": "guest@example.com",
  "guestName": "Jane Smith",
  "guestPhone": "+60123456789",
  "note": "Looking forward to this!",
  "paymentMethod": "FPX"
}
```

#### 3. Pay for Booking (MANUAL Flow)

**Endpoint**: `POST /api/bookings/:id/pay`

**Purpose**: Complete payment after captain approval

**Request**:

```json
{
  "paymentMethod": "CARD",
  "cardDetails": { ... }
}
```

### fishon-captain APIs

#### 1. Approve Booking (MANUAL Flow)

**Endpoint**: `POST /api/bookings/:id/approve`

**Authentication**: Required (captain)

**Request**:

```json
{
  "message": "Optional message to angler"
}
```

**Response**:

```json
{
  "success": true,
  "status": "AWAITING_PAYMENT",
  "paymentDeadline": "2025-12-03T12:00:00Z"
}
```

**Validation**:

- Only MANUAL flow bookings can be approved
- Booking must be in PENDING status
- Captain must own the charter

#### 2. Acknowledge Booking (AUTO Flow)

**Endpoint**: `POST /api/bookings/:id/acknowledge`

**Authentication**: Required (captain)

**Request**:

```json
{
  "message": "Optional welcome message"
}
```

**Response**:

```json
{
  "success": true,
  "status": "PAID"
}
```

**Validation**:

- Only AUTO flow bookings can be acknowledged
- Booking must be in PAYMENT_AUTHORIZED status
- Captain must own the charter

#### 3. Reject Booking

**Endpoint**: `POST /api/bookings/:id/reject`

**Authentication**: Required (captain)

**Request**:

```json
{
  "reason": "Boat maintenance scheduled"
}
```

**Response**:

```json
{
  "success": true,
  "status": "REJECTED",
  "refundInitiated": true // If DIRECT flow
}
```

**Side Effects**:

- TOKENIZED flow: Releases payment token (no charge)
- DIRECT flow: Initiates refund (3-5 business days)
- Sends rejection email to angler
- Sends notification to angler

---

## Configuration

### Environment Variables

#### fishon-market

```bash
# Database
DATABASE_URL="postgresql://..."

# Payment Gateway (SenangPay)
SENANGPAY_MERCHANT_ID="your-merchant-id"
SENANGPAY_SECRET_KEY="your-secret-key"
SENANGPAY_SANDBOX="false"

# Webhook
CAPTAIN_WEBHOOK_URL="https://captain.fishon.my/api/webhooks/booking"
CAPTAIN_API_SECRET="your-shared-secret"

# Notifications
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
PUSHER_APP_ID="your-app-id"
PUSHER_SECRET="your-pusher-secret"

# Email (see EMAIL_NOTIFICATION_SYSTEM.md)
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="465"
```

#### fishon-captain

```bash
# Database
DATABASE_URL="postgresql://..."
MARKET_DATABASE_URL="postgresql://..." # Read-only access

# Webhook Security
CAPTAIN_API_SECRET="your-shared-secret"

# Notifications
NEXT_PUBLIC_PUSHER_APP_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"

# Email
EMAIL_FROM="no-reply@fishon.my"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="465"
```

### Charter-Level Configuration

**Database Fields**:

```prisma
model Charter {
  bookingFlowType        String  @default("MANUAL") // "MANUAL" | "AUTO"
  approvalTimeHours      Int     @default(24)       // MANUAL flow
  acknowledgmentTimeHours Int    @default(24)       // AUTO flow
  paymentTimeHours       Int     @default(48)       // MANUAL flow
  instantBookingEnabled  Boolean @default(false)    // Future: skip approval
}
```

**Configuration UI**: `/captain/charters` → Charter card → Booking settings

---

## Testing

### Test Scenarios

#### MANUAL Flow End-to-End

```bash
# 1. Create booking
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie" \
  -d '{
    "charterId": "charter_123",
    "tripId": "trip_456",
    "date": "2025-12-01",
    "adults": 2,
    "paymentMethod": "CARD",
    "cardDetails": { ... }
  }'

# 2. Verify webhook received (captain logs)
# 3. Approve in captain dashboard
# 4. Verify angler email received
# 5. Complete payment (angler side)
# 6. Verify confirmation emails (both)
```

#### AUTO Flow End-to-End

```bash
# 1. Create booking with payment
# 2. Verify PAYMENT_AUTHORIZED status
# 3. Verify captain webhook received
# 4. Acknowledge in captain dashboard
# 5. Verify PAID status
# 6. Verify confirmation emails
```

#### Rejection Scenarios

**TOKENIZED (no charge)**:

- Create booking with card
- Captain rejects
- Verify no charge occurred
- Verify "authorization released" message

**DIRECT (refund)**:

- Create booking with FPX
- Captain rejects
- Verify refund initiated
- Verify refund message in email

### Integration Tests

**Location**: `src/app/api/__tests__/bookings.test.ts`

**Coverage**:

- Booking creation (both flows)
- Status transitions
- Webhook delivery
- Payment capture/release
- Email notifications
- Expiry handling

**Run Tests**:

```bash
npm test -- bookings
```

### Manual Testing Checklist

#### Booking Creation

- [ ] MANUAL flow with card (tokenized)
- [ ] MANUAL flow with FPX (direct)
- [ ] AUTO flow with card (tokenized)
- [ ] AUTO flow with e-wallet (direct)
- [ ] Guest booking (email tracking)
- [ ] Booking with note to captain

#### Captain Actions

- [ ] Approve MANUAL booking
- [ ] Acknowledge AUTO booking
- [ ] Reject with reason
- [ ] View booking details
- [ ] Filter by status
- [ ] Search by guest name

#### Notifications

- [ ] Angler email (booking created)
- [ ] Captain webhook (booking received)
- [ ] Angler email (approved/rejected)
- [ ] Pusher notification (real-time)
- [ ] Payment reminder (MANUAL flow)

#### Edge Cases

- [ ] Approval deadline expires
- [ ] Payment deadline expires
- [ ] Concurrent approval attempts
- [ ] Network failure during webhook
- [ ] Payment gateway timeout

---

## Troubleshooting

### Booking Creation Issues

#### Problem: Booking stuck in PENDING

**Check**:

1. Webhook delivery to captain app
2. Captain webhook logs
3. Network connectivity
4. Secret header validation

**Solution**:

```bash
# Check webhook logs (fishon-market)
grep "webhook" logs/app.log | grep "booking.created"

# Manually trigger webhook
curl -X POST https://captain.fishon.my/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -H "x-captain-secret: $SECRET" \
  -d '{"type":"booking.created","booking":{...}}'
```

#### Problem: Payment not processing

**Check**:

1. Payment gateway response
2. Card details validation
3. Merchant ID and secret key
4. Sandbox vs production mode

**Solution**:

```typescript
// Enable payment debug mode
console.log("[Payment] Request:", paymentRequest);
console.log("[Payment] Response:", paymentResponse);

// Verify SenangPay credentials
echo $SENANGPAY_MERCHANT_ID
echo $SENANGPAY_SANDBOX
```

### Status Transition Issues

#### Problem: Cannot approve booking

**Check**:

1. Current booking status
2. Booking flow type (MANUAL only)
3. Captain ownership
4. Approval deadline

**Solution**:

```sql
-- Check booking details
SELECT id, status, "bookingFlowType", "expiresAt", "charterId"
FROM "Booking"
WHERE id = 'booking-id';

-- Verify captain ownership
SELECT c.id, c."userId", u.email
FROM "Charter" c
JOIN "User" u ON c."userId" = u.id
WHERE c.id = (SELECT "charterId" FROM "Booking" WHERE id = 'booking-id');
```

### Webhook Issues

#### Problem: Webhook not received

**Check**:

1. CAPTAIN_WEBHOOK_URL environment variable
2. Network connectivity (firewall, DNS)
3. SSL certificate validity
4. Secret header validation

**Solution**:

```bash
# Test webhook endpoint
curl -X POST $CAPTAIN_WEBHOOK_URL \
  -H "x-captain-secret: $CAPTAIN_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"booking.created","booking":{"id":"test"}}'

# Check captain app logs
grep "WEBHOOK" logs/app.log | tail -20
```

### Notification Issues

#### Problem: Email not sent

**Check**:

1. SMTP credentials
2. Email service logs
3. Rate limiting
4. Spam folder

**Solution**: See `EMAIL_NOTIFICATION_SYSTEM.md` troubleshooting section

#### Problem: Pusher notification not received

**Check**:

1. Pusher connection status
2. Channel subscription
3. Event type and payload
4. User ID matching

**Solution**:

```typescript
// Enable Pusher debug logs
window.Pusher.log = (msg) => console.log(msg);

// Check subscription
const channel = pusher.subscribe(`private-user-${userId}`);
channel.bind_global((event, data) => {
  console.log("Pusher event:", event, data);
});
```

---

## Quick Reference

### Status Colors (UI)

```typescript
const statusColors = {
  PENDING: "yellow",            // Awaiting approval
  PAYMENT_AUTHORIZED: "blue",   // Payment held
  AWAITING_PAYMENT: "orange",   // Approved, pay now
  PAID: "green",                // Confirmed
  REJECTED: "red",              // Declined
  CANCELLED: "gray",            // User cancelled
  COMPLETED: "blue",            // Trip done
  EXPIRED: "gray",              // Deadline passed
};
```

### Common Queries

```sql
-- Active bookings for charter
SELECT * FROM "Booking"
WHERE "charterId" = 'charter-id'
  AND status IN ('PENDING', 'PAYMENT_AUTHORIZED', 'AWAITING_PAYMENT', 'PAID')
ORDER BY date ASC;

-- Expiring approvals
SELECT * FROM "Booking"
WHERE status = 'PENDING'
  AND "expiresAt" < NOW() + INTERVAL '1 hour';

-- Pending payments
SELECT * FROM "Booking"
WHERE status = 'AWAITING_PAYMENT'
  AND "expiresAt" < NOW() + INTERVAL '24 hours';

-- Bookings by flow type
SELECT "bookingFlowType", COUNT(*)
FROM "Booking"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY "bookingFlowType";
```

---

## Related Documentation

- **Email & Notifications**: `docs/config/EMAIL_NOTIFICATION_SYSTEM.md`
- **Charter Configuration**: `docs/config/CHARTER_REGISTRATION_SYSTEM.md`
- **Payment Integration**: Contact development team for SenangPay docs

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
