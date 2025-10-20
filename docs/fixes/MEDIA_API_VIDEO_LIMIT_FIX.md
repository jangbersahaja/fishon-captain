# Media API Video Limit Fix

**Date**: 2025-10-20
**Issue**: PUT `/api/charters/[id]/media` returning 400 error when opening MediaPricing step in edit mode

## Problem

When opening the MediaPricing step in edit mode for a charter with more than 5 videos, the API was returning a 400 validation error:

```json
{
  "error": "invalid_payload",
  "details": [
    {
      "origin": "array",
      "code": "too_big",
      "maximum": 5,
      "inclusive": true,
      "path": ["media", "videos"],
      "message": "Too big: expected array to have <=5 items"
    }
  ]
}
```

## Root Cause

There was a mismatch between schema validation limits:

1. **Form Schema** (`charter.ts`): Allows up to **10 videos**

   ```typescript
   videos: z.array(fileSchema).max(10, "Maximum 10 videos");
   ```

2. **Media API Schemas** (`media.ts`): Only allowed **5 videos**
   - `IncomingMediaSchema`: `.max(5)`
   - `FinalizeMediaSchema`: `.max(5)`

## What the API Does

**Endpoint**: `PUT /api/charters/[charterId]/media`

**Purpose**: Updates media (images and videos) for an existing charter in edit mode

**When Called**: Automatically when opening the MediaPricing step in edit mode via `useCharterMediaManager` hook

**Function**:

- Syncs current images/videos state with database
- Handles media deletions
- Updates sort order
- Validates payload against `IncomingMediaSchema`

**Location**: `src/app/api/charters/[id]/media/route.ts`

**Caller**: `src/features/charter-onboarding/hooks/useCharterMediaManager.ts` (lines 356-378)

## Solution

Updated both media schemas in `fishon-schemas/src/media.ts` to match the form schema limit:

### Changed Files

1. **`fishon-schemas/src/media.ts`**
   - `IncomingMediaSchema.media.videos`: Changed from `.max(5)` to `.max(10)`
   - `FinalizeMediaSchema.media.videos`: Changed from `.max(5)` to `.max(10)`

### Code Changes

```typescript
// Before
videos: z.array(...).max(5)

// After
videos: z.array(...).max(10)
```

## Impact

- ✅ Charters with 6-10 videos can now be edited without validation errors
- ✅ MediaPricing step loads correctly for all charters
- ✅ Consistent video limits across all schemas (form + API)
- ✅ No breaking changes to existing functionality

## Testing

After applying the fix:

1. Build the schemas package: `cd fishon-schemas && npm run build`
2. Open edit mode for a charter with >5 videos
3. Navigate to MediaPricing step
4. Verify no 400 error in console
5. Verify videos display correctly

## Related Files

- `/Users/jangbersahaja/Website/fishon-schemas/src/media.ts` - Schema definitions
- `/Users/jangbersahaja/Website/fishon-schemas/src/charter.ts` - Form schema (reference)
- `/Users/jangbersahaja/Website/fishon-captain/src/app/api/charters/[id]/media/route.ts` - API endpoint
- `/Users/jangbersahaja/Website/fishon-captain/src/features/charter-onboarding/hooks/useCharterMediaManager.ts` - Caller

## Notes

- Maximum images remain at 20 (unchanged)
- Maximum videos now consistently 10 across all schemas
- The schema package must be rebuilt after changes for them to take effect in the main app
