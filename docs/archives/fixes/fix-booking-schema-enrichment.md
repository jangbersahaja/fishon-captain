---
type: fix
status: completed
updated: 2025-01-23
feature: bookings
author: GitHub Copilot
---

# Fix: Booking Schema Enrichment for Captain Dashboard

## Summary

After migrating the booking schema from denormalized fields (charterName, tripName, adults, children, unitPrice, totalPrice) to normalized references (charterId, tripId, guests JSON), the fishon-captain booking dashboard was crashing with "captainCharterId does not exist" errors. This fix implements a booking enrichment layer similar to fishon-market's approach, fetching trip and charter data from the captain database to populate display fields.

## What's in this plan

- [x] Create booking enrichment helper (`/src/lib/enrich-booking.ts`)
- [x] Update booking service to return enriched bookings
- [x] Fix MarketBooking type to handle Decimal → number conversion
- [x] Update booking list page to use enriched data
- [x] Update booking detail page to use enriched data
- [x] Verify TypeScript compilation passes
- [x] Test fishon-captain booking dashboard

## Implementation

### Problem

After schema migration, fishon-captain booking pages were accessing old schema fields:

- `captainCharterId` → changed to `charterId`
- `charterName`, `tripName`, `location` → removed (should fetch from captain DB)
- `adults`, `children` → changed to `guests: Json`
- `unitPrice`, `totalPrice` → changed to `tripPrice`, `finalPrice` (Decimal type)

The booking dashboard was directly querying `prismaMarket.booking.findUnique()` and trying to select these removed fields, causing runtime errors.

### Completed Job Summary

#### 1. Created Booking Enrichment Helper

**File:** `/src/lib/enrich-booking.ts`

Created enrichment functions to fetch trip and charter data from the captain database and merge with booking data:

```typescript
export type EnrichedMarketBooking = MarketBooking & {
  // Backward compatibility fields
  charterName: string;
  tripName: string;
  adults: number;
  children: number;
  unitPrice: number;
  totalPrice: number;
  location: string;
  durationHour: number;
  // Additional trip/charter data
  trip?: {
    /* ... */
  };
};

export async function enrichBooking(
  booking: MarketBooking
): Promise<EnrichedMarketBooking>;
export async function enrichBookings(
  bookings: MarketBooking[]
): Promise<EnrichedMarketBooking[]>;
```

**Key Features:**

- Fetches trip with charter relation from captain DB
- Converts Decimal fields to numbers
- Parses `guests` JSON to `adults` and `children` fields
- Formats `location` from `city, state`
- Maps `durationHours` to `durationHour` for backward compatibility
- Converts `TripStartTime[]` relation to `string[]` array
- Returns fallback values if trip not found (graceful degradation)

#### 2. Updated Booking Service

**File:** `/src/lib/booking-service.ts`

Modified all booking fetch functions to return enriched bookings:

```typescript
export async function getCaptainBookings(
  charterIds: string[]
): Promise<EnrichedMarketBooking[]>;
export async function getBooking(
  bookingId: string
): Promise<EnrichedMarketBooking | null>;
export async function getPendingBookings(
  charterIds: string[]
): Promise<EnrichedMarketBooking[]>;
```

All functions now call `enrichBookings()` or `enrichBooking()` before returning data, ensuring backward compatibility with existing UI code.

#### 3. Fixed MarketBooking Type

**File:** `/src/lib/market-db.ts`

Updated type definition and fetch functions to handle Prisma → MarketBooking conversion:

```typescript
export type MarketBooking = {
  // ...
  guests: { adults: number; children: number } | null; // Typed JSON field
  tripPrice: number; // Converted from Decimal
  finalPrice: number; // Converted from Decimal
  // ...
};
```

All `fetch*` functions now convert Decimal to number and cast `guests` JSON:

```typescript
return bookings.map((b) => ({
  ...b,
  tripPrice: Number(b.tripPrice),
  finalPrice: Number(b.finalPrice),
  guests: b.guests as { adults: number; children: number } | null,
})) as MarketBooking[];
```

#### 4. Updated Booking Detail Page

**File:** `/src/app/(portal)/captain/bookings/[id]/page.tsx`

Replaced direct Prisma query with booking service call:

**Before:**

```typescript
const booking = await prismaMarket.booking.findUnique({
  where: { id },
  select: {
    /* 20+ fields including removed ones */
  },
});
if (!charterIds.includes(booking.captainCharterId)) {
  /* ... */
}
```

**After:**

```typescript
const { getBooking } = await import("@/lib/booking-service");
const booking = await getBooking(id);
if (!charterIds.includes(booking.charterId)) {
  /* ... */
}
```

No changes needed to the JSX since enriched bookings provide all the old display fields.

#### 5. Verified TypeScript Compilation

All type errors resolved:

- ✅ Fixed `charter.location` → `charter.city, charter.state`
- ✅ Fixed `durationHour` → `durationHours`
- ✅ Fixed `startTimes` field access (relation vs array)
- ✅ Fixed Decimal → number conversion
- ✅ Fixed `guests` JSON typing
- ✅ Removed all `as any` casts

```bash
npm run typecheck  # ✅ Passes with no errors
```

### Database Schema Notes

**Trip Model (fishon-captain):**

```prisma
model Trip {
  id            String          @id @default(cuid())
  charterId     String
  name          String
  durationHours Int             # Note: Hours not Hour
  charter       Charter         @relation(...)
  startTimes    TripStartTime[] # Relation, not scalar array
  // ...
}

model TripStartTime {
  id     String @id @default(cuid())
  tripId String
  value  String  # e.g., "06:00 AM"
  trip   Trip    @relation(...)
}
```

**Charter Model (fishon-captain):**

```prisma
model Charter {
  id            String @id @default(cuid())
  name          String
  state         String  # e.g., "Selangor"
  city          String  # e.g., "Klang"
  startingPoint String
  // No single 'location' field
  // ...
}
```

**Booking Model (market DB):**

```prisma
model Booking {
  id         String  @id @default(cuid())
  charterId  String  # FK to captain DB Charter
  tripId     String  # FK to captain DB Trip
  guests     Json?   # { adults: number, children: number }
  tripPrice  Decimal @db.Decimal(10, 2)
  finalPrice Decimal @db.Decimal(10, 2)
  // Removed: charterName, tripName, adults, children, unitPrice, totalPrice
  // ...
}
```

### Testing Results

✅ **TypeScript:** Compilation passes with no errors
✅ **Runtime:** Booking dashboard loads without errors
✅ **Browser Console:** No runtime errors reported
✅ **Ports:** fishon-captain (3000) and fishon-market (3001) both running

## Future Plan

### Remaining Tasks

- [ ] **End-to-end test:** Create a test booking from fishon-market and verify it appears correctly in fishon-captain dashboard
- [ ] **Performance:** Consider caching trip/charter data if enrichment becomes a bottleneck
- [ ] **Error handling:** Add retry logic for trip fetch failures
- [ ] **Logging:** Add instrumentation to track enrichment performance

### Potential Improvements

1. **Batch Trip Fetching:** Instead of individual `findUnique` calls in `enrichBookings`, could use `findMany` with `in` clause for better performance:

   ```typescript
   const tripIds = bookings.map((b) => b.tripId);
   const trips = await prisma.trip.findMany({
     where: { id: { in: tripIds } },
     include: { charter: true, startTimes: true },
   });
   const tripMap = new Map(trips.map((t) => [t.id, t]));
   // Map bookings to enriched using tripMap
   ```

2. **Redis Caching:** Cache trip/charter data by ID with short TTL (5-10 min) to reduce DB queries

3. **Fallback UI:** Instead of "Unknown Charter/Trip", could show a warning banner prompting user to refresh data

## Review Notes

This fix successfully restores fishon-captain booking dashboard functionality after the schema migration. The enrichment pattern mirrors the approach used in fishon-market (`booking-display-service`), but accesses the local captain database instead of external API calls.

**Key architectural decision:** Enrichment happens at the service layer (booking-service) rather than in individual page components, ensuring consistency across all booking display pages.

## Archive/Legacy Notes

Related migrations:

- Schema migration documented in fishon-market booking schema redesign
- Initial migration completed Phase 1 (schema) and Phase 2 (fishon-market display pages)
- This fix completes Phase 3 (fishon-captain compatibility)

Previous error states:

1. `captainCharterId does not exist` - Direct field access before migration
2. `charterName`, `tripName` not found - After schema update but before enrichment
3. Type errors with Decimal/JSON fields - Before type conversion implementation
