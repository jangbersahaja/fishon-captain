# Media Separation - Clarifications & Updates

**Date:** October 21, 2025  
**Status:** Documentation Updated

---

## Key Clarifications Received

### 1. Media Ownership Model ✅

**Previous assumption:** Videos owned by `User` (via `ownerId`), Photos owned by `CaptainProfile` (via `captainId`)

**✅ Corrected:** Both videos AND photos owned by `CaptainProfile` (via `captainId`)

**Impact:**

- **Risk:** Low - straightforward column rename with data migration
- **Benefits:** Consistent ownership model, simpler queries, clearer data relationships
- **Migration:** `ownerId` (userId) → `captainId` (CaptainProfile.id)

**Implementation:** Phase 3 - requires data migration script

```sql
-- Populate captainId from ownerId → userId → CaptainProfile
UPDATE "CaptainVideo" cv
SET "captainId" = cp.id
FROM "CaptainProfile" cp
WHERE cv."ownerId" = cp."userId";
```

---

### 2. Orphan Media Definition ✅

**Previous assumption:** `charterId = null` means orphan

**✅ Corrected:** Media ALWAYS belongs to captain first

- Media with `charterId = null` is work-in-progress (uploaded but not finalized)
- **True orphan** = no `captainId` AND no `charterId` (should not happen in normal flow)

**Impact:**

- Orphans are NOT created during normal workflow
- If captain exists, media belongs to captain (even without charter)
- Orphans only occur from data inconsistency or system errors

---

### 3. Charter Deletion Behavior ✅

**Question:** Delete videos or unlink when charter deleted?

**✅ Decision:** UNLINK (set `charterId = null`)

**Rationale:**

- Videos belong to captain, not charter
- Captain may want to reuse videos in future charters
- Videos remain accessible in captain's media library

**Implementation:**

```prisma
charter Charter? @relation(fields: [charterId], references: [id], onDelete: SetNull)
```

---

### 4. Orphan Cleanup Strategy ✅

**Question:** Auto-delete orphans or manual cleanup?

**✅ Decision:** Manual cleanup for now, auto-cleanup when volume becomes overwhelming

**Current approach:**

- Staff dashboard can identify media without `charterId`
- Manual review and action (delete or assign to charter)
- No automatic deletion scheduled

**Future automation (when needed):**

- Auto-link orphans when captain has exactly 1 charter
- Alert staff when orphan count exceeds threshold
- Scheduled cleanup job for true orphans (no captain)

---

### 5. Trip Media Relation ✅

**Question:** Is `Trip.media` relation used anywhere?

**✅ Confirmed:** NO - will be removed in Phase 3

**Implementation:**

- Remove `media CharterMedia[]` from `Trip` model
- Remove `TRIP_MEDIA` from `MediaKind` enum
- Remove `tripId` column from `CharterMedia` table

---

### 6. Video Metadata Storage ✅

**Question:** Store thumbnails in `CaptainVideo` only or duplicate to `CharterMedia`?

**✅ Decision:** `CaptainVideo` only, no duplication

**Rationale:**

- Type can be traced using blobKey pattern
- Avoid data duplication and sync issues
- Single source of truth for video metadata

**Implementation:**

- Video thumbnails: `CaptainVideo.thumbnailUrl`
- Video duration: `CaptainVideo.processedDurationSec`
- No need for `CharterMedia.thumbnailUrl` or `durationSeconds` for videos

---

### 7. Index on charterId ✅

**Confirmation:** Add index on `CaptainVideo.charterId` for query performance

**Purpose:**

- Faster queries when fetching charter videos
- Enable efficient sorting and ordering
- Mirrors existing `CharterMedia` indexing pattern

**Implementation:**

```prisma
@@index([charterId])  // For sorting and ordering
```

---

## Updated Phase 3 Migration

Phase 3 now includes TWO major changes:

### A) Change ownerId → captainId

**What:**

- Rename column in `CaptainVideo` table
- Change relation from `User` to `CaptainProfile`
- Update indexes

**Why:**

- Consistent ownership model with photos
- Clearer data relationships
- Simpler queries (no join through User → CaptainProfile)

**Migration steps:**

1. Add `captainId` column
2. Populate from `ownerId` via `CaptainProfile` lookup
3. Make `captainId` non-nullable
4. Drop `ownerId` column
5. Update indexes

### B) Remove Legacy Fields

**What:**

- Remove unused columns from `CharterMedia`
- Remove unused relations
- Clean up `MediaKind` enum

**Why:**

- Simplify schema
- Improve query performance
- Remove technical debt

---

## Risk Assessment Updates

### Low Risk Changes ✅

- Adding `Charter.videos` relation (Phase 2)
- Adding `onDelete: SetNull` behavior (Phase 2)
- Code changes in finalize/fetch routes (Phase 1)
- Changing `ownerId` → `captainId` (Phase 3, with proper testing)

### Medium Risk Changes ⚠️

- Data migration for `ownerId` → `captainId` (Phase 3)
- Removing legacy fields (Phase 3)

### Mitigation Strategies

1. **Data migration testing:**

   - Test migration on staging with production data copy
   - Verify all records migrated successfully
   - Check for orphan videos (no `captainId`)

2. **Rollback preparation:**

   - Full database backup before Phase 3
   - Documented rollback procedure
   - Ability to restore within 1 hour if issues

3. **Monitoring:**
   - Error rates during migration
   - Query performance after migration
   - Business metrics (registration completion rate)

---

## Updated Implementation Timeline

### Phase 1: Code Changes (Week 1)

- Update finalize route
- Update fetch routes
- Remove video handling from edit routes
- **No schema changes, fully reversible**

### Phase 2: Add Relations (Week 2)

- Add `Charter.videos` relation
- Add `onDelete: SetNull` behavior
- Add `charterId` index
- **Additive only, low risk**

### Phase 3: Data Migration & Cleanup (Week 3-4)

- Migrate `ownerId` → `captainId`
- Remove legacy fields
- Update indexes
- **Requires backup, medium risk**

**Total timeline:** 3-4 weeks for complete rollout

---

## Testing Additions

### New Tests for captainId Migration

```typescript
// Test video ownership via captainId
describe("CaptainVideo ownership", () => {
  it("should link video to captain profile", async () => {
    const video = await prisma.captainVideo.findUnique({
      where: { id: videoId },
      include: { captain: true },
    });
    expect(video.captain).toBeDefined();
    expect(video.captain.userId).toBe(userId);
  });

  it("should find all videos for captain", async () => {
    const videos = await prisma.captainVideo.findMany({
      where: { captainId: captainProfileId },
    });
    expect(videos.length).toBeGreaterThan(0);
  });
});
```

### Data Migration Verification

```sql
-- Before migration: Check ownerId coverage
SELECT
  COUNT(*) as total_videos,
  COUNT(DISTINCT "ownerId") as unique_owners,
  COUNT(*) FILTER (WHERE "ownerId" IS NULL) as orphan_videos
FROM "CaptainVideo";

-- After migration: Verify captainId population
SELECT
  COUNT(*) as total_videos,
  COUNT(DISTINCT "captainId") as unique_captains,
  COUNT(*) FILTER (WHERE "captainId" IS NULL) as failed_migrations
FROM "CaptainVideo";

-- Should show: failed_migrations = 0
```

---

## Documentation Updates Applied

✅ **MEDIA_SEPARATION_CLEANUP.md** - Full technical plan

- Updated constraints section
- Added decisions section
- Updated Phase 3 with data migration
- Updated orphan management examples

✅ **MEDIA_SEPARATION_SUMMARY.md** - Executive summary

- Updated risk assessment
- Added decision confirmations
- Clarified ownership model

✅ **MEDIA_SEPARATION_CHECKLIST.md** - Implementation checklist

- Added captainId migration steps
- Added data verification queries
- Updated test requirements

✅ **MEDIA_SEPARATION_QUICKREF.md** - Quick reference

- Updated schema patterns
- Added migration commands

---

## Open Items

### Still To Decide

1. **Multi-charter timeline:** When will 1-captain-many-charters be needed?

   - Impacts orphan auto-link strategy
   - Affects UI for media management

2. **Orphan alert threshold:** At what count should we enable auto-cleanup?

   - Recommendation: Start monitoring when >100 orphans per captain

3. **Video reuse policy:** Can videos be shared across multiple charters?
   - Currently: 1 video → 1 charter (via `charterId`)
   - Future: May need many-to-many relation

---

## Next Actions

1. ✅ Review updated documentation
2. ⏳ Team alignment meeting
3. ⏳ Create feature branch
4. ⏳ Start Phase 1 implementation
5. ⏳ Prepare staging environment
6. ⏳ Plan Phase 3 migration window (low-traffic time)

---

**Updated by:** Documentation review  
**Approved by:** _Pending team review_  
**Implementation start:** _TBD_
