# Multi-Day Time-Based Unavailability - fishon-captain Fix

## Problem Identified

When creating time-based unavailability in fishon-captain dashboard (e.g., 31 Dec 8pm - 1 Jan 12pm), the system is storing:

- ✅ Start/End dates with times embedded in UTC
- ❌ `isAllDay = true` (should be `false`)
- ❌ `startTime = null` and `endTime = null` (should be "20:00" and "12:00")

This causes fishon-market to treat the dates as **fully blocked** instead of **partially available**.

## Root Cause

The captain dashboard UI is not properly setting `isAllDay = false` when creating time-based unavailability. The backend API (`/api/charters/[id]/unavailability`) is working correctly and validates the fields properly.

## Database Evidence

Charter `cmgbtc2cz0009uyrk10sbsuko` has unavailability:

```javascript
{
  id: 'cmidanbdk0003uyjzbvbggko2',
  startDate: '2025-12-31T12:00:00.000Z',  // 31 Dec 8pm Malaysia Time
  endDate: '2026-01-01T04:00:00.000Z',    // 1 Jan 12pm Malaysia Time
  isAllDay: true,                          // ❌ WRONG - should be false
  startTime: null,                         // ❌ WRONG - should be "20:00"
  endTime: null,                           // ❌ WRONG - should be "12:00"
  reason: 'Offline Booking'
}
```

## Fix Strategy

### 1. Data Migration Script (Temporary Fix)

For existing records that have times embedded in dates but `isAllDay = true`, extract the times:

\`\`\`sql
-- Fix existing time-based unavailability records
UPDATE charter_unavailability
SET
"isAllDay" = false,
"startTime" = TO_CHAR(("startDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH24:MI'),
"endTime" = TO_CHAR(("endDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH24:MI')
WHERE
"isAllDay" = true
AND (
EXTRACT(HOUR FROM "startDate") != 0
OR EXTRACT(MINUTE FROM "startDate") != 0
OR EXTRACT(HOUR FROM "endDate") != 0
OR EXTRACT(MINUTE FROM "endDate") != 0
);
\`\`\`

### 2. UI Fix (Permanent Solution)

The captain dashboard UI needs to be updated to:

1. **Detect time-based unavailability**: When user selects times (not just dates)
2. **Set `isAllDay = false`**: Explicitly set this field in the API payload
3. **Include times**: Send `startTime` and `endTime` in HH:MM format

**Required changes**:

- Find the unavailability creation form/modal in captain dashboard
- Ensure it sends proper payload:

\`\`\`typescript
// CORRECT payload for time-based unavailability
{
startDate: "2025-12-31T00:00:00Z", // Just the date part
endDate: "2026-01-01T00:00:00Z", // Just the date part
isAllDay: false, // ✅ Must be false
startTime: "20:00", // ✅ HH:MM format
endTime: "12:00", // ✅ HH:MM format
reason: "New Year Holiday"
}

// WRONG payload (current behavior)
{
startDate: "2025-12-31T12:00:00Z", // Time embedded in date
endDate: "2026-01-01T04:00:00Z", // Time embedded in date
isAllDay: true, // ❌ Wrong
startTime: null, // ❌ Missing
endTime: null, // ❌ Missing
reason: "New Year Holiday"
}
\`\`\`

### 3. Backend Validation (Already Correct)

The API endpoint `/api/charters/[id]/unavailability` already has proper validation via `UnavailabilityPayloadSchema`:

- ✅ Requires `startTime` and `endTime` when `isAllDay = false`
- ✅ Validates time format (HH:MM)
- ✅ Ensures `endTime` > `startTime`

## Testing After Fix

1. **Create time-based unavailability**:
   - Go to captain dashboard
   - Create unavailability: 31 Dec 8pm - 1 Jan 12pm
   - Check database:

     ```javascript
     isAllDay: false,
     startTime: "20:00",
     endTime: "12:00"
     ```

2. **Verify in fishon-market**:
   - Visit charter booking page
   - Check calendar:
     - ✅ 31 Dec: Orange dot (partial availability)
     - ✅ 1 Jan: Orange dot (partial availability)
     - ❌ Neither should be fully blocked (gray)

3. **Check time picker**:
   - Select 31 Dec
   - Evening times (8pm+) should be disabled
   - Morning times should be available
   - Select 1 Jan
   - Morning times (before noon) should be disabled
   - Afternoon times should be available

## Files to Check/Fix

Need to locate these in fishon-captain:

1. **Unavailability Form Component**:
   - Likely in `src/app/captain/...` or `src/components/captain/...`
   - Search for: form that creates unavailability
   - Check: How it determines `isAllDay` value

2. **API Client/Hook**:
   - Search for: `fetch(...unavailability`, `POST` requests
   - Check: Payload construction

3. **Type Definitions**:
   - Ensure TypeScript types include `isAllDay`, `startTime`, `endTime`

## Priority Actions

1. **URGENT**: Run data migration script to fix existing records
2. **HIGH**: Find and fix captain dashboard UI
3. **MEDIUM**: Add UI tests to prevent regression
4. **LOW**: Add visual indicator in UI showing time-based vs all-day

## Success Criteria

- ✅ Creating time-based unavailability sets `isAllDay = false`
- ✅ Times are stored in `startTime` and `endTime` fields (not embedded in dates)
- ✅ fishon-market shows orange dots for partial availability
- ✅ Time picker correctly disables conflicting times
- ✅ Multi-day unavailability splits correctly (first day, last day, middle days)
