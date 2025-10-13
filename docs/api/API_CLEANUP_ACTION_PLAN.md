# API Cleanup Action Plan

**Status**: Ready to execute  
**Date**: October 12, 2025  
**Priority**: Phase 2 - Safe deletions and consolidation

---

## Phase 2A: Safe Deletions (START HERE)

### ✅ Step 1: Remove Legacy Media Endpoints (SAFE - Already deprecated)

The following legacy endpoints reference the removed `PendingMedia` model and should be deleted:

**Files to Delete:**

```bash
# No actual route files exist - these were already removed!
# Only stale references remain in legacy components
```

**Code References to Clean:**

1. `src/features/charter-onboarding/components/VideoUploadSection.tsx`

   - Lines 23-24: Remove outdated comments about `/api/media/video` and `/api/media/pending`
   - Line 166: Remove fetch to `/api/media/video` (dead code)
   - Line 620: Remove fetch to `/api/media/pending` (dead code)
   - **ACTION**: This entire component appears legacy - check if it's still imported/used

2. `src/app/dev/debug/VideoUploadTest.tsx`

   - Lines 32, 63: References to deprecated endpoints
   - **ACTION**: Update to use new `EnhancedVideoUploader` or mark as deprecated

3. `src/app/dev/debug/DebugPanel.tsx`

   - Lines 138, 178-182, 335: References to `/api/media/pending`
   - **ACTION**: Remove or update debug panel tests

4. `src/app/api/dev/debug/route.ts`

   - Lines 44, 46: Update documentation strings
   - **ACTION**: Remove deprecated endpoint docs

5. Test file: `src/features/charter-onboarding/__tests__/useCharterMediaManager.pendingMedia.test.tsx`
   - **ACTION**: Review if this test is still relevant or rename/remove

**Verification Command:**

```bash
# Check if VideoUploadSection is still imported anywhere
grep -r "VideoUploadSection" src --exclude-dir=__tests__ --include="*.tsx" --include="*.ts"
```

---

## Phase 2B: Consolidate Video Worker Endpoints

### 🔍 Step 2: Review & Consolidate Worker Routes

**Current State:**

- `/api/videos/normalize` - purpose unclear
- `/api/videos/worker-normalize` - internal worker endpoint
- `/api/videos/normalize-callback` - QStash callback (KEEP - external contract)
- `/api/workers/transcode` - old transcode endpoint
- `/api/workers/transcode-simple` - simplified version
- `/api/jobs/transcode` - job queue endpoint
- `/api/transcode/complete` - completion callback

**Questions to Answer:**

1. Is `/api/videos/normalize` redundant with `/api/videos/worker-normalize`?
2. Are `/api/workers/transcode*` endpoints still used or replaced by videos pipeline?
3. Is `/api/jobs/transcode` actively used?
4. Is `/api/transcode/complete` related to old system?

**Investigation Commands:**

```bash
# Check usage of each endpoint
grep -r "/api/videos/normalize" src --exclude-dir=node_modules
grep -r "/api/workers/transcode" src --exclude-dir=node_modules
grep -r "/api/jobs/transcode" src --exclude-dir=node_modules
grep -r "/api/transcode/complete" src --exclude-dir=node_modules
```

**Recommended Action:**

- Read each route file to understand purpose
- Check git history for context: `git log --oneline -- src/app/api/workers/`
- Document which are legacy and create migration plan

---

## Phase 2C: Admin Routes Audit

### 📋 Step 3: Review Admin Endpoints

**Current Admin Routes:**

- `/api/admin/verification`
- `/api/admin/charters`
- `/api/admin/cleanup-edit-drafts`
- `/api/admin/media/delete`

**Checklist for Each Route:**

- [ ] Has proper ADMIN role check
- [ ] Uses rate limiting
- [ ] Has audit logging
- [ ] Follows security header pattern
- [ ] Has JSDoc documentation

**Action:** Run audit checklist and document findings

---

## Phase 3: Documentation & Standards

### 📝 Step 4: Add JSDoc to All Routes

**Template for Route Documentation:**

```typescript
/**
 * POST /api/endpoint-name
 *
 * Description of what this endpoint does.
 *
 * @auth Required - CAPTAIN role minimum
 * @ratelimit 5 requests per minute per user
 *
 * @body {object} RequestBody - Zod schema validation
 * @returns {object} ResponseData - Success response
 * @throws {401} Unauthorized - Missing or invalid session
 * @throws {403} Forbidden - Insufficient permissions
 * @throws {429} Rate limit exceeded
 *
 * @example
 * POST /api/endpoint-name
 * { "field": "value" }
 *
 * Response: { "ok": true, "data": {...} }
 */
export async function POST(req: NextRequest) {
  // Implementation
}
```

**Priority Routes to Document:**

1. All video pipeline routes
2. Charter/draft finalization routes
3. External worker callback routes

---

## Phase 4: Testing

### 🧪 Step 5: Add Integration Tests

**Missing Test Coverage:**

- [ ] `/api/videos/normalize-callback` - external worker contract
- [ ] `/api/blob/finish` - video queueing logic
- [ ] `/api/charter-drafts/[id]/finalize` - media association
- [ ] Admin endpoints - role checks and audit logging

**Test Template Location:** `src/server/__tests__/`

---

## Execution Plan

### Week 1: Investigation & Safe Deletions

1. ✅ **Monday**: Run grep commands to find all legacy endpoint references
2. ✅ **Tuesday**: Check if `VideoUploadSection` is still used
3. **Wednesday**: Remove or update legacy component references
4. **Thursday**: Run tests to ensure nothing breaks
5. **Friday**: Commit Phase 2A changes

### Week 2: Worker Consolidation

1. **Monday**: Read all worker/transcode route files
2. **Tuesday**: Document purpose and usage of each
3. **Wednesday**: Create deprecation plan for redundant endpoints
4. **Thursday**: Update worker code to use consolidated endpoints
5. **Friday**: Commit Phase 2B changes

### Week 3: Admin Audit & Documentation

1. **Monday-Tuesday**: Run admin route security audit
2. **Wednesday-Thursday**: Add JSDoc to all public routes
3. **Friday**: Update API README with current inventory

### Week 4: Testing

1. **Monday-Thursday**: Write missing integration tests
2. **Friday**: Final review and completion report

---

## Quick Wins (Start Today)

### 🚀 Immediate Actions

1. **Remove stale comments** (5 min):

   ```bash
   # Edit VideoUploadSection.tsx and remove outdated upload flow comments
   code src/features/charter-onboarding/components/VideoUploadSection.tsx
   ```

2. **Update debug route docs** (2 min):

   ```bash
   # Edit dev/debug/route.ts to remove legacy endpoint references
   code src/app/api/dev/debug/route.ts
   ```

3. **Check VideoUploadSection usage** (1 min):

   ```bash
   grep -r "VideoUploadSection" src/app --include="*.tsx" --include="*.ts"
   grep -r "VideoUploadSection" src/features --exclude-dir=__tests__ --include="*.tsx"
   ```

4. **Run existing tests** (30 sec):
   ```bash
   npm run test:ci
   ```

---

## Risk Assessment

### Low Risk (Safe to proceed)

- ✅ Removing comments referencing `/api/media/video` and `/api/media/pending`
- ✅ Updating dev/debug documentation
- ✅ Removing unused test components in `/dev/debug`

### Medium Risk (Requires verification)

- ⚠️ Deleting `VideoUploadSection` component (check imports first)
- ⚠️ Consolidating worker endpoints (verify production usage)

### High Risk (Requires coordination)

- 🔴 Changing external worker callback routes (breaking change for deployed workers)
- 🔴 Removing any `/api/videos/*` routes without migration plan

---

## Success Criteria

✅ **Phase 2 Complete When:**

- [ ] No code references to `/api/media/upload`, `/api/media/pending`, `/api/media/video`
- [ ] All legacy components removed or documented as deprecated
- [ ] Worker endpoints consolidated with clear purpose
- [ ] All routes follow security pattern (auth → rateLimit → logic → headers)

✅ **Phase 3 Complete When:**

- [ ] All public routes have JSDoc
- [ ] API README reflects current state
- [ ] External contract endpoints documented with examples

✅ **Phase 4 Complete When:**

- [ ] Integration tests for critical paths pass
- [ ] No TODOs or FIXMEs in API routes
- [ ] Cleanup summary document created

---

## Next Steps

**Choose your starting point:**

**Option A: Conservative (Recommended)**

- Start with Quick Wins above
- Verify each change with tests
- Move methodically through Phase 2A

**Option B: Aggressive**

- Execute all Phase 2A deletions in one go
- Immediately tackle worker consolidation
- Requires rollback plan if issues arise

**Option C: Documentation First**

- Add JSDoc to all routes before touching code
- Provides clear understanding before changes
- Slower but safer

---

Would you like me to:

1. Execute the Quick Wins now?
2. Create a script to automate the grep searches?
3. Start with Phase 2A file deletions?
4. Review a specific endpoint in detail?
