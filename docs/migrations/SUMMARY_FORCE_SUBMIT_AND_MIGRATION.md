# Force Submit & Media Migration Summary

## What Was Implemented

### 1. Force Submit Feature ✅

**Location**: `/staff/registrations/[id]`

**Purpose**: Allow admin/staff to finalize draft registrations on behalf of users

**Components**:

- `ForceSubmitButton` - Client component with confirmation dialog
- `forceSubmit()` - Server action that:
  - Validates admin permissions
  - Extracts media from draft.data
  - Calls finalize endpoint with `adminUserId` parameter
  - Uses user's ID (not admin's ID) for submission

**Current Behavior**:

- ✅ Submits photos from `draft.data.uploadedPhotos`
- ⚠️ Skips videos (validation pattern mismatch - see Known Issues)
- ✅ Requires minimum 3 photos
- ✅ Shows detailed error messages on validation failure
- ✅ Displays media count in UI (X photos, Y videos)

**Files Modified**:

- `src/app/(admin)/staff/registrations/[id]/page.tsx` - Added forceSubmit action
- `src/app/(admin)/staff/registrations/[id]/_components/ForceSubmitButton.tsx` - Created component

---

### 2. Database Migration ✅

**Migration**: `20251017152156_add_captain_id_to_charter_media`

**Changes**:

- Added `captainId` field to `CharterMedia` (optional String)
- Added foreign key to `CaptainProfile`
- Added indexes: `[captainId, createdAt]`, `[charterId, sortOrder]`
- **Backfilled** all existing records with `captainId` from `charter.captainId`

**Verification Results**:

```
✅ Total CharterMedia records: 110
✅ Records with captainId: 110/110 (100%)
✅ Records without captainId: 0
✅ Mismatches: 0
```

**Files Modified**:

- `prisma/schema.prisma` - Updated CharterMedia model
- `prisma/migrations/20251017152156_add_captain_id_to_charter_media/migration.sql` - Created

**Verification Scripts**:

- `scripts/verify-charter-media-captain-id.ts` - TypeScript version (requires env)
- `scripts/verify-charter-media-captain-id.sql` - SQL version (used for verification)

---

## Architecture Decision

### Current Problem

**Photos** (synchronous):

- Upload during form → stored in `draft.data.uploadedPhotos[]`
- Sent in finalize payload → validated → `CharterMedia` created
- Requires `charterId` (can't exist without charter)

**Videos** (asynchronous):

- Upload during form → `CaptainVideo` created immediately
- Processed in background → ready for use
- Independent of charter creation

**Issue**: Inconsistent patterns, media payload validation is strict

### Future Architecture

**Both photos and videos**:

- Upload during form → media record created immediately
- Photos → `CharterMedia` (with `captainId`, temp `charterId`)
- Videos → `CaptainVideo` (with `ownerId`)
- Finalize queries existing media → links to charter
- **No media payload needed**

---

## Known Issues

### 1. Video Storage Key Validation ⚠️

**Problem**: Videos use storage key pattern `captain-videos/*` which doesn't match `FinalizeMediaSchema` validation (expects `captains/*/media/*` or `charters/*/media/*`)

**Current Workaround**: Skip videos in force submit payload (they're already in `CaptainVideo` table)

**Proper Solution**: Remove media payload requirement from finalize (Phase 5)

### 2. CaptainProfile Creation Timing

**Question**: When is `CaptainProfile` created?

- On first OAuth signup?
- On first draft save?
- On first upload?

**Impact**: Photo upload will need to handle missing profile gracefully

### 3. Orphaned Media Cleanup

**Issue**: Draft deletion doesn't clean up associated `CharterMedia` records

**Options**:

- Cascade delete (immediate cleanup)
- Mark as orphaned (cleanup job handles it)

---

## Next Steps

See detailed plan in `docs/migrations/TODO_CHARTER_MEDIA.md`

### Immediate (Phase 2)

1. Update `/api/blob/upload` to create `CharterMedia` for photos
2. Set `captainId` on upload, use `"temp-{draftId}"` for `charterId`
3. Update form state to track `charterMediaId`

### Short-term (Phase 3)

1. Update finalize to query pending `CharterMedia` by `captainId`
2. Implement dual-path finalize (pending media OR payload)
3. Update force submit to use pending media (remove payload)

### Long-term (Phase 5)

1. Make `charterId` optional in schema
2. Remove media payload from finalize entirely
3. Add cleanup cron job for temp media
4. Build admin tools for pending media management

---

## Testing Done

- ✅ Migration applied successfully
- ✅ Backfill verified (110/110 records)
- ✅ Force submit works with photos
- ✅ Error messages show validation details
- ✅ Media count displays correctly

## Testing Needed

- [ ] Force submit with 0 photos (should error)
- [ ] Force submit with 1-2 photos (should error, need 3+)
- [ ] Force submit with 3+ photos (should succeed)
- [ ] Force submit preserves photo order
- [ ] Force submit sets cover photo correctly
- [ ] Admin impersonation works (`?adminUserId=...`)

---

## Documentation

- [x] Migration plan: `docs/migrations/CHARTER_MEDIA_MIGRATION.md`
- [x] Todo list: `docs/migrations/TODO_CHARTER_MEDIA.md`
- [x] Summary: This file
- [ ] Update API docs when finalize changes
- [ ] Update architecture diagrams

---

## Metrics to Monitor

After deployment:

- CharterMedia creation rate (should increase after Phase 2)
- Finalize success rate (should stay stable)
- Force submit usage (admin tool adoption)
- Orphaned media count (cleanup effectiveness)
- Storage costs (more media stored upfront)

---

## Questions for Product/Team

1. **CaptainProfile creation**: When should it happen? (affects Phase 2)
2. **Orphaned media**: Cascade delete or cleanup job? (affects Phase 2/5)
3. **Feature flag**: Do we want gradual rollout? (affects deployment)
4. **Video support**: When to fix video finalization? (affects priority)
5. **Admin tools**: What pending media management features needed? (affects Phase 5)

---

## References

- Prisma schema: `prisma/schema.prisma`
- Force submit: `src/app/(admin)/staff/registrations/[id]/page.tsx`
- Finalize endpoint: `src/app/api/charter-drafts/[id]/finalize/route.ts`
- Video docs: `docs/features/VIDEO-UPLOAD-SYSTEM.md`
- Copilot instructions: `.github/copilot-instructions.md`
