---
type: feature
status: complete
updated: 2025-10-23
feature: booking-integration
author: GitHub Copilot
---

# Booking System Integration: fishon-market ↔ fishon-captain

## Overview

This document describes the complete booking system integration between the fishon-market (angler-facing marketplace) and fishon-captain (captain dashboard). The integration enables anglers to book fishing charters and captains to review and approve/reject bookings.

## Architecture

### Data Flow

```
fishon-market (Angler) → POST /api/bookings/create
                        ↓
                  Booking Created (PENDING)
                        ↓
fishon-captain  ← Webhook: POST /api/bookings/webhook
                        ↓
              Captain Reviews in Dashboard
                        ↓
              Captain Approves/Rejects
                        ↓
fishon-market  ← Webhook: POST /api/bookings/status-webhook
                        ↓
              Angler Notified via Email
```

## Database Schema

### Booking Model (Both Apps)

```prisma
enum BookingStatus {
  PENDING    // awaiting captain approval
  APPROVED   // captain approved, awaiting payment
  REJECTED   // captain rejected
  EXPIRED    // hold expired
  PAID       // payment completed, confirmed
  CANCELLED  // cancelled by angler
}

model Booking {
  id                 String        @id @default(cuid())
  userId             String
  captainCharterId   String        // Charter ID from captain app
  charterName        String
  location           String
  tripName           String
  unitPrice          Int           // Price per day in RM
  startTime          String?       // e.g., "07:00"
  date               DateTime      // Booking date
  days               Int           // Number of days
  adults             Int           // Adult count
  children           Int           // Children count
  totalPrice         Int           // Total in RM
  status             BookingStatus @default(PENDING)
  expiresAt          DateTime      // Booking hold expiry
  captainDecisionAt  DateTime?     // When captain decided
  cancellationReason String?       // Angler cancellation reason
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@index([userId])
  @@index([captainCharterId])
  @@index([status])
  @@index([createdAt])
}
```

## API Endpoints

### fishon-captain Endpoints

#### 1. Receive Booking Webhook

**Endpoint:** `POST /api/bookings/webhook`

**Purpose:** Receives new bookings from fishon-market.

**Request Body:**

```json
{
  "id": "booking_cuid",
  "userId": "user_cuid",
  "captainCharterId": "charter_cuid",
  "charterName": "Ocean Adventure",
  "location": "Port Klang, Selangor",
  "tripName": "Deep Sea Fishing",
  "unitPrice": 500,
  "startTime": "07:00",
  "date": "2025-11-15T00:00:00Z",
  "days": 1,
  "adults": 4,
  "children": 0,
  "totalPrice": 500,
  "status": "PENDING",
  "expiresAt": "2025-11-14T12:00:00Z"
}
```

**Response:**

```json
{ "ok": true }
```

**Security:** TODO - Add authentication/secret validation

#### 2. Update Booking Status

**Endpoint:** `POST /api/bookings/update-status`

**Purpose:** Captain approves/rejects booking.

**Request Body:**

```json
{
  "id": "booking_cuid",
  "status": "APPROVED" | "REJECTED"
}
```

**Response:**

```json
{ "ok": true }
```

**Security:** TODO - Add captain authentication check

**Side Effects:**

- Updates `captainDecisionAt` timestamp
- Sends webhook to fishon-market (if `FISHON_MARKET_WEBHOOK_URL` configured)

### fishon-market Endpoints

#### Booking Status Webhook

**Endpoint:** `POST /api/bookings/status-webhook`

**Purpose:** Receives booking status updates from fishon-captain.

**Authentication:** Requires `x-captain-secret` header matching `CAPTAIN_WEBHOOK_SECRET`

**Request Body:**

```json
{
  "id": "booking_cuid",
  "status": "APPROVED" | "REJECTED"
}
```

**Response:**

```json
{ "ok": true }
```

**Side Effects:**

- Only allows transition from `PENDING` status
- Sends email to angler with payment link (if APPROVED) or rejection notice

## Captain Dashboard

### Bookings Page

**Route:** `/(portal)/captain/bookings`

**Features:**

- Lists all bookings (currently all bookings, TODO: filter by captain)
- Shows booking details: charter, trip, date, persons, price, status
- Color-coded status badges
- Approve/Reject actions for PENDING bookings

**Components:**

- `page.tsx` - Server component displaying bookings list
- `BookingActions.tsx` - Client component for approve/reject buttons

### UI Components Used

- `Card`, `CardHeader`, `CardContent` from `@/components/ui/card`
- `Badge` from `@/components/ui/badge`
- `Button` from `@/components/ui/button`

## Environment Variables

### fishon-captain

```env
# Required for database
DATABASE_URL=postgresql://...

# Optional: fishon-market webhook URL for status updates
FISHON_MARKET_WEBHOOK_URL=https://fishon-market.vercel.app/api/bookings/status-webhook

# Optional: Shared secret for webhook authentication
CAPTAIN_WEBHOOK_SECRET=your_secret_here
```

### fishon-market

```env
# Required for booking status webhook authentication
CAPTAIN_WEBHOOK_SECRET=your_secret_here

# Required for email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@fishon.my
SMTP_PASS=password
```

## Implementation Status

### ✅ Complete

1. **Database Schema** - Booking model added to both apps
2. **fishon-captain Webhook** - `/api/bookings/webhook` receives bookings
3. **Captain Dashboard** - `/(portal)/captain/bookings` page with approval UI
4. **Status Update API** - `/api/bookings/update-status` for approve/reject
5. **Callback Webhook** - Notifies fishon-market of status changes
6. **Email Notifications** - fishon-market sends emails on status change

### 🚧 TODO

1. **Authentication** - Add captain role check to dashboard and APIs
2. **Captain Filtering** - Filter bookings by captain charter ID
3. **Availability Calendar** - Sync charter availability between apps
4. **Payment Integration** - Handle APPROVED → PAID transition
5. **Booking Expiry** - Auto-expire PENDING bookings after hold period
6. **Webhook Security** - Add secret-based authentication to webhooks
7. **Error Handling** - Better error messages and retry logic
8. **Real-time Updates** - Consider WebSocket/SSE for live status updates

## Testing Guide

### Manual Testing

#### 1. Create Booking (fishon-market)

```bash
# POST to fishon-market
curl -X POST https://fishon-market.vercel.app/api/bookings/create \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "charterId": "charter_cuid",
    "tripIndex": 0,
    "date": "2025-11-15",
    "days": 1,
    "adults": 4,
    "children": 0
  }'
```

#### 2. Verify in Captain Dashboard

```
Visit: https://fishon-captain.vercel.app/(portal)/captain/bookings
Expect: New PENDING booking appears
```

#### 3. Approve Booking (fishon-captain)

```
Click "Approve" button in dashboard
Expect: Status changes to APPROVED, angler receives email
```

#### 4. Verify Status Update (fishon-market)

```
Check booking in fishon-market database
Expect: status = "APPROVED", captainDecisionAt set
```

### Database Migration

The Booking model was added using `prisma db push` due to migration drift issues:

```bash
# Applied in fishon-captain
npx prisma db push
npx prisma generate
```

**Note:** For production, create proper migration:

```bash
npx prisma migrate dev --name add_booking_model
```

## Troubleshooting

### Migration Drift Error

**Problem:** `prisma migrate dev` fails with "migrations were modified after being applied"

**Solution:** Use `prisma db push` for development, or resolve drift:

```bash
npx prisma db push --skip-generate
npx prisma generate
```

### Webhook Not Received

**Problem:** fishon-captain doesn't receive booking from fishon-market

**Check:**

1. fishon-market webhook URL is correct
2. Network connectivity between apps
3. Check fishon-captain logs for incoming requests

### Status Update Fails

**Problem:** Approve/Reject doesn't update booking

**Check:**

1. Booking status is PENDING (only PENDING can be updated)
2. Database connectivity
3. API endpoint returns 200 OK
4. fishon-market webhook receives callback

## Future Enhancements

### Phase 2: Payment Integration

- Integrate with payment gateway (Stripe/PayPal)
- Handle APPROVED → PAID transition
- Support partial payments and deposits
- Refund handling for cancellations

### Phase 3: Availability Calendar

- Sync charter availability in real-time
- Block dates when bookings are approved
- Show available dates to anglers
- Handle multi-day bookings and conflicts

### Phase 4: Real-time Notifications

- WebSocket/SSE for live status updates
- Push notifications for mobile apps
- In-app notifications for captains
- SMS notifications for urgent updates

### Phase 5: Analytics & Reporting

- Booking conversion rates
- Revenue tracking per charter
- Popular trip times and dates
- Captain performance metrics

## Related Documentation

- [fishon-market Booking Flow](../../fishon-market/docs/booking-flow.md)
- [fishon-captain API Routes](../src/app/api/README.md)
- [Database Schema](../prisma/schema.prisma)
- [Email Templates](../../fishon-market/src/lib/email/templates/)

## Support

For issues or questions:

1. Check logs in Vercel dashboard
2. Review database state in Prisma Studio
3. Test webhooks with Postman/curl
4. Contact dev team via Slack #fishon-dev
