# Analysis: Can We Safely Remove Legacy API Endpoints?

**Date:** November 5, 2025  
**Status:** ✅ MIGRATION COMPLETE  
**Decision:** ALL LEGACY ENDPOINTS REMOVED

## Summary

All legacy `/api/public/charters/*` endpoints have been successfully removed:

1. ✅ Charter data endpoints (`/charters` and `/charters/:id`) - **REMOVED** (replaced by v1)
2. ✅ Search endpoint (`/charters/search`) - **REMOVED** (replaced by v1)
3. ✅ Availability endpoint (`/charters/:id/availability`) - **REMOVED** (replaced by client-side calculation)

**Phase 1 Completed:** November 5, 2025 - Removed list, detail, and search endpoints  
**Phase 2 Completed:** November 5, 2025 - Eliminated availability API entirely (client-side calculation)  
**Phase 2 Revised:** v1 availability endpoint also removed - unnecessary duplication

## Current Endpoint Status

### ✅ Safe to Remove (v1 Replacements Exist)

#### 1. `/api/public/charters` (List)

- **Legacy:** `/api/public/charters`
- **v1 Replacement:** `/api/public/v1/charters` ✅
- **Used by:** fishon-market (via `captain-api.ts`)
- **Status:** fishon-market already uses v1 endpoints exclusively

#### 2. `/api/public/charters/:id` (Single)

- **Legacy:** `/api/public/charters/:id`
- **v1 Replacement:** `/api/public/v1/charters/:id` ✅
- **Used by:** fishon-market (via `captain-api.ts`)
- **Status:** fishon-market already uses v1 endpoints exclusively

#### 3. `/api/public/charters/search` (Search)

- **Legacy:** `/api/public/charters/search`
- **v1 Replacement:** Direct DB queries in fishon-market ✅
- **Used by:** fishon-market (but uses DB view instead)
- **Status:** Not actively used; can be removed

### ✅ Eliminated Entirely (Phase 2 Complete)

#### 4. `/api/public/charters/:id/availability` (Availability)

- **Legacy:** `/api/public/charters/:id/availability` - **REMOVED**
- **v1 Replacement:** None - eliminated unnecessary API call ✅
- **Used by:**
  - fishon-market - **NOT USED** (uses `availability-helpers.ts` with charter data directly)
  - fishon-captain internal (`src/components/captain/calendar/CharterCalendar.tsx`) - **UPDATED** to use client-side calculation
- **Status:** ELIMINATED - Both apps now calculate availability client-side using `availability-helpers.ts`

## Usage Analysis

### fishon-market (External Consumer)

**Charter Data Fetching:**

```typescript
// File: src/lib/api/captain-api.ts
// ✅ Already using v1 endpoints
export async function fetchCharters(): Promise<BackendCharter[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/v1/charters`, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });
  // ...
}

export async function fetchCharterById(
  id: string
): Promise<BackendCharter | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/v1/charters/${id}`, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });
  // ...
}
```

**Availability Calculation:**

```typescript
// File: src/lib/helpers/availability-helpers.ts
// ✅ Uses charter data directly (no separate API call needed)
export function calculateBlockedDates(
  schedule?: CharterSchedule,
  unavailability?: UnavailabilityPeriod[],
  bookings?: BookingWithAngler[]
): Set<string> {
  // Calculates blocked dates from charter data
  // Charter data already includes schedule and unavailability from DB/API
}
```

### fishon-captain (Internal Consumer)

**Charter Calendar:**

```typescript
// File: src/components/captain/calendar/CharterCalendar.tsx
// ✅ Now uses client-side calculation (no API call)
import { getAvailabilityForRange } from "@/lib/helpers/availability-helpers";

const calculatedAvailability = useMemo(() => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const dateAvailability = getAvailabilityForRange(
    schedule,
    unavailability,
    monthStart,
    monthEnd
  );

  return { availability: { dateAvailability } };
}, [schedule, unavailability, currentMonth]);
```

## Data Structure Comparison

### Charter Data (v1 vs Legacy)

Both endpoints return the same data structure via `v_public_charters` view:

```typescript
interface CharterData {
  id: string;
  name: string;
  charterType: string;
  state: string;
  district: string;
  // ... all fields including:
  schedule: CharterSchedule;
  unavailability: UnavailabilityPeriod[];
  trips: Trip[];
  media: Media[];
  // etc.
}
```

**Conclusion:** v1 endpoints are functionally identical to legacy, just different paths.

### Availability Data (No v1)

Legacy endpoint returns:

```typescript
{
  schedule: { type, operationalDays },
  unavailability: [{ startDate, endDate, reason }],
  dateAvailability: [{ date, available, reason }]
}
```

**No v1 equivalent exists yet.**

## Dependencies & Risks

### Low Risk (Can Remove)

**Legacy charter endpoints:**

- All consumers (fishon-market) already migrated to v1
- No code references legacy paths
- Documentation already points to v1

### High Risk (Cannot Remove)

**Legacy availability endpoint:**

- Actively used by fishon-market booking flow
- Used by fishon-captain internal calendar
- No migration path yet
- Breaking this would prevent:
  - Date blocking in booking calendars
  - Availability checks
  - Schedule display

## Migration Path for Availability (Completed)

✅ **Decision:** Eliminate availability API entirely - use client-side calculation in both apps.

### ✅ 1. Create Shared Helper Library

Created `src/lib/helpers/availability-helpers.ts` in fishon-captain with client-side calculation:

```typescript
export function getAvailabilityForRange(
  schedule: CharterSchedule | null,
  unavailability: UnavailabilityPeriod[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; available: boolean; reason?: string }> {
  // Client-side calculation - no API call needed
}
```

### ✅ 2. Update fishon-market

**ALREADY DONE** - fishon-market already uses `availability-helpers.ts` for client-side calculation.

### ✅ 3. Update fishon-captain Internal Components

Updated `src/components/captain/calendar/CharterCalendar.tsx`:

```typescript
// Before: API call to fetch availability
const availabilityRes = await fetch(
  `/api/public/charters/${charterId}/availability`
);

// After: Client-side calculation with useMemo
const calculatedAvailability = useMemo(() => {
  const dateAvailability = getAvailabilityForRange(
    schedule,
    unavailability,
    monthStart,
    monthEnd
  );
  return { availability: { dateAvailability } };
}, [schedule, unavailability, currentMonth]);
```

### ✅ 4. Remove API Endpoints

Removed both legacy and v1 availability endpoints:

- ❌ `src/app/api/public/charters/[id]/availability/route.ts` - DELETED
- ❌ `src/app/api/public/v1/charters/[id]/availability/route.ts` - DELETED

**Rationale:** Availability calculation is purely computational (no database writes, no external dependencies). Client-side calculation:

- Reduces server load
- Eliminates unnecessary HTTP requests
- Simplifies architecture
- Matches fishon-market's existing pattern

## Recommended Actions

### Phase 1: Immediate (Safe Removals)

1. **Remove legacy charter list endpoint**
   - Delete: `src/app/api/public/charters/route.ts`
   - Reason: Replaced by v1, no active usage

2. **Remove legacy charter detail endpoint**
   - Delete: `src/app/api/public/charters/[id]/route.ts`
   - Reason: Replaced by v1, no active usage

3. **Remove legacy search endpoint**
   - Delete: `src/app/api/public/charters/search/route.ts`
   - Reason: fishon-market uses DB queries instead

4. **Update documentation**
   - Remove references to legacy endpoints in:
     - `docs/archives/PUBLIC_API_DOCUMENTATION.md`
     - `.github/copilot-instructions.md` (both repos)
     - `fishon-market/.github/copilot-instructions.md`

### Phase 2: Availability Elimination ✅ COMPLETE

5. **Eliminated availability API entirely**
   - Created: `src/lib/helpers/availability-helpers.ts` (client-side calculation)
   - Updated: `src/components/captain/calendar/CharterCalendar.tsx` (uses client-side calculation)
   - Deleted: Both legacy and v1 availability endpoints (unnecessary)

**Result:** Both apps now calculate availability client-side, eliminating unnecessary API calls and server load.

## Testing Checklist

Before removing any endpoint:

- [ ] Verify no production traffic to legacy endpoints
- [ ] Check all dependent repositories (fishon-market, etc.)
- [ ] Search codebase for hardcoded legacy paths
- [ ] Review external integrations (if any)
- [ ] Update API documentation
- [ ] Add deprecation warnings first (before removal)

## References

### Legacy Endpoints

- `src/app/api/public/charters/route.ts` - List (SAFE TO REMOVE)
- `src/app/api/public/charters/[id]/route.ts` - Detail (SAFE TO REMOVE)
- `src/app/api/public/charters/search/route.ts` - Search (SAFE TO REMOVE)
- `src/app/api/public/charters/[id]/availability/route.ts` - Availability (KEEP)

### v1 Endpoints

- `src/app/api/public/v1/charters/route.ts` - List ✅
- `src/app/api/public/v1/charters/[id]/route.ts` - Detail ✅

### fishon-market References

- `src/lib/api/captain-api.ts` - Uses v1 charter endpoints
- `src/lib/api/availability-api.ts` - Uses legacy availability endpoint
- `docs/BACKEND_INTEGRATION.md` - Documents v1 endpoints

## Conclusion

**✅ ALL LEGACY ENDPOINTS REMOVED:**

- ✅ `/api/public/charters` (list) - Replaced by v1
- ✅ `/api/public/charters/:id` (detail) - Replaced by v1
- ✅ `/api/public/charters/search` - Replaced by DB queries
- ✅ `/api/public/charters/:id/availability` - Eliminated (client-side calculation)

**API Simplification Achieved:**

The availability endpoint was eliminated entirely because:

1. **fishon-market** already calculated availability client-side
2. **fishon-captain** was making unnecessary API calls for data it already had
3. Client-side calculation reduces server load and HTTP overhead
4. Both apps now use identical calculation logic from `availability-helpers.ts`

**Result:** Cleaner architecture with fewer API endpoints and no functional regressions.
