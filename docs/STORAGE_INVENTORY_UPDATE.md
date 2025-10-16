# Storage Inventory Update - New Video Pipeline Support

## Overview

Updated the admin media page's Storage Inventory tab to work with the new video upload pipeline (`CaptainVideo` model) and removed legacy `PendingMedia` references. The page now provides detailed video asset tracking with relationship visualization.

## Changes Made

### 1. Storage Scope Classification (`shared.ts`)

**Removed:**

- `pending-temp` scope (legacy temporary upload storage)

**Added:**

- `captain-videos` scope for new video pipeline

**Updated `classifyScope()` logic:**

```typescript
- Recognizes `captain-videos/` prefix (normalized videos)
- Recognizes `captains/{userId}/videos/` prefix (original uploads)
- Both patterns now classified as "captain-videos" scope
```

### 2. Data Loader Enhancement (`data.ts`)

**Added CaptainVideo fetching:**

- Fetches all `CaptainVideo` records with relevant fields:
  - `originalUrl`, `blobKey` (original upload)
  - `thumbnailUrl`, `thumbnailBlobKey` (generated thumbnail)
  - `ready720pUrl`, `normalizedBlobKey` (normalized 720p)
  - `processStatus`, `didFallback`, `originalDeletedAt`

**Video reference tracking:**

- Creates references for all three video asset types
- Links to `/staff/media?tab=videos&videoId={id}` for easy navigation
- Labels indicate asset type: "(original)", "(thumbnail)", "(720p)"
- Shows fallback status and deletion state

**Video metadata mapping:**

- Builds `videoKeyMap` for O(1) lookup of video relationships
- Each blob row now knows:
  - Which video it belongs to (`linkedVideoId`)
  - Video processing status (`videoStatus`)
  - Related asset keys (`originalVideoKey`, `thumbnailKey`, `normalizedKey`)
  - Asset type flags (`isOriginalVideo`, `isThumbnail`, `isNormalizedVideo`)

### 3. Type Enhancements (`shared.ts`, `StorageManager.tsx`)

**Extended `StorageRow` type with video fields:**

```typescript
linkedVideoId?: string;           // CaptainVideo.id
videoStatus?: string;             // processStatus (queued/processing/ready/failed)
originalVideoKey?: string | null; // Original video blob key
thumbnailKey?: string | null;     // Thumbnail blob key
normalizedKey?: string | null;    // Normalized 720p blob key
isOriginalVideo?: boolean;        // This blob is the original video
isThumbnail?: boolean;            // This blob is the thumbnail
isNormalizedVideo?: boolean;      // This blob is the normalized 720p
```

### 4. UI Improvements (`StorageManager.tsx`)

**Video asset badges in key column:**

- Blue "ORIGINAL" badge for original video files
- Purple "THUMB" badge for thumbnails
- Green "720P" badge for normalized videos

**Video pipeline relationship panel:**

- Displayed when blob is part of video pipeline
- Shows:
  - Video ID (truncated)
  - Processing status (QUEUED/PROCESSING/READY/FAILED)
  - Visual indicators with colored badges:
    - **O** (blue) = Original video
    - **T** (purple) = Thumbnail
    - **N** (green) = Normalized 720p
  - Original video key reference for derived assets

**Enhanced reference list:**

- Links to video pipeline detail view
- Shows relationship type (original/thumbnail/720p)
- Indicates fallback status where applicable

## How It Works

### Video Asset Lifecycle Tracking

1. **Original Upload:**

   - User uploads video → stored with key like `captains/{userId}/videos/{filename}`
   - `CaptainVideo` record created with `originalUrl` and `blobKey`
   - Storage inventory shows as "ORIGINAL" + "captain-videos" scope

2. **Thumbnail Generation:**

   - Worker extracts frame → stored as `captain-videos/{videoId}-thumb.jpg`
   - `thumbnailUrl` and `thumbnailBlobKey` updated in `CaptainVideo`
   - Storage inventory shows as "THUMB" + linked to original video

3. **Normalization (720p):**

   - Worker transcodes → stored as `captain-videos/{videoId}-720p.mp4`
   - `ready720pUrl` and `normalizedBlobKey` updated
   - Storage inventory shows as "720P" + linked to original video

4. **Original Deletion (post-normalization):**
   - After successful normalization, original may be deleted to save space
   - `originalDeletedAt` timestamp set
   - Storage inventory no longer shows original reference (expected orphan cleanup)

### Filtering Capabilities

Users can filter by:

- **Scope:** All, Charter media, Avatars, Verification, **Captain videos**, Legacy, Other
- **Link state:** All, Linked (has DB references), Orphan (no DB references)
- **Sort:** Uploaded date, Size, Blob key
- **Search:** Free text search in key or reference labels

### Orphan Detection

**Expected orphans (safe to delete):**

- Test uploads not linked to any captain
- Failed uploads that never completed
- Old originals after successful normalization + original deletion flag set

**Unexpected orphans (investigate before deleting):**

- Videos with `processStatus = "ready"` but no references
- Thumbnails without parent video record
- Normalized videos marked ready but not in DB

### Clean-up Workflow

1. Navigate to `/staff/media?tab=storage&scope=captain-videos&linked=orphan`
2. Review orphan list
3. Check video pipeline info panel for context
4. Select orphans to delete
5. Click "Delete selected" → confirms → batch deletes from Vercel Blob
6. Page auto-refreshes to show updated inventory

## Benefits

✅ **Legacy cleanup:** Removed `PendingMedia` and `pending-temp` scope  
✅ **Video visibility:** All video assets (original, thumbnail, 720p) tracked  
✅ **Relationship mapping:** Visual indication of which assets belong together  
✅ **Orphan detection:** Easy identification of unlinked blobs  
✅ **Safe deletion:** Context-rich UI helps avoid accidental data loss  
✅ **Development efficiency:** Faster debugging of video pipeline issues

## Future Improvements

### Pagination (Pending)

Currently fetches up to 500 blobs (configurable via `BLOB_FETCH_LIMIT`). For production use with thousands of blobs:

1. Implement cursor-based pagination using Vercel Blob's `cursor` parameter
2. Add page controls to `StorageSection`
3. Store cursor in URL query params for shareable links
4. Consider server-side filtering to reduce data transfer

**Config for development:**

```typescript
// In shared.ts
export const BLOB_FETCH_LIMIT = 100; // Lower for dev to reduce API calls
export const BLOB_PAGE_SIZE = 50; // Smaller pages for faster iteration
```

### Additional Features

- **Bulk operations:** Select all orphans in scope, download before delete
- **Size analytics:** Total storage by scope, cost estimation
- **Timeline view:** Visual graph of upload/delete patterns
- **Audit log:** Track deletion history for compliance
- **Smart suggestions:** Auto-flag old orphans (>30 days) for review

## Testing Checklist

- [ ] Navigate to `/staff/media?tab=storage`
- [ ] Verify "Captain videos" filter option appears
- [ ] Filter by `scope=captain-videos`
- [ ] Confirm video badges show correctly (ORIGINAL/THUMB/720P)
- [ ] Verify video pipeline panel displays with relationships
- [ ] Test search functionality with video IDs
- [ ] Filter by `linked=orphan` and review results
- [ ] Select and delete test orphan blob
- [ ] Verify deletion removes from storage and UI refreshes
- [ ] Check missing referenced blobs warning (if any)

## Related Documentation

- `docs/API_VIDEO_ROUTES.md` - Video API endpoints
- `docs/PHASE_2C_COMPLETION_REPORT.md` - Video pipeline architecture
- `docs/VIDEO_UPLOAD_CLEANUP_OCT_2025.md` - Legacy cleanup notes
- `prisma/schema.prisma` - CaptainVideo model definition

## Rollback Plan

If issues arise, revert these files:

1. `src/app/(admin)/staff/media/shared.ts`
2. `src/app/(admin)/staff/media/data.ts`
3. `src/app/(admin)/staff/media/StorageManager.tsx`

Previous behavior will be restored (pending-temp scope, no video tracking).
