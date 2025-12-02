# Captain Affiliate Programme System - Design Document

**Last Updated**: December 2, 2025  
**Status**: ✅ Implemented (Phase 1-3)  
**Applies To**: fishon-captain, fishon-market

---

## Implementation Status

### ✅ Completed (Phase 1 - Foundation)

- Database schema (Prisma models for ReferralCode, Referral, ReferralEarning)
- Referral code generation API (`/api/captain/referral-code`)
- Referral tracking API (`/api/referrals/track`, `/api/referrals/validate`)
- Referral list API (`/api/captain/referrals`)
- Webhook handler (`/api/webhooks/referral`)
- Referral service layer (`/src/lib/services/referral-service.ts`)
- UI components (ReferralDashboardCard, ReferralLinkShare, ReferralsDataTable)
- Full referrals page (`/captain/referrals`)
- **Eligibility enforcement** (must be CAPTAIN role with at least 1 active charter)

### ✅ Completed (Phase 2 - Registration Integration)

- Join page with referral support (`/join?ref=CODE`)
- AuthSwitcher updated to pass referral code
- SignUpForm updated to pass referral code to API
- Signup API updated to handle referral attribution
- Direct attribution for manual code entry (without click tracking)

### ✅ Completed (Phase 3 - Fraud Prevention)

- IP tracking for duplicate detection (hashed IP stored)
- Click cooldown (5 minutes between clicks from same IP)
- Suspicious pattern detection (>20 clicks from same IP in 24 hours)
- Admin tools to mark referrals as INVALID with reason
- Bulk invalidation for suspicious IP patterns
- Fraud indicators in admin dashboard
- Admin referrals page (`/staff/referrals`)

### ⏸️ On Hold (Phase 4 - Payout Integration)

_Will be implemented together with payout system enhancement._

- Integration with existing Payout model
- Include referral commissions in captain payout batches
- Admin UI for processing referral payouts
- Email notification on commission paid

### 📋 Future Improvement (Phase 5 - Enhancement)

- Leaderboard (top referrers)
- Advanced analytics dashboard
- Tiered commission rates for top performers
- Social sharing enhancements

---

## Table of Contents

1. [Overview](#overview)
2. [Business Rules](#business-rules)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [UI Components](#ui-components)
6. [Email Notifications](#email-notifications)
7. [Implementation Phases](#implementation-phases)
8. [Security Considerations](#security-considerations)
9. [Analytics & Tracking](#analytics--tracking)

---

## Overview

### Purpose

The Captain Affiliate Programme incentivizes existing captains to invite new captains to join Fishon. This drives organic growth through word-of-mouth referrals from our most valuable users.

### Key Goals

- ✅ Increase captain registrations through referrals
- ✅ Reward captains who bring new members to the platform
- ✅ Build community through captain-to-captain connections
- ✅ Track referral attribution accurately

### Programme Summary

| Aspect                  | Details                                    |
| ----------------------- | ------------------------------------------ |
| **Who can refer**       | Active captains with at least one charter  |
| **Who can be referred** | New users (no existing account)            |
| **Commission**          | 10% of first completed trip earnings       |
| **Commission Cap**      | RM 100 maximum per referral                |
| **Payment Timing**      | After invitee's first trip completion      |
| **Validity**            | 90 days from registration to first booking |

---

## Business Rules

### Eligibility Rules

#### Invitor (Referrer) Requirements

1. Must be a registered captain (role = CAPTAIN)
2. Must have at least one ACTIVE charter
3. Account must be in good standing (not suspended)
4. Email must be verified

#### Invitee (Referred) Requirements

1. Must be a NEW user (no existing account with same email)
2. Must register using a valid referral code/link
3. Must complete registration within 30 days of clicking link
4. Must complete their FIRST trip within 90 days of registration

### Commission Calculation

```typescript
// Commission calculation formula
const COMMISSION_RATE = 0.1; // 10%
const COMMISSION_CAP = 100; // RM 100

function calculateReferralCommission(captainEarnings: number): number {
  const commission = captainEarnings * COMMISSION_RATE;
  return Math.min(commission, COMMISSION_CAP);
}

// Examples:
// Trip earnings RM 500 → Commission: RM 50 (10%)
// Trip earnings RM 1,000 → Commission: RM 100 (10%)
// Trip earnings RM 2,000 → Commission: RM 100 (capped!)
```

### Commission Rules

1. **One-Time Only**: Commission is only paid for the invitee's FIRST completed trip
2. **Cap Per Referral**: Maximum RM 100 per referred captain, regardless of trip price
3. **Based on Captain Earnings**: Commission calculated from `captainEarnings`, not `finalPrice`
4. **Paid After Completion**: Commission credited after trip status = COMPLETED
5. **No Self-Referral**: Captain cannot refer themselves (email/IP validation)

### Status Lifecycle

```
PENDING → REGISTERED → CHARTER_CREATED → FIRST_BOOKING → COMPLETED → PAID
   │          │              │                │             │
   │          │              │                │             └── Invitor receives commission
   │          │              │                └── Invitee first trip complete
   │          │              └── Invitee creates first charter
   │          └── Invitee completes registration
   └── Referral link clicked
```

### Edge Cases

| Scenario                          | Handling                        |
| --------------------------------- | ------------------------------- |
| Invitee never registers           | Referral expires after 30 days  |
| Invitee registers but never books | No commission earned            |
| Invitee's first trip cancelled    | Wait for next completed trip    |
| Multiple clicks from same invitee | First click attribution         |
| Invitor deactivates account       | Commission still paid if earned |
| Invitee's trip refunded           | Commission reversed             |

---

## Database Schema

### New Models for fishon-captain

```prisma
// ============================================
// AFFILIATE/REFERRAL PROGRAMME MODELS
// ============================================

/// Referral codes for captain affiliate programme
model ReferralCode {
  id          String   @id @default(cuid())
  code        String   @unique // e.g., "AHMAD7K2X" (personalized from captain name)

  // Owner (the captain who owns this referral code)
  ownerId     String
  owner       User     @relation("ReferralCodeOwner", fields: [ownerId], references: [id])

  // Statistics
  clickCount  Int      @default(0)
  signupCount Int      @default(0)

  // Status
  isActive    Boolean  @default(true)

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  referrals   Referral[]

  @@index([ownerId])
  @@index([code])
  @@map("referral_codes")
}

/// Tracks individual referrals from invitor to invitee
model Referral {
  id              String         @id @default(cuid())

  // Referral code used
  referralCodeId  String
  referralCode    ReferralCode   @relation(fields: [referralCodeId], references: [id])

  // Invitor (captain who referred)
  invitorId       String
  invitor         User           @relation("InvitorReferrals", fields: [invitorId], references: [id])

  // Invitee (new captain who was referred)
  // Nullable until they complete registration
  inviteeId       String?
  invitee         User?          @relation("InviteeReferrals", fields: [inviteeId], references: [id])

  // Tracking
  inviteeEmail    String?        // Email captured on click (if available)
  clickedAt       DateTime       @default(now())
  registeredAt    DateTime?      // When invitee completed registration
  firstCharterId  String?        // Invitee's first charter (from fishon-captain)
  firstCharterAt  DateTime?      // When first charter was created
  firstBookingId  String?        // First completed booking (from fishon-market)
  completedAt     DateTime?      // When first trip was completed

  // Status
  status          ReferralStatus @default(PENDING)

  // Source tracking
  sourceIp        String?        // Hashed IP for fraud prevention
  sourceUserAgent String?        // Browser info
  utmSource       String?        // UTM tracking
  utmMedium       String?
  utmCampaign     String?

  // Expiry
  expiresAt       DateTime       // 30 days for registration, 90 days for first trip

  // Timestamps
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  earning         ReferralEarning?

  @@unique([inviteeId]) // One referral per invitee
  @@index([invitorId, status])
  @@index([inviteeEmail])
  @@index([status, expiresAt])
  @@map("referrals")
}

/// Tracks commission earnings from referrals
model ReferralEarning {
  id              String              @id @default(cuid())

  // Referral this earning is from
  referralId      String              @unique
  referral        Referral            @relation(fields: [referralId], references: [id])

  // Captain who earns (invitor)
  earnerId        String
  earner          User                @relation("ReferralEarnings", fields: [earnerId], references: [id])

  // Booking details (from fishon-market)
  bookingId       String              // First completed booking ID
  tripEarnings    Decimal             @db.Decimal(10, 2) // Captain's earnings from trip
  commissionRate  Decimal             @db.Decimal(5, 4) // 0.10 = 10%
  commissionAmount Decimal            @db.Decimal(10, 2) // Actual commission earned
  commissionCap   Decimal             @db.Decimal(10, 2) // Cap applied (RM 100)

  // Status
  status          ReferralEarningStatus @default(PENDING)

  // Payout tracking
  payoutBatchId   String?             // When included in payout
  paidAt          DateTime?

  // Timestamps
  earnedAt        DateTime            @default(now()) // When trip completed
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([earnerId, status])
  @@index([status, earnedAt])
  @@map("referral_earnings")
}

enum ReferralStatus {
  PENDING           // Link clicked, awaiting registration
  REGISTERED        // Invitee registered
  CHARTER_CREATED   // Invitee created first charter
  FIRST_BOOKING     // Invitee received first booking
  COMPLETED         // First trip completed, commission calculated
  PAID              // Commission paid to invitor
  EXPIRED           // Time limit exceeded
  INVALID           // Fraud detected or rules violated
}

enum ReferralEarningStatus {
  PENDING           // Calculated, awaiting payout cycle
  SCHEDULED         // Included in payout batch
  PAID              // Transferred to captain
  REVERSED          // Clawed back (e.g., refund)
}
```

### User Model Updates

```prisma
// Add to existing User model in fishon-captain
model User {
  // ... existing fields ...

  // Affiliate Programme
  referralCode         ReferralCode?     @relation("ReferralCodeOwner")
  referralsGiven       Referral[]        @relation("InvitorReferrals")
  referralReceived     Referral?         @relation("InviteeReferrals")
  referralEarnings     ReferralEarning[] @relation("ReferralEarnings")
  referredById         String?           // Quick lookup: who referred this user
}
```

---

## API Design

### Referral Code Management

#### Generate Referral Code

```http
POST /api/captain/referral-code
Authorization: Bearer <token>

Response: 201 Created
{
  "code": "AHMAD7K2X",
  "shareUrl": "https://captain.fishon.my/join?ref=AHMAD7K2X",
  "createdAt": "2025-12-02T10:00:00Z"
}
```

#### Get My Referral Code

```http
GET /api/captain/referral-code
Authorization: Bearer <token>

Response: 200 OK
{
  "code": "AHMAD7K2X",
  "shareUrl": "https://captain.fishon.my/join?ref=AHMAD7K2X",
  "stats": {
    "clicks": 42,
    "signups": 8,
    "completedTrips": 3,
    "totalEarnings": 250.00,
    "pendingEarnings": 50.00
  },
  "createdAt": "2025-12-02T10:00:00Z"
}
```

### Referral Tracking

#### Track Referral Click

```http
POST /api/referrals/track
Content-Type: application/json

{
  "code": "AHMAD7K2X",
  "utmSource": "whatsapp",
  "utmMedium": "share",
  "utmCampaign": "captain_invite"
}

Response: 200 OK
{
  "trackingId": "ref_xyz789",
  "invitorName": "Captain Ahmad",
  "expiresAt": "2026-01-01T10:00:00Z"
}
```

#### Validate Referral Code

```http
GET /api/referrals/validate?code=AHMAD7K2X

Response: 200 OK
{
  "valid": true,
  "invitorName": "Captain Ahmad",
  "invitorCharters": 3,
  "invitorRating": 4.8
}

Response: 400 Bad Request
{
  "valid": false,
  "error": "EXPIRED" | "INVALID" | "SELF_REFERRAL" | "ALREADY_REGISTERED"
}
```

### Referral Dashboard

#### Get My Referrals

```http
GET /api/captain/referrals?status=all&page=1&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "referrals": [
    {
      "id": "ref_xyz789",
      "inviteeName": "Captain Budi",
      "inviteeEmail": "b***@email.com",
      "status": "COMPLETED",
      "registeredAt": "2025-11-15T10:00:00Z",
      "firstCharterAt": "2025-11-20T10:00:00Z",
      "completedAt": "2025-12-01T10:00:00Z",
      "earning": {
        "amount": 100.00,
        "status": "PENDING"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  },
  "summary": {
    "pending": 2,
    "registered": 3,
    "completed": 3,
    "paid": 0
  }
}
```

#### Get My Referral Earnings

```http
GET /api/captain/referral-earnings?status=all&page=1&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "earnings": [
    {
      "id": "earn_abc123",
      "referralId": "ref_xyz789",
      "inviteeName": "Captain Budi",
      "bookingId": "book_def456",
      "tripEarnings": 1000.00,
      "commissionAmount": 100.00,
      "status": "PENDING",
      "earnedAt": "2025-12-01T10:00:00Z"
    }
  ],
  "summary": {
    "totalEarned": 250.00,
    "totalPending": 100.00,
    "totalPaid": 150.00
  }
}
```

### Webhook Integration

#### Booking Completed Webhook (from fishon-market)

```http
POST /api/webhooks/referral
X-Captain-Secret: <webhook-secret>
Content-Type: application/json

{
  "type": "booking.completed",
  "bookingId": "book_def456",
  "charterId": "charter_ghi789",
  "ownerId": "user_jkl012", // The new captain
  "captainEarnings": 1000.00,
  "completedAt": "2025-12-01T10:00:00Z"
}

Response: 200 OK
{
  "processed": true,
  "referralFound": true,
  "commissionCalculated": 100.00
}
```

---

## UI Components

### 1. Referral Dashboard Card (Captain Dashboard)

Location: `/captain/dashboard`

```tsx
// components/captain/ReferralDashboardCard.tsx
<Card>
  <CardHeader>
    <CardTitle>Affiliate Programme</CardTitle>
    <CardDescription>
      Invite captains and earn up to RM100 per referral
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <Stat label="Total Referrals" value={8} />
      <Stat label="Completed" value={3} />
      <Stat label="Total Earned" value="RM 250" />
      <Stat label="Pending" value="RM 50" />
    </div>
    <ReferralLinkShare code="AHMAD7K2X" />
  </CardContent>
  <CardFooter>
    <Link href="/captain/referrals">View All Referrals →</Link>
  </CardFooter>
</Card>
```

### 2. Referral Link Share Component

```tsx
// components/captain/ReferralLinkShare.tsx
<div className="p-4 border rounded-lg bg-slate-50">
  <Label>Your Referral Link</Label>
  <div className="flex gap-2 mt-2">
    <Input value="https://captain.fishon.my/join?ref=AHMAD7K2X" readOnly />
    <Button onClick={copyToClipboard}>
      <Copy className="w-4 h-4" />
    </Button>
  </div>
  <div className="flex gap-2 mt-4">
    <Button variant="outline" onClick={shareWhatsApp}>
      <WhatsApp /> Share on WhatsApp
    </Button>
    <Button variant="outline" onClick={shareFacebook}>
      <Facebook /> Share on Facebook
    </Button>
  </div>
</div>
```

### 3. Referrals Page

Location: `/captain/referrals`

```tsx
// app/(portal)/captain/referrals/page.tsx
<div className="space-y-6">
  {/* Stats Overview */}
  <ReferralStatsCards stats={stats} />

  {/* Share Section */}
  <ReferralShareSection code={referralCode} />

  {/* How It Works */}
  <HowItWorksAccordion />

  {/* Referrals Table */}
  <ReferralsDataTable
    referrals={referrals}
    onStatusFilter={handleStatusFilter}
  />

  {/* Earnings Table */}
  <EarningsDataTable earnings={earnings} onStatusFilter={handleStatusFilter} />
</div>
```

### 4. Registration Page with Referral

Location: `/join?ref=AHMAD7K2X`

```tsx
// app/(auth)/join/page.tsx
<div className="max-w-md mx-auto">
  {referrer && (
    <Alert className="mb-6">
      <Gift className="w-4 h-4" />
      <AlertTitle>You've been invited!</AlertTitle>
      <AlertDescription>
        {referrer.name} has invited you to join Fishon Captain. Complete your
        registration to get started.
      </AlertDescription>
    </Alert>
  )}

  <RegistrationForm referralCode={code} />
</div>
```

---

## Email Notifications

### 1. Referral Invitation Email (Optional - for email invites)

**Template**: `referral-invitation.tsx`

```tsx
// When invitor sends email invitation
{
  to: inviteeEmail,
  subject: "Captain Ahmad invites you to join Fishon Captain",
  content: {
    invitorName: "Captain Ahmad",
    message: "Join me on Fishon and start earning from fishing charters!",
    referralLink: "https://captain.fishon.my/join?ref=AHMAD7K2X",
    benefits: [
      "List your charter on Malaysia's #1 fishing platform",
      "Get bookings from thousands of anglers",
      "Easy booking management"
    ]
  }
}
```

### 2. Referral Registration Notification

**Template**: `referral-signup.tsx`

```tsx
// To invitor when invitee registers
{
  to: invitor.email,
  subject: "🎉 Your referral Captain Budi just signed up!",
  content: {
    inviteeName: "Captain Budi",
    registeredAt: "December 2, 2025",
    nextStep: "They need to create a charter and complete their first trip for you to earn RM100",
    dashboardLink: "https://captain.fishon.my/captain/referrals"
  }
}
```

### 3. Commission Earned Notification

**Template**: `referral-commission-earned.tsx`

```tsx
// To invitor when commission is earned
{
  to: invitor.email,
  subject: "💰 You earned RM100 from your referral!",
  content: {
    inviteeName: "Captain Budi",
    tripName: "Half-Day Trolling",
    tripEarnings: "RM 1,000",
    commissionAmount: "RM 100",
    totalReferralEarnings: "RM 350",
    payoutNote: "Commission will be included in your next payout cycle",
    dashboardLink: "https://captain.fishon.my/captain/referrals"
  }
}
```

### 4. Commission Paid Notification

**Template**: `referral-commission-paid.tsx`

```tsx
// To invitor when commission is paid
{
  to: invitor.email,
  subject: "💵 Referral commission paid - RM100",
  content: {
    amount: "RM 100",
    payoutBatchId: "2025-W49-xyz",
    bankAccount: "***1234",
    transactionDate: "December 5, 2025",
    referralsSummary: {
      totalReferrals: 5,
      paidCommissions: 3,
      pendingCommissions: 2
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Database schema migration
- [ ] Referral code generation API
- [ ] Referral tracking API (click tracking)
- [ ] Code validation API
- [ ] Basic referral dashboard card on captain dashboard

### Phase 2: Registration Integration (Week 2-3)

- [ ] Registration page with referral code support
- [ ] Referral attribution on user creation
- [ ] Email notification on signup
- [ ] Referral status updates (PENDING → REGISTERED)

### Phase 3: Commission Tracking (Week 3-4)

- [ ] Webhook integration for booking completion
- [ ] Commission calculation service
- [ ] Referral earnings tracking
- [ ] Email notification on commission earned

### Phase 4: Dashboard & Payout (Week 4-5)

- [ ] Full referrals management page
- [ ] Earnings history table
- [ ] Integration with existing payout system
- [ ] Email notification on commission paid

### Phase 5: Enhancement (Week 5-6)

- [ ] Social sharing integration (WhatsApp, Facebook)
- [ ] Analytics dashboard for admin
- [ ] Fraud detection rules
- [ ] Leaderboard (top referrers)

---

## Security Considerations

### Fraud Prevention

1. **IP Tracking**: Hash and store IP addresses to detect self-referrals
2. **Email Validation**: Ensure invitee email is different from invitor
3. **Rate Limiting**: Limit referral code generation and clicks
4. **Cooling Period**: Minimum time between referral clicks from same IP
5. **Verification**: Require email verification before commission eligibility

### Data Privacy

1. **Masked Data**: Show partial email addresses in dashboard
2. **Consent**: Invitees must consent to referral attribution
3. **Data Retention**: Clear expired referral tracking data after 90 days
4. **GDPR Compliance**: Allow users to opt out of referral programme

### Commission Security

1. **Double-Spend Prevention**: Ensure one commission per referral
2. **Clawback Rules**: Reverse commission if trip is refunded
3. **Audit Trail**: Log all commission calculations and status changes
4. **Manual Review**: Flag unusual patterns for admin review

---

## Analytics & Tracking

### Key Metrics

| Metric                  | Description                             |
| ----------------------- | --------------------------------------- |
| Referral Click Rate     | Clicks per referral link shared         |
| Registration Conversion | Signups / Clicks                        |
| Charter Creation Rate   | Charters created / Signups              |
| First Trip Conversion   | Completed trips / Charters              |
| Average Commission      | Total commissions / Completed referrals |
| Time to First Trip      | Days from registration to first trip    |

### Admin Dashboard Metrics

```typescript
interface ReferralProgrammeMetrics {
  // Funnel metrics
  totalClicks: number;
  totalSignups: number;
  totalChartersCreated: number;
  totalTripsCompleted: number;

  // Financial metrics
  totalCommissionsEarned: Decimal;
  totalCommissionsPaid: Decimal;
  totalCommissionsPending: Decimal;
  averageCommission: Decimal;

  // Performance metrics
  topReferrers: Array<{
    userId: string;
    name: string;
    referralCount: number;
    totalEarned: Decimal;
  }>;

  // Time metrics
  avgDaysToRegistration: number;
  avgDaysToFirstTrip: number;

  // Conversion rates
  clickToSignupRate: number;
  signupToCharterRate: number;
  charterToTripRate: number;
}
```

---

## Quick Reference

### Key Files (To Be Created)

```
Database:
- prisma/migrations/YYYYMMDD_add_referral_programme/migration.sql

APIs:
- src/app/api/captain/referral-code/route.ts
- src/app/api/captain/referrals/route.ts
- src/app/api/captain/referral-earnings/route.ts
- src/app/api/referrals/track/route.ts
- src/app/api/referrals/validate/route.ts
- src/app/api/webhooks/referral/route.ts

Services:
- src/lib/services/referral-service.ts

Components:
- src/components/captain/ReferralDashboardCard.tsx
- src/components/captain/ReferralLinkShare.tsx
- src/components/captain/ReferralStatsCards.tsx
- src/components/captain/ReferralsDataTable.tsx
- src/components/captain/EarningsDataTable.tsx

Pages:
- src/app/(portal)/captain/referrals/page.tsx
- src/app/(auth)/join/page.tsx

Email Templates (fishon-email):
- emails/referral-invitation.tsx
- emails/referral-signup.tsx
- emails/referral-commission-earned.tsx
- emails/referral-commission-paid.tsx
```

### Environment Variables

```bash
# Referral Programme
REFERRAL_REGISTRATION_EXPIRY_DAYS=30
REFERRAL_TRIP_EXPIRY_DAYS=90
REFERRAL_COMMISSION_RATE=0.10      # 10%
REFERRAL_COMMISSION_CAP=100        # RM 100
REFERRAL_CODE_SUFFIX_LENGTH=4      # Random suffix length
```

### Constants

```typescript
// src/lib/constants/referral.ts
export const REFERRAL_CONSTANTS = {
  COMMISSION_RATE: 0.1,
  COMMISSION_CAP: 100,
  REGISTRATION_EXPIRY_DAYS: 30,
  TRIP_EXPIRY_DAYS: 90,
  CODE_MIN_LENGTH: 4,
  CODE_MAX_LENGTH: 15,
  CODE_SUFFIX_LENGTH: 4, // Random suffix for uniqueness
};
```

### Referral Code Generation

Referral codes are personalized based on the captain's display name for better brand recognition and memorability.

#### Code Format

```
{CLEAN_NAME}{RANDOM_SUFFIX}

Examples:
- "Captain Ahmad"     → "AHMAD7K2X"
- "Kapten Budi"       → "BUDI9M4P"
- "Ali Fishing"       → "ALIFISHING3R5T"
- "John"              → "JOHN8N2W"
- "Mohd Razak"        → "MOHDRAZAK5K7J"
```

#### Generation Algorithm

```typescript
// src/lib/services/referral-service.ts

/**
 * Words to strip from captain names when generating referral codes
 * Case-insensitive matching
 */
const TITLE_PREFIXES_TO_STRIP = [
  "captain",
  "kapten",
  "capt",
  "cpt",
  "skipper",
  "nakhoda",
];

/**
 * Clean and normalize a captain's display name for referral code
 *
 * Rules:
 * 1. Remove common title prefixes (Captain, Kapten, etc.)
 * 2. Remove special characters and numbers
 * 3. Remove spaces (concatenate words)
 * 4. Convert to uppercase
 * 5. Limit to max 10 characters (before suffix)
 * 6. Ensure minimum 3 characters
 *
 * @param displayName - Captain's display name from profile
 * @returns Cleaned name suitable for referral code base
 */
function cleanNameForReferralCode(displayName: string): string {
  let cleaned = displayName.trim().toLowerCase();

  // Remove title prefixes
  for (const prefix of TITLE_PREFIXES_TO_STRIP) {
    // Match prefix at start of string or after space
    const regex = new RegExp(`^${prefix}\\s+|\\s+${prefix}\\s+`, "gi");
    cleaned = cleaned.replace(regex, " ");
  }

  // Remove special characters, numbers, and extra spaces
  cleaned = cleaned
    .replace(/[^a-z\s]/g, "") // Keep only letters and spaces
    .replace(/\s+/g, "") // Remove all spaces (concatenate)
    .trim();

  // Convert to uppercase
  cleaned = cleaned.toUpperCase();

  // Ensure minimum length (fallback to "REF" if too short)
  if (cleaned.length < 3) {
    cleaned = "REF";
  }

  // Limit maximum length (before suffix)
  if (cleaned.length > 10) {
    cleaned = cleaned.substring(0, 10);
  }

  return cleaned;
}

/**
 * Generate a random alphanumeric suffix
 * Uses only easily distinguishable characters (no 0/O, 1/I/L confusion)
 */
function generateRandomSuffix(length: number = 4): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // Excludes 0, 1, I, L, O
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}

/**
 * Generate a unique, personalized referral code for a captain
 *
 * @param displayName - Captain's display name
 * @param existingCodes - Set of existing codes to check uniqueness
 * @returns Unique referral code
 */
export async function generateReferralCode(
  displayName: string,
  existingCodes?: Set<string>
): Promise<string> {
  const baseName = cleanNameForReferralCode(displayName);
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    const suffix = generateRandomSuffix(4);
    code = `${baseName}${suffix}`;
    attempts++;

    // Check if code already exists
    if (existingCodes && !existingCodes.has(code)) {
      break;
    }

    // If no existing codes set provided, check database
    if (!existingCodes) {
      const existing = await prisma.referralCode.findUnique({
        where: { code },
      });
      if (!existing) break;
    }
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    // Fallback: add timestamp component
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    code = `${baseName}${timestamp}`;
  }

  return code;
}

// Example outputs:
// cleanNameForReferralCode("Captain Ahmad")      → "AHMAD"
// cleanNameForReferralCode("Kapten Budi Santoso") → "BUDISANTOS" (truncated to 10)
// cleanNameForReferralCode("capt. John")         → "JOHN"
// cleanNameForReferralCode("Ali & Sons Fishing") → "ALISONSFIS" (truncated)
// cleanNameForReferralCode("123")                → "REF" (fallback)
// cleanNameForReferralCode("Cpt Ahmad")          → "AHMAD"
//
// Full code examples:
// generateReferralCode("Captain Ahmad")          → "AHMAD7K2X"
// generateReferralCode("Kapten Budi")            → "BUDI9M4P"
```

#### Edge Cases Handling

| Input Name            | Cleaned Base | Final Code (example) |
| --------------------- | ------------ | -------------------- |
| "Captain Ahmad"       | AHMAD        | AHMAD7K2X            |
| "Kapten Budi"         | BUDI         | BUDI9M4P             |
| "Capt. Ali Fishing"   | ALIFISHING   | ALIFISHING3R         |
| "CAPTAIN RAZAK"       | RAZAK        | RAZAK5K7J            |
| "kapten john doe"     | JOHNDOE      | JOHNDOE2N8W          |
| "Cpt Ahmad"           | AHMAD        | AHMADX4R2            |
| "Skipper Bob"         | BOB          | BOB6M3Q              |
| "Ahmad123"            | AHMAD        | AHMAD8P4K            |
| "123"                 | REF          | REF7K2N              |
| ""                    | REF          | REF5M9X              |
| "A"                   | REF          | REF3N7P              |
| "Captain"             | REF          | REF2K8M              |
| "Very Long Name Here" | VERYLONGNA   | VERYLONGNA4R         |

#### Code Validation Rules

```typescript
/**
 * Validate a referral code format
 */
function isValidReferralCodeFormat(code: string): boolean {
  // Must be 7-14 characters (3-10 base + 4 suffix)
  if (code.length < 7 || code.length > 14) return false;

  // Must be uppercase alphanumeric only
  if (!/^[A-Z0-9]+$/.test(code)) return false;

  // Must end with 4 alphanumeric characters (the suffix)
  // Base name must be at least 3 characters
  return true;
}
```

---

## Open Questions

1. ~~**Minimum Charter Requirement**: Should invitor need at least one ACTIVE charter to participate?~~ **RESOLVED**: Yes, enforced. Must be CAPTAIN role with at least 1 active charter.
2. **Commission Timing**: Should commission be calculated immediately on trip completion, or after captain payout eligibility (3 business days)?
3. **Multiple Referrals**: Can one invitor refer multiple captains? (Assumed yes)
4. **Code Regeneration**: Can a captain regenerate their referral code?
5. **Leaderboard**: Should we show a public leaderboard of top referrers?
6. **Tiered Commissions**: Future consideration for higher commission rates for top referrers?

---

## Support & Resources

- **Product Owner**: [TBD]
- **Technical Lead**: [TBD]
- **Related Docs**:
  - [Captain Payout System](./CAPTAIN_PAYOUT_SYSTEM.md)
  - [Financial Calculation System](./FINANCIAL_CALCULATION_SYSTEM.md)
  - [Email Notification System](./EMAIL_NOTIFICATION_SYSTEM.md)

---

_Document Version: 1.0_  
_Created: December 2, 2025_
