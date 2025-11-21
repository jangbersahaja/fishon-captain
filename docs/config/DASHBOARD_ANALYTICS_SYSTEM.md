# Dashboard & Analytics System - Complete Guide

**Last Updated**: November 21, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Dashboard Components](#dashboard-components)
4. [Data Services](#data-services)
5. [Analytics Tracking](#analytics-tracking)
6. [API Integration](#api-integration)
7. [Configuration](#configuration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

The Dashboard & Analytics System provides captains with real-time insights into their charter business performance, including booking statistics, financial metrics, charter performance, and priority alerts.

### Key Features

- ✅ **Real-time metrics**: Live booking stats and earnings data
- ✅ **Period selection**: 7-day, 30-day, and 90-day views
- ✅ **Priority alerts**: Actionable items requiring attention
- ✅ **Charter performance**: Fleet health monitoring
- ✅ **Financial tracking**: Earnings, pending payouts, commission rates
- ✅ **Responsive design**: Mobile to desktop optimization
- ✅ **Admin override**: Staff impersonation support

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                Dashboard Architecture                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐         ┌─────────────────┐          │
│  │ Dashboard Page  │────────▶│ Data Services   │          │
│  │  (Server Side)  │         │  (Aggregation)  │          │
│  └────────┬────────┘         └────────┬────────┘          │
│           │                           │                    │
│           │                           ▼                    │
│           │                  ┌─────────────────┐           │
│           │                  │   PostgreSQL    │           │
│           │                  │  (Captain DB)   │           │
│           │                  └────────┬────────┘           │
│           │                           │                    │
│           │                           ▼                    │
│           │                  ┌─────────────────┐           │
│           │                  │   PostgreSQL    │           │
│           │                  │  (Market DB)    │           │
│           │                  └─────────────────┘           │
│           │                                                │
│           ▼                                                │
│  ┌─────────────────┐                                       │
│  │   Components    │                                       │
│  │   - Metrics     │                                       │
│  │   - Charts      │                                       │
│  │   - Alerts      │                                       │
│  └─────────────────┘                                       │
└────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **Dashboard Page**

- **Location**: `src/app/(portal)/captain/page.tsx`
- **Purpose**: Main captain landing page
- **Features**: Period selector, metrics grid, priority alerts

#### 2. **Data Services**

- **Location**: `src/lib/dashboard-service.ts`
- **Purpose**: Aggregates data from multiple sources
- **Functions**: `getDashboardData`, `getBookingStats`, `getEarningsSummary`

#### 3. **Analytics Tracking**

- **Location**: `src/lib/analytics/*.ts`
- **Purpose**: Track user interactions and feature usage
- **Integration**: Direct DB writes for privacy

---

## Dashboard Components

### 1. DashboardMetricsGrid

**Location**: `src/components/captain/dashboard/DashboardMetricsGrid.tsx`

**Purpose**: Responsive container for all dashboard metrics

**Features**:

- CSS Grid layout (1-4 columns based on screen size)
- Automatic spacing and alignment
- Consistent card styling

**Usage**:

```typescript
<DashboardMetricsGrid>
  <BookingStatsCardsCompact stats={bookingStats} />
  <EarningsOverviewCard earnings={earningsData} />
  <AnalyticsStatsCard analytics={analyticsData} />
  <CharterPerformanceCard charters={charterPerformance} />
</DashboardMetricsGrid>
```

### 2. BookingStatsCardsCompact

**Location**: `src/components/captain/dashboard/BookingStatsCardsCompact.tsx`

**Purpose**: Display booking activity metrics

**Metrics**:

1. **Requests** - New booking requests (PENDING + PAYMENT_AUTHORIZED)
2. **Upcoming** - Confirmed future trips (PAID with future dates)
3. **Completed** - Finished trips (COMPLETED status)
4. **Cancellations** - Rejected or cancelled (CANCELLED + REJECTED)

**Card Structure**:

```typescript
{
  icon: ClipboardList | Calendar | CheckCircle2 | XCircle,
  label: "Requests" | "Upcoming" | "Completed" | "Cancellations",
  value: number,
  color: "blue" | "green" | "purple" | "red",
  link: "/captain/account/bookings?status=..."
}
```

### 3. EarningsOverviewCard

**Location**: `src/components/captain/dashboard/EarningsOverviewCard.tsx`

**Purpose**: Financial snapshot with period comparison

**Data**:

- Current period earnings
- Previous period earnings
- Percentage change (with trend indicator)
- Pending payout amount
- Next payout date
- Commission rate

**Visual Elements**:

- Trend indicator (↑ increase, ↓ decrease)
- Color-coded change percentage (green positive, red negative)
- Payout countdown timer

### 4. AnalyticsStatsCard

**Location**: `src/components/captain/dashboard/AnalyticsStatsCard.tsx`

**Purpose**: Marketplace visibility metrics

**Metrics**:

- Profile views (last period)
- Charter impressions
- Booking conversion rate
- Average response time

**Source**: Direct database queries to analytics tables

### 5. CharterPerformanceCard

**Location**: `src/components/captain/dashboard/CharterPerformanceCard.tsx`

**Purpose**: Fleet health indicators

**Per-Charter Metrics**:

- Charter name and status (Active/Inactive)
- Average rating (0-5 stars)
- Total bookings
- Media count (photos + videos)
- Last updated timestamp

**Actions**:

- Quick link to charter configuration
- Edit charter button
- Status toggle

### 6. PriorityBookingsSection

**Location**: `src/components/captain/dashboard/PriorityBookingsSection.tsx`

**Purpose**: Collapsible alerts for items needing attention

**Alert Types**:

```typescript
type AlertType = 
  | "new-request"          // New booking request
  | "upcoming-trip"        // Trip starting within 24h
  | "payment-pending"      // Awaiting payment capture
  | "approval-deadline"    // Approval deadline approaching
  | "ack-deadline";        // Acknowledgment deadline approaching
```

**Urgency Levels**:

```typescript
type Urgency = "high" | "medium" | "low";

// High: <2h remaining, immediate action needed
// Medium: 2-12h remaining, action recommended
// Low: >12h remaining, informational
```

**Visual Indicators**:

- Red badge: High urgency
- Orange badge: Medium urgency
- Blue badge: Low urgency
- Countdown timer for deadlines

### 7. QuickLinksSection

**Location**: `src/components/captain/dashboard/QuickLinksSection.tsx`

**Purpose**: Fast navigation to common tasks

**Links**:

- View all bookings
- Manage charters
- Update availability
- View earnings
- Account settings

---

## Data Services

### Main Aggregation Service

**Function**: `getDashboardData(userId: string, period: Period = "30d")`

**Location**: `src/lib/dashboard-service.ts`

**Parameters**:

```typescript
type Period = "7d" | "30d" | "90d";
```

**Returns**:

```typescript
interface DashboardData {
  profile: CaptainProfile | null;
  bookingStats: BookingStats;
  earningsData: EarningsData;
  charterPerformance: CharterPerformance[];
  priorityBookings: PriorityBooking[];
  analyticsData?: AnalyticsData;
}
```

**Implementation**:

```typescript
export async function getDashboardData(
  userId: string,
  period: Period = "30d"
): Promise<DashboardData> {
  // 1. Get captain profile
  const profile = await getCaptainProfile(userId);
  
  // 2. Calculate period dates
  const { startDate, endDate, previousStartDate, previousEndDate } = 
    calculatePeriodDates(period);
  
  // 3. Aggregate booking stats
  const bookingStats = await getBookingStats(
    userId,
    startDate,
    endDate
  );
  
  // 4. Calculate earnings
  const earningsData = await getEarningsSummary(
    userId,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate
  );
  
  // 5. Get charter performance
  const charterPerformance = await getCharterPerformance(userId);
  
  // 6. Get priority bookings
  const priorityBookings = await getPriorityBookings(userId);
  
  return {
    profile,
    bookingStats,
    earningsData,
    charterPerformance,
    priorityBookings,
  };
}
```

### Booking Stats Service

**Function**: `getBookingStats(userId, startDate, endDate)`

**Queries**:

```typescript
// 1. Count requests (PENDING + PAYMENT_AUTHORIZED)
const requests = await prisma.booking.count({
  where: {
    charter: { userId },
    status: { in: ["PENDING", "PAYMENT_AUTHORIZED"] },
    createdAt: { gte: startDate, lte: endDate },
  },
});

// 2. Count upcoming (PAID + future date)
const upcoming = await prisma.booking.count({
  where: {
    charter: { userId },
    status: "PAID",
    date: { gte: new Date() },
  },
});

// 3. Count completed
const completed = await prisma.booking.count({
  where: {
    charter: { userId },
    status: "COMPLETED",
    date: { gte: startDate, lte: endDate },
  },
});

// 4. Count cancellations
const cancellations = await prisma.booking.count({
  where: {
    charter: { userId },
    status: { in: ["CANCELLED", "REJECTED"] },
    updatedAt: { gte: startDate, lte: endDate },
  },
});

// 5. Sum total value
const totalValue = await prisma.booking.aggregate({
  where: {
    charter: { userId },
    status: { in: ["PAID", "COMPLETED"] },
    date: { gte: startDate, lte: endDate },
  },
  _sum: { finalPrice: true },
});
```

### Earnings Service

**Function**: `getEarningsSummary(userId, startDate, endDate, prevStart, prevEnd)`

**Calculations**:

```typescript
// Current period earnings
const currentEarnings = await prisma.booking.aggregate({
  where: {
    charter: { userId },
    status: { in: ["PAID", "COMPLETED"] },
    paymentCapturedAt: { gte: startDate, lte: endDate },
  },
  _sum: { finalPrice: true },
});

// Previous period earnings
const previousEarnings = await prisma.booking.aggregate({
  where: {
    charter: { userId },
    status: { in: ["PAID", "COMPLETED"] },
    paymentCapturedAt: { gte: prevStart, lte: prevEnd },
  },
  _sum: { finalPrice: true },
});

// Calculate percentage change
const percentChange = 
  ((currentEarnings - previousEarnings) / previousEarnings) * 100;

// Get pending payout
const pending = await prisma.booking.aggregate({
  where: {
    charter: { userId },
    status: { in: ["PAID", "COMPLETED"] },
    payoutStatus: "PENDING",
  },
  _sum: { finalPrice: true },
});

// Get commission rate from profile
const commissionRate = profile?.commissionRate || 0.08;
```

### Priority Bookings Service

**Function**: `getPriorityBookings(userId)`

**Logic**:

```typescript
export async function getPriorityBookings(
  userId: string
): Promise<PriorityBooking[]> {
  const priorities: PriorityBooking[] = [];
  
  // 1. New requests (PENDING or PAYMENT_AUTHORIZED)
  const newRequests = await prisma.booking.findMany({
    where: {
      charter: { userId },
      status: { in: ["PENDING", "PAYMENT_AUTHORIZED"] },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  
  newRequests.forEach(booking => {
    const timeLeft = booking.expiresAt.getTime() - Date.now();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    priorities.push({
      id: booking.id,
      type: "new-request",
      urgency: hoursLeft < 2 ? "high" : hoursLeft < 12 ? "medium" : "low",
      booking,
      action: booking.bookingFlowType === "MANUAL" ? "Approve/Reject" : "Acknowledge",
      countdown: formatCountdown(timeLeft),
    });
  });
  
  // 2. Upcoming trips (within 24h)
  const upcomingTrips = await prisma.booking.findMany({
    where: {
      charter: { userId },
      status: "PAID",
      date: {
        gte: new Date(),
        lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "asc" },
  });
  
  upcomingTrips.forEach(booking => {
    const timeToTrip = booking.date.getTime() - Date.now();
    const hoursToTrip = timeToTrip / (1000 * 60 * 60);
    
    priorities.push({
      id: booking.id,
      type: "upcoming-trip",
      urgency: hoursToTrip < 4 ? "high" : hoursToTrip < 12 ? "medium" : "low",
      booking,
      action: "Prepare for trip",
      countdown: formatCountdown(timeToTrip),
    });
  });
  
  // 3. Payment pending (AWAITING_PAYMENT)
  const paymentPending = await prisma.booking.findMany({
    where: {
      charter: { userId },
      status: "AWAITING_PAYMENT",
    },
    orderBy: { expiresAt: "asc" },
  });
  
  paymentPending.forEach(booking => {
    const timeLeft = booking.expiresAt.getTime() - Date.now();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    priorities.push({
      id: booking.id,
      type: "payment-pending",
      urgency: hoursLeft < 6 ? "high" : hoursLeft < 24 ? "medium" : "low",
      booking,
      action: "Awaiting payment",
      countdown: formatCountdown(timeLeft),
    });
  });
  
  // Sort by urgency then time
  return priorities.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}
```

---

## Analytics Tracking

### Direct Database Analytics

**Strategy**: Privacy-first analytics stored in PostgreSQL (no third-party tracking)

**Tables**:

```prisma
model AnalyticsEvent {
  id         String   @id @default(cuid())
  userId     String?
  sessionId  String
  eventType  String   // "page_view", "charter_view", "booking_click"
  eventData  Json?    // Additional event metadata
  userAgent  String?
  ipAddress  String?
  createdAt  DateTime @default(now())
  
  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
}

model CharterAnalytics {
  id              String   @id @default(cuid())
  charterId       String
  date            DateTime
  views           Int      @default(0)
  clicks          Int      @default(0)
  bookingRequests Int      @default(0)
  conversions     Int      @default(0)
  
  @@unique([charterId, date])
  @@index([charterId])
}
```

### Tracking Implementation

**Page View Tracking**:

```typescript
// src/lib/analytics/track.ts

export async function trackPageView(params: {
  userId?: string;
  path: string;
  referrer?: string;
}) {
  await prisma.analyticsEvent.create({
    data: {
      userId: params.userId,
      sessionId: getSessionId(),
      eventType: "page_view",
      eventData: {
        path: params.path,
        referrer: params.referrer,
      },
    },
  });
}
```

**Charter View Tracking**:

```typescript
export async function trackCharterView(charterId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await prisma.charterAnalytics.upsert({
    where: {
      charterId_date: {
        charterId,
        date: today,
      },
    },
    update: {
      views: { increment: 1 },
    },
    create: {
      charterId,
      date: today,
      views: 1,
    },
  });
}
```

### Analytics Query Service

**Function**: `getAnalyticsData(userId, period)`

```typescript
export async function getAnalyticsData(
  userId: string,
  period: Period
): Promise<AnalyticsData> {
  const { startDate, endDate } = calculatePeriodDates(period);
  
  // Get captain's charter IDs
  const charters = await prisma.charter.findMany({
    where: { userId },
    select: { id: true },
  });
  const charterIds = charters.map(c => c.id);
  
  // Aggregate charter analytics
  const analytics = await prisma.charterAnalytics.aggregate({
    where: {
      charterId: { in: charterIds },
      date: { gte: startDate, lte: endDate },
    },
    _sum: {
      views: true,
      clicks: true,
      bookingRequests: true,
      conversions: true,
    },
  });
  
  // Calculate conversion rate
  const conversionRate = 
    analytics._sum.bookingRequests > 0
      ? (analytics._sum.conversions / analytics._sum.bookingRequests) * 100
      : 0;
  
  return {
    views: analytics._sum.views || 0,
    clicks: analytics._sum.clicks || 0,
    bookingRequests: analytics._sum.bookingRequests || 0,
    conversions: analytics._sum.conversions || 0,
    conversionRate,
  };
}
```

---

## API Integration

### Dashboard Data API

**Endpoint**: `GET /api/captain/dashboard`

**Authentication**: Required (session)

**Query Parameters**:

```typescript
{
  period?: "7d" | "30d" | "90d",  // Default: "30d"
  adminUserId?: string             // Admin override
}
```

**Response**:

```json
{
  "profile": {
    "id": "profile_123",
    "displayName": "Captain John",
    "commissionRate": 0.08
  },
  "bookingStats": {
    "requests": 5,
    "upcoming": 12,
    "completed": 45,
    "cancellations": 3,
    "totalValue": 25000
  },
  "earningsData": {
    "currentPeriod": 18000,
    "previousPeriod": 15000,
    "percentChange": 20,
    "pending": 5000,
    "nextPayoutDate": "2025-12-15T00:00:00Z",
    "commissionRate": 0.08
  },
  "charterPerformance": [...],
  "priorityBookings": [...]
}
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
MARKET_DATABASE_URL="postgresql://..." # Read-only for booking data

# Analytics
ANALYTICS_ENABLED="true"
ANALYTICS_RETENTION_DAYS="90"

# Feature Flags
NEXT_PUBLIC_DASHBOARD_PERIOD_SELECTOR="true"
NEXT_PUBLIC_DASHBOARD_ANALYTICS_CARD="true"
```

### Dashboard Settings

**Per-Captain Configuration**:

```typescript
interface DashboardSettings {
  defaultPeriod: Period;              // "7d" | "30d" | "90d"
  showAnalytics: boolean;             // Display analytics card
  priorityAlertsExpanded: boolean;    // Priority section default state
  metricsLayout: "grid" | "list";     // Display layout
}
```

---

## Testing

### Unit Tests

**Location**: `src/lib/__tests__/dashboard-service.test.ts`

**Coverage**:

- Data aggregation functions
- Period calculations
- Earnings calculations
- Priority booking logic

**Run Tests**:

```bash
npm test -- dashboard-service
```

### Component Tests

**Location**: `src/components/captain/dashboard/__tests__/`

**Coverage**:

- Component rendering
- Data binding
- User interactions
- Responsive behavior

### Integration Tests

**Scenarios**:

1. **Full dashboard load**:
   - [ ] All metrics display correctly
   - [ ] Period selector works
   - [ ] Priority alerts appear
   - [ ] Links navigate properly

2. **Data refresh**:
   - [ ] Period change updates data
   - [ ] Real-time updates (booking created)
   - [ ] Loading states display

3. **Admin override**:
   - [ ] Staff can view captain dashboards
   - [ ] Override parameter works
   - [ ] Proper permissions enforced

---

## Troubleshooting

### Dashboard Not Loading

**Check**:

1. Database connections (captain + market)
2. User session validity
3. Captain profile exists
4. Network logs

**Solution**:

```bash
# Check databases
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\""
psql $MARKET_DATABASE_URL -c "SELECT COUNT(*) FROM \"Booking\""

# Check session
grep "session" logs/app.log | tail -10

# Verify captain profile
SELECT * FROM "CaptainProfile" WHERE "userId" = 'user-id';
```

### Incorrect Metrics

**Check**:

1. Period calculation logic
2. Booking status filters
3. Date ranges
4. Time zone handling

**Solution**:

```typescript
// Debug period dates
console.log("Period:", period);
console.log("Start:", startDate);
console.log("End:", endDate);

// Verify booking counts
const debug = await prisma.booking.findMany({
  where: {
    charter: { userId },
    createdAt: { gte: startDate, lte: endDate },
  },
  select: { id: true, status: true, createdAt: true },
});
console.log("Bookings:", debug);
```

---

## Quick Reference

### Common Queries

```sql
-- Dashboard metrics for captain
SELECT 
  COUNT(*) FILTER (WHERE status IN ('PENDING', 'PAYMENT_AUTHORIZED')) as requests,
  COUNT(*) FILTER (WHERE status = 'PAID' AND date > NOW()) as upcoming,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
  SUM("finalPrice") FILTER (WHERE status IN ('PAID', 'COMPLETED')) as total_value
FROM "Booking" b
JOIN "Charter" c ON b."charterId" = c.id
WHERE c."userId" = 'user-id'
  AND b."createdAt" >= NOW() - INTERVAL '30 days';

-- Priority bookings
SELECT id, status, date, "expiresAt"
FROM "Booking" b
JOIN "Charter" c ON b."charterId" = c.id
WHERE c."userId" = 'user-id'
  AND status IN ('PENDING', 'PAYMENT_AUTHORIZED', 'AWAITING_PAYMENT')
ORDER BY "expiresAt" ASC;
```

---

## Related Documentation

- **Booking System**: `docs/config/BOOKING_SYSTEM.md`
- **Charter Configuration**: `docs/config/CHARTER_REGISTRATION_SYSTEM.md`
- **Email Notifications**: `docs/config/EMAIL_NOTIFICATION_SYSTEM.md`

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
