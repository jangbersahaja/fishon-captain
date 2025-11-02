# Media Separation - Implementation Checklist

**Branch:** `refactor/media-separation`  
**Target:** fishon-captain  
**Status:** 📋 Ready to Start

---

## Phase 1: Code Changes (No Schema Migration)

### 1. Finalize Route - Remove Video CharterMedia Creation

- [ ] File: `/api/charter-drafts/[id]/finalize/route.ts`
- [ ] Remove lines 662-672 (CharterMedia creation for videos)
- [ ] Replace with: `prisma.captainVideo.update({ where: { id: video.id }, data: { charterId: charter.id } })`
- [ ] Test: New registration with videos
- [ ] Test: Finalize with orphan videos

**Impact:** 🔴 Critical - affects all new registrations

### 2. Charter GET Route - Fetch Videos Separately

- [ ] File: `/api/charters/[id]/route.ts`
- [ ] Add `CaptainVideo` include to charter query (around line 480)
- [ ] Change media filter from `kind === "CHARTER_PHOTO"` to just fetch all (photos only now)
- [ ] Map `charter.videos` to response format
- [ ] Remove video filtering from `charter.media` (lines 494-497)
- [ ] Test: Charter display page shows videos
- [ ] Test: Video thumbnails display correctly

**Impact:** 🔴 Critical - affects charter display

### 3. Charter GET Detail Route - Fetch Videos Separately

- [ ] File: `/api/charters/[id]/get/route.ts`
- [ ] Add `CaptainVideo` to include (similar to above)
- [ ] Remove kind filtering (lines 72, 80)
- [ ] Map videos from `charter.videos`
- [ ] Test: Edit mode loads existing videos

**Impact:** 🔴 Critical - affects edit flow

### 4. Edit Media Route - Remove Video Handling

- [ ] File: `/api/charters/[id]/media/route.ts`
- [ ] Remove `videoCreates` array creation (lines 119-127)
- [ ] Remove videos from media creation
- [ ] Update validation to reject videos in payload
- [ ] Test: Edit photos only
- [ ] Test: Attempting to add videos returns error

**Impact:** 🟡 Medium - edit flow changes

### 5. Server Charter Creation - Remove Video Media

- [ ] File: `/src/server/charters.ts`
- [ ] Remove `CHARTER_VIDEO` creation (line 203)
- [ ] Keep photos only in media array
- [ ] Test: Server-side charter creation (if used)

**Impact:** 🟡 Medium - server-side creation

### 6. Thumbnail Routes - Query CaptainVideo Directly

- [ ] File: `/api/charters/[id]/thumbnails/route.ts`
- [ ] Change query from `CharterMedia` to `CaptainVideo` (line 33)
- [ ] Update where clause
- [ ] Test: Thumbnail generation

**Impact:** 🟢 Low - thumbnail generation

### 7. Video Thumbnail Route - Query CaptainVideo Directly

- [ ] File: `/api/charters/[id]/media/video/thumbnail/route.ts`
- [ ] Change query from `CharterMedia` to `CaptainVideo` (line 60)
- [ ] Remove kind filter
- [ ] Test: Video thumbnail updates

**Impact:** 🟢 Low - thumbnail updates

### 8. Staff Media Dashboard - Update Relationships

- [ ] File: `/app/(admin)/staff/media/data.ts`
- [ ] Change `video.charterMediaId` to `video.charterId` (line 558)
- [ ] Update relationship edge type
- [ ] Test: Staff dashboard loads
- [ ] Test: Video relationships display correctly

**Impact:** 🟢 Low - admin dashboard

### 9. Admin Delete Route - Update Query

- [ ] File: `/api/admin/charters/[id]/delete/route.ts`
- [ ] Update media deletion logic (line 37)
- [ ] Handle `CaptainVideo` deletion separately
- [ ] Test: Charter deletion

**Impact:** 🟢 Low - admin operations

### 10. Captain Photos Route - Remove Kind Filter

- [ ] File: `/api/captain/photos/route.ts`
- [ ] Remove kind filter (line 23) - implicit now
- [ ] Test: Captain photo library

**Impact:** 🟢 Low - captain dashboard

---

## Testing Phase 1

### Happy Path Tests

- [ ] Complete new registration with 3+ photos
- [ ] Complete new registration with 1+ videos
- [ ] Complete new registration with photos + videos
- [ ] View charter page (photos visible)
- [ ] View charter page (videos visible with thumbnails)
- [ ] Edit existing charter (photos load)
- [ ] Edit existing charter (add new photos)
- [ ] Video upload during registration
- [ ] Video processing completes successfully

### Edge Case Tests

- [ ] Registration with no videos (should work)
- [ ] Registration with only 1-2 photos (should fail validation)
- [ ] Charter with failed video processing
- [ ] Charter with queued video (still processing)
- [ ] Charter with cancelled video
- [ ] Orphan videos (uploaded but no charterId)
- [ ] Orphan photos (uploaded but no charterId)
- [ ] Staff dashboard with mixed media
- [ ] Delete charter with videos
- [ ] Delete charter with photos only

### Regression Tests

- [ ] Existing charters still display correctly
- [ ] Video processing pipeline unchanged
- [ ] Photo upload flow unchanged
- [ ] Draft save/load works
- [ ] Auth and permissions unchanged

### Performance Tests

- [ ] Charter page load time < 500ms
- [ ] No N+1 queries in media fetching
- [ ] Staff dashboard loads with 100+ media items
- [ ] Video thumbnail generation time acceptable

---

## Phase 2: Schema Changes

### 1. Update Schema File

- [ ] File: `prisma/schema.prisma`
- [ ] Add `videos CaptainVideo[]` to `Charter` model
- [ ] Add `charter Charter?` relation to `CaptainVideo` model
- [ ] Add `@@index([charterId])` to `CaptainVideo`
- [ ] Keep legacy fields (charterMediaId, tripId, kind)

### 2. Run Migration

```bash
cd fishon-captain
npm run prisma:migrate -- --name "add_charter_video_relation"
npm run prisma:generate
```

- [ ] Migration runs without errors
- [ ] No foreign key constraint violations
- [ ] TypeScript types regenerated

### 3. Test Schema Changes

- [ ] Application starts without errors
- [ ] Queries use new relation
- [ ] No performance regression
- [ ] Indexes being used (check query plans)

---

## Phase 3: Schema Cleanup (DO LAST)

⚠️ **WARNING:** This phase is destructive. Only proceed after Phase 1 & 2 are stable in production for 1+ week.

### Pre-Cleanup Verification

- [ ] Confirm no code uses `CharterMedia.kind` for filtering
- [ ] Confirm no code uses `CharterMedia.tripId`
- [ ] Confirm no code uses `CharterMedia.thumbnailUrl` for photos
- [ ] Confirm no code uses `CharterMedia.durationSeconds` for photos
- [ ] Confirm no code uses `CaptainVideo.charterMediaId`
- [ ] Database backup completed
- [ ] Migration rollback plan documented

### 1. Create Legacy Documentation

- [ ] File: `docs/LEGACY_SCHEMA.md`
- [ ] Document all fields being removed
- [ ] Document reasons for removal
- [ ] Document migration path if needed

### 1. Update Schema File

- [ ] File: `prisma/schema.prisma`
- [ ] Add `videos CaptainVideo[]` to `Charter` model
- [ ] Add `charter Charter?` relation to `CaptainVideo` model with `onDelete: SetNull`
- [ ] Add `@@index([charterId])` to `CaptainVideo`
- [ ] Keep legacy fields (charterMediaId, tripId, kind, ownerId)

### 2. Run Migration

```bash
cd fishon-captain
npm run prisma:migrate -- --name "add_charter_video_relation"
npm run prisma:generate
```

- [ ] Migration runs without errors
- [ ] No foreign key constraint violations
- [ ] TypeScript types regenerated

### 3. Test Schema Changes

- [ ] Application starts without errors
- [ ] Queries use new relation
- [ ] No performance regression
- [ ] Indexes being used (check query plans)

---

## Phase 3: Schema Cleanup (DO LAST)

⚠️ **WARNING:** This phase includes data migration. Only proceed after Phase 1 & 2 are stable in production for 1+ week.

### Pre-Cleanup Verification

- [ ] Confirm no code uses `CharterMedia.kind` for filtering
- [ ] Confirm no code uses `CharterMedia.tripId`
- [ ] Confirm no code uses `CharterMedia.thumbnailUrl` for photos
- [ ] Confirm no code uses `CharterMedia.durationSeconds` for photos
- [ ] Confirm no code uses `CaptainVideo.charterMediaId`
- [ ] Confirm all code updated from `ownerId` to `captainId`
- [ ] Database backup completed
- [ ] Migration rollback plan documented

### 1. Create Legacy Documentation

- [ ] File: `docs/LEGACY_SCHEMA.md`
- [ ] Document all fields being removed
- [ ] Document reasons for removal
- [ ] Document migration path if needed

### 2. Update Schema File - Part A: Change ownerId to captainId

- [ ] Change `ownerId` to `captainId` in `CaptainVideo`
- [ ] Change relation from `User` to `CaptainProfile`
- [ ] Update index from `[ownerId, processStatus]` to `[captainId, processStatus]`
- [ ] Add `@@index([charterId])` for sorting/ordering

**Data migration script:**

```sql
-- Add captainId column
ALTER TABLE "CaptainVideo" ADD COLUMN "captainId" TEXT;

-- Populate from ownerId → CaptainProfile
UPDATE "CaptainVideo" cv
SET "captainId" = cp.id
FROM "CaptainProfile" cp
WHERE cv."ownerId" = cp."userId";

-- Make non-nullable
ALTER TABLE "CaptainVideo" ALTER COLUMN "captainId" SET NOT NULL;

-- Drop old column
ALTER TABLE "CaptainVideo" DROP COLUMN "ownerId";

-- Update indexes
DROP INDEX IF EXISTS "CaptainVideo_ownerId_processStatus_idx";
CREATE INDEX "CaptainVideo_captainId_processStatus_idx" ON "CaptainVideo"("captainId", "processStatus");
CREATE INDEX "CaptainVideo_charterId_idx" ON "CaptainVideo"("charterId");
```

### 3. Update Schema File - Part B: Remove Legacy Fields

- [ ] Remove `kind` from `CharterMedia`
- [ ] Remove `tripId` from `CharterMedia`
- [ ] Remove `thumbnailUrl` from `CharterMedia`
- [ ] Remove `durationSeconds` from `CharterMedia`
- [ ] Remove `trip` relation from `CharterMedia`
- [ ] Remove `captainVideos` relation from `CharterMedia`
- [ ] Remove `charterMediaId` from `CaptainVideo`
- [ ] Remove `charterMedia` relation from `CaptainVideo`
- [ ] Update `MediaKind` enum (remove `CHARTER_VIDEO`)
- [ ] Remove `TRIP_MEDIA` from enum (Trip.media confirmed unused)
- [ ] Remove `media` relation from `Trip` model

### 4. Run Combined Migration

```bash
npm run prisma:migrate -- --name "migrate_captainid_and_remove_legacy_fields"
npm run prisma:generate
```

- [ ] Migration runs successfully
- [ ] Application starts without errors
- [ ] No runtime errors in logs

### 5. Verify Data Migration

```sql
-- Check all videos have captainId
SELECT COUNT(*) FROM "CaptainVideo" WHERE "captainId" IS NULL;
-- Should return 0

-- Verify captainId matches captain ownership
SELECT COUNT(*) FROM "CaptainVideo" cv
JOIN "CaptainProfile" cp ON cv."captainId" = cp.id
WHERE cp."userId" IS NULL;
-- Should return 0
```

### 6. Test Cleanup

- [ ] All Phase 1 tests still pass
- [ ] No references to removed fields
- [ ] Schema validation passes
- [ ] TypeScript compilation succeeds

---

## Deployment Plan

### Staging Deployment

1. [ ] Create branch: `git checkout -b refactor/media-separation`
2. [ ] Implement Phase 1 changes
3. [ ] Run tests locally: `npm run test:ci`
4. [ ] Run typecheck: `npm run typecheck`
5. [ ] Commit: `git commit -m "refactor: separate photo/video media handling"`
6. [ ] Push: `git push origin refactor/media-separation`
7. [ ] Create PR and request review
8. [ ] Deploy to staging after approval
9. [ ] Run full test suite on staging
10. [ ] Monitor staging for 48 hours

### Production Deployment (Phase 1)

1. [ ] Merge PR to main
2. [ ] Deploy to production
3. [ ] Monitor error logs for 1 hour
4. [ ] Test new registration flow in production
5. [ ] Monitor for 24 hours
6. [ ] If stable, proceed with Phase 2

### Production Deployment (Phase 2)

1. [ ] Ensure Phase 1 stable for 1 week
2. [ ] Run schema migration during low-traffic window
3. [ ] Monitor query performance
4. [ ] Rollback if issues detected within 1 hour

### Production Deployment (Phase 3)

1. [ ] Ensure Phase 2 stable for 1 week
2. [ ] Verify no code uses legacy fields
3. [ ] Create database backup
4. [ ] Run cleanup migration
5. [ ] Monitor for 48 hours
6. [ ] Document completion

---

## Rollback Procedures

### Phase 1 Rollback (Code)

```bash
git revert <commit-hash>
git push origin main
# Redeploy via Vercel dashboard or git push
```

### Phase 2 Rollback (Schema)

```bash
npx prisma migrate resolve --rolled-back 20250121_add_charter_video_relation
npx prisma migrate deploy
npm run prisma:generate
```

### Phase 3 Rollback (Cleanup)

**No automatic rollback. Requires database restore.**

```bash
# Stop application
# Restore from backup using pg_restore or cloud provider tools
# Revert code to before Phase 3
# Restart application
```

---

## Success Criteria

### Phase 1

- ✅ All tests pass
- ✅ No errors in production logs
- ✅ Registration completion rate unchanged
- ✅ Zero `CHARTER_VIDEO` records created in `CharterMedia`

### Phase 2

- ✅ Migration runs successfully
- ✅ Query performance unchanged
- ✅ Foreign key constraints working

### Phase 3

- ✅ Schema cleanup complete
- ✅ No legacy fields remain
- ✅ System stable for 1 week post-cleanup

---

## Monitoring Metrics

### During Rollout

- Error rate: Should remain < 0.1%
- API response time: Should remain < 500ms p95
- Registration completion: Should remain > 80%
- Video processing success: Should remain > 95%

### Database Metrics

- Query time for charter fetch: < 100ms
- Index usage: Confirm indexes being used
- Table sizes: CharterMedia should decrease over time

---

## Communication Plan

### Team Notifications

- [ ] Notify team before starting Phase 1
- [ ] Daily standup updates during implementation
- [ ] Notify team before staging deployment
- [ ] Notify team before production deployment
- [ ] Post-deployment status update

### Documentation Updates

- [ ] Update API documentation
- [ ] Update schema documentation
- [ ] Update developer onboarding guide
- [ ] Update troubleshooting guide

---

## Notes & Observations

### Code Quality

- All changes maintain existing error handling patterns
- Follows existing security headers approach
- Maintains backward compatibility during transition

### Performance Considerations

- Adding index on `CaptainVideo.charterId` in Phase 2
- Consider pagination for media lists in future
- Monitor N+1 query patterns

### Future Improvements

- Orphan media cleanup job
- Multi-charter support preparation
- Media reuse between charters
- Better video processing status UI

---

**Start Date:** **\*\***\_**\*\***  
**Phase 1 Complete:** **\*\***\_**\*\***  
**Phase 2 Complete:** **\*\***\_**\*\***  
**Phase 3 Complete:** **\*\***\_**\*\***  
**Project Complete:** **\*\***\_**\*\***
