# Media Separation Cleanup - Executive Summary

**Created:** October 21, 2025  
**Status:** ✅ Ready for Implementation

---

## What We're Doing

Completing the separation of photo and video storage after deleting all `CHARTER_VIDEO` records:

- **CharterMedia table** = Photos only
- **CaptainVideo table** = Videos only
- Both link to Charter via their respective foreign keys

---

## Why This Matters

1. **Clean architecture**: Each table has a single responsibility
2. **Independent workflows**: Photos and videos upload/edit separately
3. **Future-proof**: Ready for 1-captain-many-charters feature
4. **Performance**: Proper indexing and relations

---

## What Changes

### Code Changes (Phase 1 - Safe to deploy)

#### ✅ Finalize Route

**Stop creating** `CharterMedia` records for videos. Just update `CaptainVideo.charterId`.

**File:** `/api/charter-drafts/[id]/finalize/route.ts` (lines 662-672)

#### ✅ Media Fetch Routes

**Fetch videos from** `CaptainVideo` table instead of filtering `CharterMedia` by kind.

**Files:**

- `/api/charters/[id]/route.ts`
- `/api/charters/[id]/get/route.ts`
- Various thumbnail/video routes

#### ✅ Edit Media Route

**Remove video handling** - videos edit independently via their own table.

**File:** `/api/charters/[id]/media/route.ts`

#### ✅ Server Charter Creation

**Remove video creation** from media array.

**File:** `/src/server/charters.ts`

### Schema Changes (Phase 2 - After code is tested)

#### Add Direct Relation

```prisma
model Charter {
  videos  CaptainVideo[]  // NEW
}

model CaptainVideo {
  charterId  String?
  charter    Charter?  @relation(fields: [charterId], references: [id])
}
```

### Schema Cleanup (Phase 3 - Final cleanup)

#### Remove from CharterMedia

- `tripId` - fully legacy
- `kind` - photos only now
- `thumbnailUrl` - not for photos
- `durationSeconds` - not for photos
- `captainVideos` relation - reverse relation

#### Remove from CaptainVideo

- `charterMediaId` - no longer needed
- `charterMedia` relation - no longer needed

---

## Critical Findings

### 🔴 Issue 1: Finalize Creates Duplicate Records

**Location:** `/api/charter-drafts/[id]/finalize/route.ts:662-672`

Videos are uploaded to `CaptainVideo`, but finalize creates a duplicate `CharterMedia` record:

```typescript
// ❌ BAD: Creates duplicate in wrong table
const charterMedia = await prisma.charterMedia.create({
  data: {
    kind: "CHARTER_VIDEO", // Wrong table!
    charterId: charter.id,
    // ...
  },
});

// ✅ GOOD: Just link the existing video
await prisma.captainVideo.update({
  where: { id: video.id },
  data: { charterId: charter.id },
});
```

### 🟡 Issue 2: Media Routes Filter by Kind

Multiple routes filter `CharterMedia` by kind to separate photos/videos. After cleanup, videos won't be in `CharterMedia` at all.

**Solution:** Fetch videos from `CaptainVideo` table directly.

### 🟡 Issue 3: Edit Route Handles Videos

The PUT endpoint at `/api/charters/[id]/media/route.ts` accepts and creates video records in `CharterMedia`.

**Solution:** Remove video handling. Videos already have independent edit via `CaptainVideo` table.

---

## Implementation Strategy

### Stage 1: Code Updates (No Schema Changes)

**Goal:** Make code work with new architecture without schema changes.

**Steps:**

1. Update finalize route to only link videos (not create `CharterMedia`)
2. Update all media fetch routes to query `CaptainVideo` for videos
3. Remove video handling from edit media route
4. Remove video creation from server charter creation

**Safety:** Fully backward compatible. Can rollback easily.

**Testing:** Staging deployment with full registration flow testing.

### Stage 2: Add Schema Relations (Minor Migration)

**Goal:** Add proper foreign key relation.

**Steps:**

1. Add `videos` relation to `Charter` model
2. Add `charter` relation to `CaptainVideo` model
3. Keep legacy fields (no breaking changes yet)

**Migration:**

```bash
npm run prisma:migrate -- --name "add_charter_video_relation"
```

**Safety:** Additive only. No data loss risk.

### Stage 3: Remove Legacy Fields (Final Cleanup)

**Goal:** Clean up unused columns.

**Steps:**

1. Confirm no production usage of legacy fields
2. Create documentation of removed fields
3. Run migration to drop columns

**Migration:**

```bash
npm run prisma:migrate -- --name "remove_legacy_media_fields"
```

**Safety:** Requires confirmation of no usage. Can't rollback without restore.

---

## Files to Modify

### Primary Changes

| File                                         | Change                                  | Impact      |
| -------------------------------------------- | --------------------------------------- | ----------- |
| `/api/charter-drafts/[id]/finalize/route.ts` | Remove CharterMedia creation for videos | 🔴 Critical |
| `/api/charters/[id]/route.ts`                | Fetch videos from CaptainVideo          | 🔴 Critical |
| `/api/charters/[id]/get/route.ts`            | Fetch videos from CaptainVideo          | 🔴 Critical |
| `/api/charters/[id]/media/route.ts`          | Remove video handling                   | 🟡 Medium   |
| `/src/server/charters.ts`                    | Remove video from media array           | 🟡 Medium   |

### Supporting Changes

| File                                                | Change                                  | Impact |
| --------------------------------------------------- | --------------------------------------- | ------ |
| `/api/charters/[id]/thumbnails/route.ts`            | Query CaptainVideo directly             | 🟢 Low |
| `/api/charters/[id]/media/video/thumbnail/route.ts` | Query CaptainVideo directly             | 🟢 Low |
| `/app/(admin)/staff/media/data.ts`                  | Use charterId instead of charterMediaId | 🟢 Low |

---

## Testing Requirements

### Functional Tests

- ✅ New registration with photos and videos
- ✅ Edit existing charter (photos only)
- ✅ Video upload during registration
- ✅ Photo upload during registration
- ✅ Charter display shows both photos and videos
- ✅ Staff media dashboard shows correct relationships
- ✅ Video processing pipeline still works
- ✅ Finalize with orphan videos
- ✅ Finalize with orphan photos

### Edge Cases

- Charter with no videos (should succeed)
- Charter with failed video processing (shouldn't block)
- Orphan media (no charterId)
- Deleted videos (originalDeletedAt set)
- Video status: queued, processing, failed, cancelled

### Performance Tests

- Query time for charter with many photos
- Query time for charter with many videos
- Index usage verification

---

## Risk Assessment

### Low Risk ✅

- Adding schema relations (Phase 2)
- Code updates in isolated routes
- Video upload flow (already working correctly)
- Changing `ownerId` to `captainId` (straightforward migration)

### Medium Risk ⚠️

- Finalize route changes (complex transaction)
- Media fetch route changes (used in multiple places)
- Staff dashboard changes (relationship tracking)

### High Risk 🔴

- Schema cleanup (Phase 3) - requires data migration for `ownerId` → `captainId`
- Production data should be backed up before Phase 3

---

## Rollback Plan

### Phase 1 (Code)

```bash
git revert <commit-hash>
git push
# Redeploy previous version
```

### Phase 2 (Schema)

```bash
# Revert migration
npm run prisma:migrate -- resolve --rolled-back <migration-name>
npm run prisma:generate
```

### Phase 3 (Cleanup)

**No automatic rollback.** Must restore from backup:

1. Stop application
2. Restore database from backup
3. Revert code to pre-cleanup version
4. Restart application

---

## Future Enhancements

### Orphan Media Management

**Problem:** Photos/videos uploaded but not linked to charter (draft abandoned)

**Solutions:**

1. **Auto-cleanup job:** Delete orphans older than 30 days
2. **Staff dashboard:** "Orphan Media" view with manual link/delete
3. **Captain dashboard:** "Unused Media" section to reuse in new charters

### Multi-Charter Support

**When needed:** Captain can have multiple charters

**Changes:**

1. Upload flow: Let captain select target charter
2. Media library: Show all media with charter badges
3. Reuse: Allow same video/photo in multiple charters

---

## Success Metrics

### Technical

- [ ] Zero `CHARTER_VIDEO` records in `CharterMedia` table
- [ ] All videos have `charterId` after finalize
- [ ] All charter pages load within 500ms
- [ ] No N+1 query issues

### Business

- [ ] No regression in registration completion rate
- [ ] No increase in support tickets about media
- [ ] Video processing success rate unchanged

---

## Timeline Estimate

- **Phase 1 (Code):** 2-3 days development + 1 week testing
- **Phase 2 (Schema):** 1 day + 1 week monitoring
- **Phase 3 (Cleanup):** 1 day (after confirmation safe)

**Total:** ~3 weeks for complete rollout

---

## Dependencies

### Required

- Prisma 5.x
- PostgreSQL with full foreign key support
- Vercel Blob for media storage

### Nice to Have

- Database backup before Phase 3
- Staging environment for testing
- Monitoring/alerting for query performance

---

## Questions for Product Team

1. ✅ **Orphan cleanup:** Manual cleanup for now, auto-delete when volume overwhelms
2. ✅ **Video failures:** Failed videos shouldn't block charter display
3. ⏳ **Multi-charter:** Timeline for 1-captain-many-charters feature?
4. ✅ **Trip media:** `Trip.media` relation confirmed unused - will be removed

**Decisions Made:**

- Media ownership: Both photos and videos use `captainId` (consistent model)
- Charter deletion: Unlinks videos (sets `charterId = null`), doesn't delete them
- Orphans: Media always belongs to captain first; true orphans have neither captain nor charter
- Video storage: Metadata in `CaptainVideo` only, type traced via blobKey

---

## Documentation Updates Needed

After completion:

- [x] This cleanup plan
- [ ] Update API route documentation
- [ ] Update video pipeline docs
- [ ] Update schema documentation
- [ ] Add migration notes to README
- [ ] Update developer onboarding guide

---

## Next Steps

1. **Review** this plan with team (30 min meeting)
2. **Create** feature branch: `refactor/media-separation`
3. **Implement** Phase 1 code changes
4. **Deploy** to staging and test thoroughly
5. **Monitor** staging for 48 hours
6. **Deploy** to production
7. **Monitor** production for 1 week
8. **Proceed** with Phase 2 and 3 if stable

---

**Full details:** See `MEDIA_SEPARATION_CLEANUP.md`
