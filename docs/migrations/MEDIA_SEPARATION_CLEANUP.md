# Media Separation Cleanup Plan

**Date:** October 21, 2025  
**Status:** Planning Phase  
**Goal:** Dedicate `CharterMedia` table for photos only, `CaptainVideo` table for videos only

---

## Executive Summary

After deleting all `CHARTER_VIDEO` records from `CharterMedia`, we need to complete the separation:

- **CharterMedia** → Photos only (`CHARTER_PHOTO`)
- **CaptainVideo** → Videos only (already in place)

This cleanup ensures:

1. Clean data model with clear separation of concerns
2. Independent upload/edit flows for photos and videos
3. Both media types properly linked to charters via their respective tables
4. Future-proof architecture for 1-to-many captain-charter relationships

---

## Current State Analysis

### Schema Status

✅ **CaptainVideo table** - Fully functional, contains:

- `ownerId` (userId) - Required
- `charterId` - Optional (currently NULL for orphans)
- `charterMediaId` - Legacy relation field (to be removed)
- Video processing fields (normalizedBlobKey, thumbnailBlobKey, etc.)

✅ **CharterMedia table** - Contains:

- Photos (`CHARTER_PHOTO`) - Active use
- Legacy columns: `tripId`, `kind`, `thumbnailUrl`, `durationSeconds`
- `CaptainVideo` relation via `charterMediaId`

⚠️ **Charter table** - Missing:

- Direct relation to `CaptainVideo[]`

### Upload Flow Status

#### Photos (CharterMedia)

✅ **Direct upload** - `/api/media/photo` creates `CharterMedia` immediately

- Sets `captainId` from profile
- Sets `charterId` = null initially (orphan)
- During finalize: updates `charterId` to real charter ID

#### Videos (CaptainVideo)

✅ **Independent upload** - `/api/blob/upload` creates `CaptainVideo` with:

- `ownerId` = userId
- `charterId` = null initially (orphan)
- During finalize: updates `charterId` AND creates legacy `CharterMedia` record

❌ **Legacy issue**: Finalize still creates `CharterMedia` record for videos (lines 662-672 in finalize route)

---

## Issues Found in Codebase

### 1. Finalize Route (`/api/charter-drafts/[id]/finalize/route.ts`)

**Line 662-672** - Creates legacy `CharterMedia` for videos:

```typescript
const charterMedia = await prisma.charterMedia.create({
  data: {
    charterId: charter.id,
    captainId: captainProfile.id,
    kind: "CHARTER_VIDEO", // ❌ Should not create this
    url: video.ready720pUrl || video.originalUrl,
    storageKey: video.blobKey || video.normalizedBlobKey || video.originalUrl,
    sortOrder: i,
  },
});
await prisma.captainVideo.update({
  where: { id: video.id },
  data: { charterId: charter.id, charterMediaId: charterMedia.id }, // ❌ Sets legacy relation
});
```

**Fix needed:**

- Update `CaptainVideo.charterId` directly
- Remove `CharterMedia` creation for videos
- Remove `charterMediaId` update

### 2. Media Fetch Routes

**Files using `kind` filter:**

- `/api/charters/[id]/route.ts` (lines 494, 497) - GET request filters by kind
- `/api/charters/[id]/get/route.ts` (lines 72, 80) - Filters photos/videos by kind
- `/api/charters/[id]/thumbnails/route.ts` (line 33) - Finds videos by kind
- `/api/charters/[id]/media/video/thumbnail/route.ts` (line 60) - Finds video by kind
- `/api/admin/charters/[id]/delete/route.ts` (line 37) - Deletes non-photos
- `/api/captain/photos/route.ts` (line 23) - Filters photos

**Fix needed:**

- Update to fetch videos from `CaptainVideo` table
- Photos remain in `CharterMedia` (no kind filter needed since it's photos-only)

### 3. Edit Mode (PATCH) API

**File:** `/api/charters/[id]/media/route.ts` (PUT handler)

**Current behavior:**

```typescript
const imageCreates = images.map((m, i) => ({
  kind: "CHARTER_PHOTO" as const, // ✅ Photos OK
  // ...
}));
const videoCreates = videos.map((m, i) => ({
  kind: "CHARTER_VIDEO" as const, // ❌ Videos should not be here
  // ...
}));
```

**Fix needed:**

- Remove video handling from this route
- Videos are edited independently via `CaptainVideo` table (already implemented)

### 4. Server Charter Creation

**File:** `/src/server/charters.ts` (lines 197, 203)

Creates media during charter creation:

```typescript
kind: MediaKind.CHARTER_PHOTO,  // ✅ OK
kind: MediaKind.CHARTER_VIDEO,  // ❌ Should not create
```

**Fix needed:**

- Remove video creation from media array
- Videos should only be linked via `CaptainVideo.charterId` update

### 5. Staff Media Dashboard

**File:** `/app/(admin)/staff/media/data.ts`

Uses `video.charterMediaId` for relationship tracking (line 558).

**Fix needed:**

- Update relationship tracking to use `video.charterId` directly
- Remove `charterMediaId` references

---

## Implementation Plan

### Phase 1: Code Updates (Safe Changes)

#### 1.1 Update Finalize Route

**File:** `/api/charter-drafts/[id]/finalize/route.ts`

**Change lines 654-672:**

```typescript
// OLD: Create CharterMedia + link via charterMediaId
const charterMedia = await prisma.charterMedia.create({
  data: {
    charterId: charter.id,
    captainId: captainProfile.id,
    kind: "CHARTER_VIDEO",
    url: video.ready720pUrl || video.originalUrl,
    storageKey: video.blobKey || video.normalizedBlobKey || video.originalUrl,
    sortOrder: i,
  },
});
await prisma.captainVideo.update({
  where: { id: video.id },
  data: { charterId: charter.id, charterMediaId: charterMedia.id },
});

// NEW: Direct charter link only
await prisma.captainVideo.update({
  where: { id: video.id },
  data: { charterId: charter.id },
});
```

#### 1.2 Update Media Fetch Routes

**A) GET Charter with Media** (`/api/charters/[id]/route.ts`, `/api/charters/[id]/get/route.ts`)

Add `CaptainVideo` to include:

```typescript
const charter = await prisma.charter.findUnique({
  where: { id: charterId },
  include: {
    // ... existing includes
    media: {
      where: { kind: "CHARTER_PHOTO" }, // ✅ Only photos now
      select: { url: true, storageKey: true },
      orderBy: { sortOrder: "asc" },
    },
    videos: {
      // ✅ NEW: Fetch videos from CaptainVideo
      where: {
        charterId: charterId,
        processStatus: "ready", // Only show processed videos
      },
      select: {
        id: true,
        ready720pUrl: true,
        thumbnailUrl: true,
        processedDurationSec: true,
        blobKey: true,
      },
      orderBy: { createdAt: "asc" },
    },
  },
});

// Transform response
const images = charter.media.map((m) => ({
  name: m.storageKey,
  url: m.url,
}));
const videos = charter.videos.map((v) => ({
  name: v.blobKey,
  url: v.ready720pUrl || v.originalUrl,
  thumbnailUrl: v.thumbnailUrl,
  durationSeconds: v.processedDurationSec,
}));
```

**B) Remove video handling from** `/api/charters/[id]/media/route.ts`

Remove `videoCreates` entirely, only handle images.

#### 1.3 Update Server Charter Creation

**File:** `/src/server/charters.ts`

Remove `CHARTER_VIDEO` from media creation (lines 203+).

#### 1.4 Update Staff Media Dashboard

**File:** `/app/(admin)/staff/media/data.ts`

Change relationship tracking from `charterMediaId` to `charterId`:

```typescript
// Line 558: OLD
if (video.charterMediaId) {
  edges.push({
    from: video.id,
    to: video.charterMediaId,
    type: "video_to_charter_media",
  });
}

// Line 558: NEW
if (video.charterId) {
  edges.push({
    from: video.id,
    to: video.charterId,
    type: "video_to_charter",
  });
}
```

---

### Phase 2: Schema Updates (After Code is Safe)

#### 2.1 Add Direct Video Relation to Charter

**File:** `prisma/schema.prisma`

```prisma
model Charter {
  // ... existing fields
  media   CharterMedia[]
  videos  CaptainVideo[]  // ✅ ADD THIS
}

model CaptainVideo {
  // ... existing fields
  charterId      String?
  charter        Charter?  @relation(fields: [charterId], references: [id], onDelete: SetNull)  // ✅ ADD THIS with unlink behavior

  // Keep for now (Phase 3):
  charterMediaId String?
  charterMedia   CharterMedia? @relation(fields: [charterMediaId], references: [id])

  // Note: Will change ownerId to captainId in Phase 3
}
```

**Run migration:**

```bash
npm run prisma:migrate -- --name "add_charter_video_relation"
```

#### 2.2 Create Legacy Schema Documentation

**File:** `docs/LEGACY_SCHEMA.md`

Document fields to be removed in Phase 3.

---

### Phase 3: Schema Cleanup (Final Phase)

⚠️ **Only after confirming no usage in production**

#### 3.1 Remove Legacy Fields from CharterMedia

```prisma
model CharterMedia {
  id            String          @id @default(cuid())
  charterId     String?
  // tripId      String?  ❌ REMOVE - fully legacy
  // kind        MediaKind ❌ REMOVE - photos only now
  url           String
  storageKey    String
  mimeType      String?
  sizeBytes     Int?
  width         Int?
  height        Int?
  sortOrder     Int             @default(0)
  createdAt     DateTime        @default(now())
  // thumbnailUrl    String?  ❌ REMOVE - not for photos
  // durationSeconds Int?     ❌ REMOVE - not for photos
  captainId     String?
  captain       CaptainProfile? @relation(fields: [captainId], references: [id])
  charter       Charter?        @relation(fields: [charterId], references: [id])
  // trip        Trip?  ❌ REMOVE - legacy relation
  // captainVideos CaptainVideo[]  ❌ REMOVE - reverse relation

  @@index([captainId, createdAt])
  @@index([charterId, sortOrder])
}
```

#### 3.2 Change ownerId to captainId in CaptainVideo

**Risk Assessment:** Low - straightforward column rename with data migration

```prisma
model CaptainVideo {
  // ... existing fields
  captainId      String   // ✅ CHANGE from ownerId (was userId reference, now CaptainProfile reference)
  captain        CaptainProfile @relation(fields: [captainId], references: [id])
  charterId      String?
  charter        Charter?  @relation(fields: [charterId], references: [id], onDelete: SetNull)

  // charterMediaId  String?  ❌ REMOVE
  // charterMedia    CharterMedia?  ❌ REMOVE

  @@index([captainId, processStatus])  // ✅ CHANGE from [ownerId, processStatus]
  @@index([createdAt])
  @@index([charterId])  // ✅ ADD for performance, sorting, and ordering
}
```

**Data migration required:**

```sql
-- Step 1: Add captainId column
ALTER TABLE "CaptainVideo" ADD COLUMN "captainId" TEXT;

-- Step 2: Populate captainId from ownerId → userId → CaptainProfile
UPDATE "CaptainVideo" cv
SET "captainId" = cp.id
FROM "CaptainProfile" cp
WHERE cv."ownerId" = cp."userId";

-- Step 3: Make captainId non-nullable (after verifying all rows populated)
ALTER TABLE "CaptainVideo" ALTER COLUMN "captainId" SET NOT NULL;

-- Step 4: Drop old ownerId column
ALTER TABLE "CaptainVideo" DROP COLUMN "ownerId";

-- Step 5: Recreate indexes
DROP INDEX IF EXISTS "CaptainVideo_ownerId_processStatus_idx";
CREATE INDEX "CaptainVideo_captainId_processStatus_idx" ON "CaptainVideo"("captainId", "processStatus");
CREATE INDEX "CaptainVideo_charterId_idx" ON "CaptainVideo"("charterId");
```

#### 3.3 Remove charterMediaId from CaptainVideo

```prisma
-- Already covered in 3.2 above
```

#### 3.4 Remove Trip Relation

**Confirmed:** `Trip.media` relation is NOT used anywhere in the codebase.

```prisma
model Trip {
  // ... existing fields
  // media  CharterMedia[]  ❌ REMOVE - confirmed unused
}
```

#### 3.5 Remove MediaKind Enum Values

```prisma
enum MediaKind {
  CHARTER_PHOTO
  // CHARTER_VIDEO  ❌ REMOVE - videos now in CaptainVideo table only
  CAPTAIN_AVATAR
  // TRIP_MEDIA     ❌ REMOVE - Trip.media relation unused and removed
}
```

**Run migration:**

```bash
npm run prisma:migrate -- --name "remove_legacy_media_fields"
```

---

## Future Improvements (Post-Cleanup)

### A) Orphan Media Management

**Problem:** Videos/photos without `charterId` after upload (work in progress, abandoned drafts)

**Current approach:** Manual cleanup - staff can identify and handle orphans as needed

**Future automation (when volume becomes overwhelming):**

1. **Auto-fill script** (for existing data when captain has only 1 charter):

   ```sql
   -- Link orphan videos to captain's charter (1:1 relationship)
   UPDATE "CaptainVideo" cv
   SET "charterId" = c.id
   FROM "Charter" c
   WHERE cv."captainId" = c."captainId"
   AND cv."charterId" IS NULL
   AND c."captainId" IN (
     -- Only captains with exactly 1 charter
     SELECT "captainId" FROM "Charter"
     GROUP BY "captainId"
     HAVING COUNT(*) = 1
   );

   -- Link orphan photos similarly
   UPDATE "CharterMedia" cm
   SET "charterId" = c.id
   FROM "Charter" c
   WHERE cm."captainId" = c."captainId"
   AND cm."charterId" IS NULL
   AND c."captainId" IN (
     SELECT "captainId" FROM "Charter"
     GROUP BY "captainId"
     HAVING COUNT(*) = 1
   );
   ```

2. **Identify true orphans** (no captain or charter):

   ```sql
   -- Videos with no captain (true orphans - should not happen)
   SELECT * FROM "CaptainVideo" WHERE "captainId" IS NULL;

   -- Photos with no captain (true orphans - should not happen)
   SELECT * FROM "CharterMedia" WHERE "captainId" IS NULL;
   ```

3. **UI for orphan media:**
   - Staff dashboard: Show media without `charterId`
   - Action: "Add to Charter" button
   - Captain dashboard: "Unused Media" section

### B) Support Multiple Charters Per Captain

When 1-captain-many-charters is needed:

1. **Upload flow:** Allow captain to select target charter
2. **Media library:** Show all media with charter assignments
3. **Reuse media:** Allow linking same video/photo to multiple charters

---

## Testing Checklist

### Before Schema Changes

- [ ] New registrations create videos in `CaptainVideo` only
- [ ] Photos go to `CharterMedia` with `charterId` set correctly
- [ ] Edit mode (PATCH) doesn't touch videos
- [ ] Finalize updates `CaptainVideo.charterId` correctly
- [ ] Charter GET returns photos from `CharterMedia`
- [ ] Charter GET returns videos from `CaptainVideo`

### After Schema Changes

- [ ] Migrations run without errors
- [ ] No broken foreign key constraints
- [ ] All charter pages display media correctly
- [ ] Video upload/processing still works
- [ ] Photo upload still works
- [ ] Edit charter media works (photos only)

### Edge Cases

- [ ] Charter with no photos (should fail validation)
- [ ] Charter with no videos (should succeed)
- [ ] Orphan videos (no charterId) don't break pages
- [ ] Deleted videos don't appear in charter displays
- [ ] Failed video processing shows proper status

---

## Rollback Plan

If issues arise after deployment:

1. **Code rollback:** Revert to previous commit before Phase 1
2. **Schema rollback:**

   ```bash
   npm run prisma:migrate -- reset
   # Then restore from backup
   ```

3. **Data recovery:** Restore from database backup (within 24h window)

---

## Migration Commands

```bash
# Phase 1: Code updates (no migration needed)
git commit -m "refactor: separate photo/video media handling"

# Phase 2: Add relation
npm run prisma:migrate -- --name "add_charter_video_relation"
npm run prisma:generate

# Phase 3: Remove legacy fields (CAREFUL!)
npm run prisma:migrate -- --name "remove_legacy_media_fields"
npm run prisma:generate

# Verify changes
npm run typecheck
npm run test:ci
```

---

## Constraints & Considerations

### Database Constraints

1. **Foreign keys:** `CaptainVideo.charterId` references `Charter.id` (nullable, with `onDelete: SetNull`)
2. **Nullability:** `charterId` remains optional - media belongs to captain, can exist without charter assignment
3. **Indexes:** Add index on `CaptainVideo.charterId` for query performance and sorting (mirrors `CharterMedia` indexing)

### Application Constraints

1. **Finalize validation:** Require minimum 3 photos in `CharterMedia`
2. **Video status:** Only show videos with `processStatus = 'ready'`
3. **Deletion:** Unlink videos when charter deleted (set `charterId = null`), don't cascade delete - videos remain owned by captain
4. **Orphan definition:** True orphans have no `captainId` AND no `charterId` - media always belongs to captain first

### Business Logic

1. **1-to-1 captain-charter:** Current assumption, will need update for multi-charter
2. **Orphan handling:** Manual cleanup for now, auto-cleanup when volume becomes overwhelming
3. **Media ownership:** Both videos and photos owned by captain (`captainId`) - consistent ownership model across all media types

---

## Decisions Made

1. **Trip media:** ✅ `Trip.media` relation is NOT used - will be removed in Phase 3
2. **Cascade delete:** ✅ Deleting charter will UNLINK videos (set `charterId = null`), not delete them
3. **Orphan cleanup:** ✅ Manual cleanup for now, consider auto-cleanup when volume becomes issue
4. **Video storage:** ✅ Store metadata in `CaptainVideo` only, no duplication to `CharterMedia`
5. **Media ownership:** ✅ Change videos to use `captainId` (same as photos) for consistent ownership model

---

## References

- Original schema: `prisma/schema.prisma`
- Finalize route: `src/app/api/charter-drafts/[id]/finalize/route.ts`
- Video pipeline docs: `docs/API_VIDEO_ROUTES.md`
- Media upload: `src/app/api/blob/upload/route.ts`
- Photo upload: `src/app/api/media/photo/route.ts`

---

**Next Steps:**

1. Review this plan with team
2. Create feature branch: `refactor/media-separation`
3. Implement Phase 1 (code updates)
4. Test thoroughly on staging
5. Deploy to production
6. Monitor for 1 week
7. Proceed with Phase 2 (schema updates)
