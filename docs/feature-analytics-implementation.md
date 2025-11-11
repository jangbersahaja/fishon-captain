---
type: feature
status: in-progress
updated: 2025-11-06
feature: Captain Analytics Page
author: system
---

# Captain Analytics Implementation

## Overview

Build a comprehensive analytics page for captains to track charter performance, profile engagement, and booking metrics.

## Metrics to Track

### 1. Profile & Charter Views

- **Profile Views**: Total views of captain's public profile
- **Charter Detail Views**: Views per charter listing
- **Unique Visitors**: Distinct users viewing charters
- **Return Visitors**: Users viewing multiple times

### 2. Engagement Metrics

- **Click-Through Rate**: Profile view → Charter detail view
- **Inquiry Rate**: Charter views → Contact/inquiry
- **Booking Conversion**: Views → Booking requests → Confirmed bookings
- **Photo/Video Views**: Media engagement

### 3. Response Metrics

- **Average Response Time**: Time to respond to booking requests
- **Response Rate**: % of booking requests responded to
- **Approval Rate**: % of requests approved vs rejected

### 4. Performance Over Time

- **Daily Views Trend**: Last 30 days
- **Weekly Booking Trend**: Last 12 weeks
- **Monthly Revenue**: Last 6 months (when payment system ready)
- **Peak Hours**: When most views occur

### 5. Referral Sources

- **Direct Traffic**: Direct URL access
- **Search**: From search results
- **Social**: From social media
- **Other**: External referrals

### 6. Booking Analytics

- **Total Bookings**: All time, this month, this week
- **Booking Value**: Average, total, highest
- **Popular Trips**: Most booked trip types
- **Popular Dates**: Most requested dates

### 7. Review Analytics

- **Average Rating**: Overall and per charter
- **Rating Trend**: Change over time
- **Badge Distribution**: Most earned badges
- **Review Response Rate**: % of reviews replied to

---

## Database Schema

### AnalyticsEvent Model

```prisma
model AnalyticsEvent {
  id            String   @id @default(cuid())
  eventType     AnalyticsEventType

  // Charter/Captain context
  charterId     String?
  captainId     String?

  // User context (angler viewing)
  userId        String?
  sessionId     String?  // For anonymous tracking

  // Event metadata
  metadata      Json?    // Flexible for event-specific data

  // Referral tracking
  referrer      String?
  source        String?  // 'search', 'direct', 'social', etc.

  // Technical details
  userAgent     String?
  ipAddress     String?

  // Timestamps
  createdAt     DateTime @default(now())

  // Relations
  charter       Charter? @relation(fields: [charterId], references: [id])
  captain       CaptainProfile? @relation(fields: [captainId], references: [id])

  @@index([charterId, createdAt])
  @@index([captainId, createdAt])
  @@index([eventType, createdAt])
  @@index([sessionId, createdAt])
}

enum AnalyticsEventType {
  PROFILE_VIEW          // Captain profile page view
  CHARTER_VIEW          // Charter detail page view
  CHARTER_SEARCH        // Charter appeared in search
  PHOTO_VIEW            // Photo clicked/viewed
  VIDEO_VIEW            // Video played
  CONTACT_CLICK         // Contact button clicked
  BOOKING_STARTED       // Booking form opened
  BOOKING_SUBMITTED     // Booking request sent
  REVIEW_VIEW           // Review section viewed
  SHARE_CLICKED         // Share button clicked
}
```

### Analytics Aggregation (Optional - for performance)

```prisma
model AnalyticsSummary {
  id           String   @id @default(cuid())
  captainId    String
  charterId    String?
  date         DateTime // Date for daily rollup

  // Aggregated metrics
  profileViews      Int @default(0)
  charterViews      Int @default(0)
  uniqueVisitors    Int @default(0)
  bookingStarts     Int @default(0)
  bookingSubmits    Int @default(0)
  contactClicks     Int @default(0)

  captain      CaptainProfile @relation(fields: [captainId], references: [id])
  charter      Charter? @relation(fields: [charterId], references: [id])

  @@unique([captainId, charterId, date])
  @@index([date])
}
```

---

## API Endpoints

### 1. Track Event (Public)

**POST** `/api/analytics/track`

```typescript
// Request body
{
  eventType: 'CHARTER_VIEW',
  charterId: 'charter_123',
  sessionId: 'session_abc',
  referrer: 'https://google.com',
  source: 'search'
}

// Response
{
  success: true
}
```

**Security**:

- Rate limit: 100 requests/minute per IP
- No authentication required (public tracking)
- Validate charterId exists

---

### 2. Get Captain Analytics (Private)

**GET** `/api/captain/analytics`

```typescript
// Query params
?period=30d  // 7d, 30d, 90d, 1y
&charterId=charter_123  // Optional, filter by charter

// Response
{
  summary: {
    totalViews: 1234,
    uniqueVisitors: 567,
    bookingConversion: 0.23,
    avgResponseTime: 2.5  // hours
  },
  timeSeries: [
    { date: '2025-11-01', views: 45, bookings: 2 },
    { date: '2025-11-02', views: 52, bookings: 1 },
    // ...
  ],
  topCharters: [
    { charterId: 'x', name: 'Deep Sea', views: 456, bookings: 12 },
    // ...
  ],
  referralSources: {
    search: 0.65,
    direct: 0.25,
    social: 0.10
  }
}
```

**Security**:

- Requires authentication
- Captain can only view own analytics
- Staff/Admin can view any captain's analytics

---

### 3. Get Charter Analytics (Private)

**GET** `/api/captain/analytics/charter/:charterId`

```typescript
// Response
{
  charter: { id: 'x', name: 'Deep Sea Adventure' },
  views: {
    total: 456,
    last30Days: 234,
    trend: '+12%'
  },
  engagement: {
    photoViews: 123,
    videoViews: 45,
    avgTimeOnPage: 3.5  // minutes
  },
  bookings: {
    total: 12,
    conversionRate: 0.026,
    avgValue: 450
  }
}
```

---

## Analytics Service

### File: `src/lib/analytics-service.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { AnalyticsEventType } from "@prisma/client";

interface TrackEventParams {
  eventType: AnalyticsEventType;
  charterId?: string;
  captainId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  referrer?: string;
  source?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function trackEvent(params: TrackEventParams) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: params.eventType,
        charterId: params.charterId,
        captainId: params.captainId,
        userId: params.userId,
        sessionId: params.sessionId,
        metadata: params.metadata,
        referrer: params.referrer,
        source: params.source,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Log error but don't throw - analytics shouldn't break main flow
    console.error("Analytics tracking error:", error);
  }
}

export async function getCaptainAnalytics(
  captainId: string,
  period: string = "30d"
) {
  const daysMap: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const days = daysMap[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get events for period
  const events = await prisma.analyticsEvent.findMany({
    where: {
      captainId,
      createdAt: { gte: startDate },
    },
    select: {
      eventType: true,
      charterId: true,
      sessionId: true,
      createdAt: true,
      source: true,
    },
  });

  // Aggregate metrics
  const totalViews = events.filter(
    (e) => e.eventType === "CHARTER_VIEW" || e.eventType === "PROFILE_VIEW"
  ).length;

  const uniqueVisitors = new Set(events.map((e) => e.sessionId).filter(Boolean))
    .size;

  const bookingStarts = events.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;

  const bookingSubmits = events.filter(
    (e) => e.eventType === "BOOKING_SUBMITTED"
  ).length;

  const conversionRate = totalViews > 0 ? bookingSubmits / totalViews : 0;

  // Group by date for time series
  const dateGroups = events.reduce(
    (acc, event) => {
      const date = event.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { views: 0, bookings: 0 };
      }
      if (
        event.eventType === "CHARTER_VIEW" ||
        event.eventType === "PROFILE_VIEW"
      ) {
        acc[date].views++;
      }
      if (event.eventType === "BOOKING_SUBMITTED") {
        acc[date].bookings++;
      }
      return acc;
    },
    {} as Record<string, { views: number; bookings: number }>
  );

  const timeSeries = Object.entries(dateGroups)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Referral sources
  const sources = events.reduce(
    (acc, event) => {
      const source = event.source || "direct";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalSources = Object.values(sources).reduce((a, b) => a + b, 0);
  const referralSources = Object.fromEntries(
    Object.entries(sources).map(([source, count]) => [
      source,
      totalSources > 0 ? count / totalSources : 0,
    ])
  );

  return {
    summary: {
      totalViews,
      uniqueVisitors,
      bookingConversion: conversionRate,
      bookingStarts,
      bookingSubmits,
    },
    timeSeries,
    referralSources,
  };
}
```

---

## UI Components

### 1. Stats Cards

**File**: `src/components/captain/analytics/AnalyticsStatsCards.tsx`

Shows key metrics:

- Total Views
- Unique Visitors
- Booking Conversion
- Avg Response Time

---

### 2. Views Chart

**File**: `src/components/captain/analytics/ViewsChart.tsx`

Line chart showing views over time (last 30 days)

---

### 3. Conversion Funnel

**File**: `src/components/captain/analytics/ConversionFunnel.tsx`

Visual funnel:

1. Profile Views
2. Charter Detail Views
3. Booking Started
4. Booking Submitted
5. Booking Confirmed

---

### 4. Referral Sources Chart

**File**: `src/components/captain/analytics/ReferralSourcesChart.tsx`

Pie/donut chart showing traffic sources

---

### 5. Top Performing Charters

**File**: `src/components/captain/analytics/TopChartersTable.tsx`

Table with charter performance comparison

---

## Page Layout

### `/captain/analytics`

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ Analytics                                                   │
│ Track your charter performance and engagement              │
│                                                             │
│ [Period Selector: 7d | 30d | 90d | 1y]                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ STATS CARDS                                                │
│ Total Views  │ Unique      │ Conversion  │ Response      │
│ 1,234        │ Visitors    │ Rate        │ Time          │
│ +12% ↑       │ 567         │ 23%         │ 2.5 hrs       │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VIEWS OVER TIME (Line Chart)                               │
│ Last 30 days                                                │
│                                                             │
│ [Line chart showing daily views]                            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ CONVERSION FUNNEL        │ REFERRAL SOURCES                 │
│                          │                                  │
│ 1. Views: 1,234          │ [Pie Chart]                      │
│ 2. Details: 456 (37%)    │ Search: 65%                      │
│ 3. Started: 89 (19%)     │ Direct: 25%                      │
│ 4. Submitted: 34 (38%)   │ Social: 10%                      │
│ 5. Confirmed: 28 (82%)   │                                  │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TOP PERFORMING CHARTERS                                     │
│                                                             │
│ Charter Name         | Views | Bookings | Conversion       │
│ Deep Sea Adventure   | 456   | 12       | 2.6%             │
│ River Fishing        | 234   | 8        | 3.4%             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RESPONSE METRICS                                            │
│                                                             │
│ Average Response Time: 2.5 hours                            │
│ Response Rate: 98%                                          │
│ Approval Rate: 75%                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Database Schema ✅

- [ ] Add `AnalyticsEvent` model to Prisma schema
- [ ] Add `AnalyticsEventType` enum
- [ ] Create and run migration
- [ ] Generate Prisma client

### Step 2: Analytics Service ✅

- [ ] Create `src/lib/analytics-service.ts`
- [ ] Implement `trackEvent()` function
- [ ] Implement `getCaptainAnalytics()` function
- [ ] Add error handling and logging

### Step 3: API Routes ✅

- [ ] Create `/api/analytics/track` (public)
- [ ] Create `/api/captain/analytics` (private)
- [ ] Add rate limiting
- [ ] Add authentication checks

### Step 4: fishon-market Integration ✅

- [ ] Add tracking to charter detail pages
- [ ] Add tracking to search results
- [ ] Add tracking to profile pages
- [ ] Generate unique sessionId for anonymous users

### Step 5: UI Components ✅

- [ ] Build `AnalyticsStatsCards`
- [ ] Build `ViewsChart` (use recharts or similar)
- [ ] Build `ConversionFunnel`
- [ ] Build `ReferralSourcesChart`
- [ ] Build `TopChartersTable`

### Step 6: Analytics Page ✅

- [ ] Build main analytics page
- [ ] Add period selector
- [ ] Integrate all components
- [ ] Add loading states
- [ ] Add empty states

### Step 7: Testing ✅

- [ ] Test event tracking
- [ ] Test analytics calculations
- [ ] Test date filtering
- [ ] Test multi-charter scenarios
- [ ] Test mobile responsiveness

---

## Privacy & Security

### Data Collection

- **No PII**: Don't store names, emails, or personal data in analytics
- **IP Hashing**: Hash IP addresses before storing
- **Session IDs**: Generate client-side, don't track across devices
- **Retention**: Delete events older than 1 year

### Security Measures

- Rate limiting on public tracking endpoint
- Authentication required for viewing analytics
- Captain can only view own data (except admin)
- Input validation on all parameters

---

## Performance Considerations

### Optimization Strategies

1. **Async Tracking**: Don't block requests waiting for analytics
2. **Batch Inserts**: Queue events and insert in batches
3. **Aggregation**: Pre-calculate daily summaries
4. **Indexing**: Proper database indexes on common queries
5. **Caching**: Cache analytics results for 5-10 minutes

### Database Indexes

```sql
CREATE INDEX idx_analytics_captain_date ON "AnalyticsEvent"("captainId", "createdAt");
CREATE INDEX idx_analytics_charter_date ON "AnalyticsEvent"("charterId", "createdAt");
CREATE INDEX idx_analytics_type_date ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX idx_analytics_session ON "AnalyticsEvent"("sessionId", "createdAt");
```

---

## Future Enhancements

### Phase 2 Features

- [ ] Real-time analytics dashboard
- [ ] Email reports (weekly/monthly summaries)
- [ ] Comparison view (this period vs last period)
- [ ] Export analytics data (CSV/PDF)
- [ ] Custom date ranges
- [ ] Goal tracking (set targets)

### Phase 3 Features

- [ ] A/B testing support
- [ ] Predictive analytics
- [ ] Competitor benchmarking
- [ ] Revenue forecasting
- [ ] Heatmaps (where users click)

---

## Dependencies

### NPM Packages

```json
{
  "recharts": "^2.x", // For charts
  "date-fns": "^3.x" // For date manipulation
}
```

### Existing Systems

- Prisma ORM
- NextAuth (for authentication)
- Rate limiter (existing)

---

## Testing Strategy

### Unit Tests

- Analytics service calculations
- Date range filtering
- Conversion rate calculations

### Integration Tests

- API endpoint responses
- Database queries
- Auth protection

### E2E Tests

- Track event from fishon-market → appears in analytics
- Period selector changes data
- Multi-charter filtering

---

## Success Metrics

### Adoption

- ✅ 80% of captains view analytics weekly
- ✅ Average session time > 2 minutes

### Accuracy

- ✅ 99% event tracking success rate
- ✅ <1% data discrepancy in aggregations

### Performance

- ✅ Page load < 2 seconds
- ✅ Chart rendering < 500ms
- ✅ API response < 1 second

---

**Status**: Ready to implement
**Next Step**: Add AnalyticsEvent model to Prisma schema
