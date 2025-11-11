# Analytics Implementation - Direct DB vs API

## Overview

The analytics system in fishon-captain now supports **two data fetching strategies**:

1. **Direct Database Access** (Primary, Recommended)
2. **API Access** (Fallback)

This gives you the best of both worlds: performance and reliability.

## Architecture

### Direct DB Access (Primary)

**File**: `src/lib/analytics-service.ts`

The analytics service connects directly to the fishon-market PostgreSQL database using Prisma Client. This provides:

✅ **Performance Benefits**:

- No HTTP overhead
- Native PostgreSQL aggregations
- Faster query execution
- Efficient JOIN operations

✅ **Development Benefits**:

- Type-safe with Prisma
- Full SQL query control
- Better debugging with Prisma Studio
- Consistent with existing pattern (bookings service)

✅ **Operational Benefits**:

- No rate limiting concerns
- Lower latency
- Reduced network hops
- Direct access to raw data

### API Access (Fallback)

**File**: `src/lib/analytics-api.ts`

When direct DB access fails or is disabled, the system automatically falls back to the REST API:

- Endpoint: `/api/captain/analytics`
- Authentication: API key via `x-api-key` header
- Rate limit: 100 requests/min per IP
- Caching: `cache: 'no-store'` for fresh data

## Configuration

### Environment Variables

```bash
# fishon-captain/.env

# Enable direct DB access (recommended)
USE_ANALYTICS_DB=1

# Market database connection
MARKET_DATABASE_URL="postgresql://user:password@host:5432/fishon_market"

# API fallback (when USE_ANALYTICS_DB=0 or DB connection fails)
NEXT_PUBLIC_FISHON_MARKET_URL="http://localhost:3001"  # dev
# NEXT_PUBLIC_FISHON_MARKET_URL="https://fishon.my"    # prod

FISHON_MARKET_API_KEY="your-secret-api-key-here"
```

### Strategy Selection

The system automatically chooses the strategy based on `USE_ANALYTICS_DB`:

```typescript
// USE_ANALYTICS_DB=1 → Direct DB (with API fallback on error)
// USE_ANALYTICS_DB=0 → API only

if (USE_ANALYTICS_DB) {
  try {
    return await getCaptainAnalyticsFromDB(captainId, period);
  } catch (error) {
    console.error("[Analytics] Direct DB failed, falling back to API:", error);
    return await analyticsApi.getCaptainAnalytics(captainId, period);
  }
}

return await analyticsApi.getCaptainAnalytics(captainId, period);
```

## Database Schema

**File**: `prisma/schema-market.prisma`

Added `AnalyticsEvent` model to read analytics data:

```prisma
enum AnalyticsEventType {
  PROFILE_VIEW
  CHARTER_VIEW
  CHARTER_SEARCH
  PHOTO_VIEW
  VIDEO_VIEW
  CONTACT_CLICK
  BOOKING_STARTED
  BOOKING_SUBMITTED
  REVIEW_VIEW
  SHARE_CLICKED
}

model AnalyticsEvent {
  id         String               @id @default(cuid())
  eventType  AnalyticsEventType
  charterId  String?
  captainId  String?
  userId     String?
  sessionId  String?
  metadata   Json?
  referrer   String?
  source     String?
  userAgent  String?
  ipAddress  String?
  createdAt  DateTime             @default(now())

  @@index([charterId, createdAt])
  @@index([captainId, createdAt])
  @@index([eventType, createdAt])
  @@map("analytics_events")
}
```

## Usage

### In Page Components

```typescript
// src/app/(portal)/captain/analytics/page.tsx
import { getCaptainAnalytics } from '@/lib/analytics-service';

export default async function AnalyticsPage() {
  // Automatically uses Direct DB (with API fallback)
  const data = await getCaptainAnalytics(captainId, period);

  return (
    <div>
      <AnalyticsStatsCards summary={data.summary} />
      <ViewsChart timeSeries={data.timeSeries} />
      {/* ... more components */}
    </div>
  );
}
```

### API Response Structure

Both strategies return identical data structures:

```typescript
interface CaptainAnalytics {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    bookingConversion: number;
    bookingStarts: number;
    bookingSubmits: number;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    bookings: number;
    uniqueVisitors: number;
  }>;
  referralSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  topCharters: Array<{
    charterId: string;
    name: string;
    views: number;
    bookings: number;
    conversionRate: number;
  }>;
}
```

## Performance Comparison

| Metric         | Direct DB        | API                         |
| -------------- | ---------------- | --------------------------- |
| **Latency**    | ~50-100ms        | ~150-300ms                  |
| **Throughput** | Database limited | Rate limited (100 req/min)  |
| **Network**    | Internal         | HTTP round-trip             |
| **Overhead**   | Minimal          | HTTP headers, serialization |
| **Caching**    | Query-level      | CDN possible                |
| **Complexity** | Prisma queries   | REST endpoint               |

## Migration from API to Direct DB

1. **Update environment variables**:

   ```bash
   USE_ANALYTICS_DB=1
   MARKET_DATABASE_URL="postgresql://..."
   ```

2. **Generate Prisma client**:

   ```bash
   npx prisma generate --schema=prisma/schema-market.prisma
   ```

3. **Test the connection**:

   ```bash
   npm run dev
   # Visit /captain/analytics
   # Check logs for "[Analytics] Direct DB failed" errors
   ```

4. **Monitor performance**:
   - Check page load times
   - Watch database connection pool
   - Review error logs

## Troubleshooting

### Direct DB Connection Fails

**Symptoms**: Analytics page shows "Failed to Load Analytics" or falls back to API

**Solutions**:

1. Check `MARKET_DATABASE_URL` is correct
2. Verify database user has SELECT permissions on `analytics_events` table
3. Check network connectivity to database
4. Review Prisma connection logs

### API Fallback Always Used

**Symptoms**: Logs show "[Analytics] Direct DB failed, falling back to API"

**Solutions**:

1. Ensure `USE_ANALYTICS_DB=1` is set
2. Regenerate Prisma client: `npx prisma generate --schema=prisma/schema-market.prisma`
3. Check database credentials
4. Verify `analytics_events` table exists in fishon-market DB

### Slow Query Performance

**Symptoms**: Analytics page takes >2 seconds to load

**Solutions**:

1. Check database indexes on `analytics_events`:
   - `(charterId, createdAt)`
   - `(captainId, createdAt)`
   - `(eventType, createdAt)`
2. Consider adding composite indexes for common queries
3. Review Prisma query logs for N+1 issues
4. Use connection pooling

## Benefits Summary

### Why Direct DB is Recommended

1. **Performance**: 2-3x faster than API calls
2. **Consistency**: Same pattern as booking service
3. **Reliability**: No external HTTP dependencies
4. **Flexibility**: Full SQL query control
5. **Type Safety**: Prisma Client TypeScript support
6. **Efficiency**: Native PostgreSQL aggregations
7. **No Rate Limits**: Internal database connection

### When to Use API

1. **Development**: When you don't have DB access
2. **Testing**: Isolated environments
3. **External Integration**: Third-party apps
4. **Fallback**: When DB connection fails
5. **CDN Caching**: If response caching is needed

## Future Improvements

- [ ] Add query result caching (Redis)
- [ ] Implement connection pooling
- [ ] Add query performance monitoring
- [ ] Create database replicas for read scaling
- [ ] Add query result pagination
- [ ] Implement real-time analytics streaming

## Related Files

- `src/lib/analytics-service.ts` - Direct DB implementation
- `src/lib/analytics-api.ts` - API client
- `prisma/schema-market.prisma` - Database schema
- `src/lib/prisma-market.ts` - Prisma client instance
- `src/app/(portal)/captain/analytics/page.tsx` - Analytics page
