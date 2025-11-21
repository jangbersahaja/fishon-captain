# Dashboard Service - Quick Reference

## Overview

The dashboard service provides complete data aggregation for the captain portal dashboard. It combines booking statistics, financial metrics, charter performance, and priority bookings into a single data object.

## Basic Usage

```typescript
import { getDashboardData } from "@/lib/dashboard-service";

// Get dashboard data for current captain, last 30 days
const dashboard = await getDashboardData(userId);

// Get data for specific period (7d, 30d, 90d)
const dashboard30d = await getDashboardData(userId, "30d");
const dashboard7d = await getDashboardData(userId, "7d");
const dashboard90d = await getDashboardData(userId, "90d");

// Get all periods at once for comparison
const allPeriods = await getDashboardDataAllPeriods(userId);
```

## Data Structure

```typescript
interface DashboardData {
  profile: CaptainProfile | null;
  bookingStats: {
    requests: number; // PENDING + PAYMENT_AUTHORIZED
    upcoming: number; // PAID with future dates
    completed: number; // COMPLETED status
    cancellations: number; // CANCELLED + REJECTED
    totalValue: number; // Sum of finalPrice
  };
  earningsData: {
    currentPeriod: number; // Earnings this period
    previousPeriod: number; // Earnings previous period
    percentChange: number; // % change from previous
    pending: number; // Pending payout
    nextPayoutDate: Date | null;
    commissionRate: number; // 0.05/0.08/0.1 based on plan
  };
  charterPerformance: [
    {
      id: string;
      name: string;
      isActive: boolean;
      rating: number | null;
      bookingCount: number;
      mediaCount: number;
      lastUpdated: Date;
    },
  ];
  priorityBookings: [
    {
      id: string;
      type: "new-request" | "upcoming-trip" | "payment-pending";
      urgency: "high" | "medium" | "low";
      booking: EnrichedMarketBooking;
      action: string;
      countdown?: string;
    },
  ];
}
```

## Component Integration Example

```typescript
// Page component
import { getDashboardData } from '@/lib/dashboard-service';
import { useSession } from 'next-auth/react';

export default async function DashboardPage() {
  const session = await getServerSession();
  const dashboard = await getDashboardData(session?.user?.id!, '30d');

  return (
    <div>
      <h1>Welcome {dashboard.profile?.displayName}</h1>

      {/* Booking Stats Card */}
      <BookingStatsCard stats={dashboard.bookingStats} />

      {/* Earnings Card */}
      <EarningsCard earnings={dashboard.earningsData} />

      {/* Priority Bookings */}
      <PriorityBookings bookings={dashboard.priorityBookings} />

      {/* Charter Performance */}
      <CharterPerformanceTable charters={dashboard.charterPerformance} />
    </div>
  );
}
```

## Individual Services

If you need only specific data, use individual services:

```typescript
// Booking stats only
import { getBookingStats } from "@/lib/services/booking-stats";
const stats = await getBookingStats(userId, "30d");

// Earnings only
import { getEarningsSummary } from "@/lib/services/finance-service";
const earnings = await getEarningsSummary(userId, "30d");

// Charter performance only
import { getCharterPerformance } from "@/lib/charter-service";
const charters = await getCharterPerformance(userId);

// Priority bookings only
import { getCaptainBookings } from "@/lib/booking-service";
import { getPriorityBookings } from "@/lib/booking-priority";
const allBookings = await getCaptainBookings([charterIds]);
const priorities = getPriorityBookings(allBookings);
```

## Period Explained

- **7d**: Last 7 calendar days
  - Use for: Weekly performance review
  - Start: 7 days ago at 00:00:00
  - End: Today at 23:59:59

- **30d**: Last 30 calendar days (default)
  - Use for: Monthly overview
  - Start: 30 days ago at 00:00:00
  - End: Today at 23:59:59

- **90d**: Last 90 calendar days
  - Use for: Quarterly trends
  - Start: 90 days ago at 00:00:00
  - End: Today at 23:59:59

## Commission Rates

Commission rates are determined by charter pricing plan:

```typescript
const plan = charter.pricingPlan;
const commission =
  plan === "GOLD"
    ? 0.05 // 5%
    : plan === "SILVER"
      ? 0.08 // 8%
      : 0.1; // 10% (BASIC)

// If captain has multiple charters, uses lowest rate
```

## Key Metrics Explained

### Booking Stats

- **Requests**: Bookings awaiting captain action
  - Includes: PENDING (manual flow), PAYMENT_AUTHORIZED (auto flow)
  - Requires: Captain to approve/acknowledge

- **Upcoming**: Confirmed trips happening soon
  - Includes: PAID bookings with date <= 30 days from now
  - Requires: Captain to prepare

- **Completed**: Finished bookings
  - Includes: COMPLETED status only
  - Period: Within selected period

- **Cancellations**: Cancelled or rejected bookings
  - Includes: CANCELLED + REJECTED status
  - Period: Within selected period

- **Total Value**: Sum of confirmed booking revenue
  - Includes: finalPrice from PAID bookings only
  - Period: Within selected period

### Earnings Data

- **Current Period**: Captain earnings in selected period
  - Calculated from: captainEarnings field of PAID bookings
  - Period: Last N days (7/30/90)

- **Previous Period**: Captain earnings in matching previous period
  - Calculated from: Equal duration, ending day before current starts
  - Used for: Trend analysis

- **Percent Change**: Growth from previous to current
  - Formula: ((current - previous) / previous) \* 100
  - Special case: If previous = 0 and current > 0, shows 100%

- **Pending**: Earnings awaiting payout
  - Calculated from: captainEarnings with payoutStatus = PENDING
  - Used for: Cash flow forecasting

- **Next Payout Date**: Estimated payout date
  - Default: 1st of next month
  - Only if: pending > 0

- **Commission Rate**: Captain's fee percentage
  - Based on: Lowest pricing plan of all charters
  - Used for: Financial transparency

### Charter Performance

- **Rating**: Average rating from reviews
  - Type: Decimal (e.g., 4.5)
  - Null if: No reviews yet

- **Booking Count**: Total confirmed bookings
  - Includes: PAID + COMPLETED status
  - Used for: Popularity metric

- **Media Count**: Total photos/videos
  - Includes: All CharterMedia items
  - Used for: Content completeness

---

## Error Handling

All services handle errors gracefully:

```typescript
try {
  const dashboard = await getDashboardData(userId, '30d');

  if (!dashboard.profile) {
    // Captain profile not set up yet
    return <SetupRequired />;
  }

  if (dashboard.bookingStats.requests === 0) {
    // No pending bookings
    return <NoBookings />;
  }
} catch (error) {
  console.error('Dashboard error:', error);
  return <ErrorFallback />;
}
```

---

## Performance Notes

- All database queries run in parallel where possible
- Character IDs fetched once, reused for all queries
- Results are not cached (always fresh data)
- For real-time updates, use React Query with appropriate stale times

---

## Exports

```typescript
// Main function
export async function getDashboardData(
  userId: string,
  period?: DashboardPeriod
): Promise<DashboardData>

// All-periods function
export async function getDashboardDataAllPeriods(
  userId: string
): Promise<Record<DashboardPeriod, DashboardData>>

// Types
export type DashboardPeriod = '7d' | '30d' | '90d'
export interface DashboardData { ... }
```

---

## Testing

All services have comprehensive test coverage. To run tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/__tests__/dashboard-service.test.ts

# Run with coverage
npm test -- --coverage
```
