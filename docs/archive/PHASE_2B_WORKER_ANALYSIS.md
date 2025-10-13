# Phase 2B Analysis: Worker Endpoint Consolidation

**Date**: October 12, 2025  
**Status**: Investigation Complete - Ready for Decision

---

## Current Worker Architecture

### Flow Diagram

```
┌─────────────────────┐
│  /api/blob/upload   │ (Legacy video upload)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ /api/jobs/transcode │ ◄────── Dev Debug Panel (testing)
└──────────┬──────────┘
           │
           ├─── QStash (production) ───► /api/workers/transcode
           │                                      │
           │                                      ▼
           │                            /api/workers/transcode-simple
           │
           └─── Direct (dev/loopback) ─► /api/workers/transcode-simple
```

### Deprecated/Unused

```
┌──────────────────────┐
│ /api/transcode/      │ ◄── Returns 410 Gone
│       complete       │     (Already deprecated)
└──────────────────────┘
```

---

## Endpoint Analysis

### 1. `/api/jobs/transcode` ⚠️ LEGACY - KEEP FOR NOW

**Purpose**: Queue entry point for old video upload system  
**Status**: Used by legacy `/api/blob/upload` route  
**Dependencies**:

- Called by `/api/blob/upload` (line 172)
- Used in dev debug panel for testing
- References `/api/workers/transcode` and `/api/workers/transcode-simple`

**Decision**:

- ⚠️ **KEEP temporarily** - still used by blob upload route
- 📋 **TODO**: Migrate `/api/blob/upload` to new video pipeline
- 🔄 **Future**: Remove once blob upload migration complete

**Code Quality**:

- ✅ Has QStash integration
- ✅ Fallback to direct call for dev
- ✅ Good error handling
- ⚠️ Supports legacy field names (`key`/`url` vs `originalKey`/`originalUrl`)

---

### 2. `/api/workers/transcode` ⚠️ QSTASH CALLBACK - KEEP

**Purpose**: QStash callback handler that routes to external or internal worker  
**Status**: Active - called by QStash in production  
**Dependencies**:

- Invoked by `/api/jobs/transcode` via QStash
- Routes to `EXTERNAL_WORKER_URL` if configured
- Falls back to `/api/workers/transcode-simple` if not

**Decision**:

- ✅ **KEEP** - critical QStash callback endpoint
- 📝 **ADD**: JSDoc documentation
- 🔒 **VERIFY**: QStash signature verification is enabled

**Code Quality**:

- ✅ Has signature verification (if `QSTASH_CURRENT_SIGNING_KEY` set)
- ✅ Edge runtime (fast and efficient)
- ✅ Supports both external and internal workers
- ⚠️ Supports legacy field names for backward compatibility

---

### 3. `/api/workers/transcode-simple` ⚠️ INTERNAL WORKER - KEEP

**Purpose**: Internal video processing worker (download → process → upload)  
**Status**: Active - fallback worker for dev and when EXTERNAL_WORKER_URL not configured  
**Dependencies**:

- Called by `/api/workers/transcode` as fallback
- Called directly by `/api/jobs/transcode` in dev/loopback mode
- Used by dev debug panel for testing

**Decision**:

- ✅ **KEEP** - essential for local development
- 📝 **IMPROVE**: Current "processing" is just pass-through with placeholder thumbnail
- 🚀 **FUTURE**: Add actual FFmpeg processing or document it's a stub

**Code Quality**:

- ✅ Node.js runtime with 5-minute timeout
- ✅ Good logging and error handling
- ✅ Proper blob cleanup (deletes original after processing)
- ⚠️ Video "processing" is currently a no-op (just re-uploads)
- ✅ Generates placeholder thumbnail (base64 embedded PNG)
- ⚠️ References removed `PendingMedia` in comments (needs cleanup)

**Issues Found**:

```typescript
// Line 53: Comment mentions CaptainVideo pipeline (correct)
// Line 265: Comment mentions pendingMedia (outdated - should remove)
```

---

### 4. `/api/transcode/complete` ❌ DEPRECATED - SAFE TO DELETE

**Purpose**: Old completion callback endpoint  
**Status**: Returns 410 Gone  
**Dependencies**: None (no code references found)

**Decision**:

- ❌ **DELETE** - Already returns 410
- ✅ **SAFE** - No production code uses it

---

## Current vs New Video Pipeline

### Legacy System (Old PendingMedia-based)

```
Upload → /api/blob/upload → /api/jobs/transcode → Workers → PendingMedia
```

**Status**: Being phased out (PendingMedia model removed)

### New System (CaptainVideo-based)

```
Upload → EnhancedVideoUploader → /api/blob/finish → /api/videos/queue
      → /api/videos/worker-normalize → External Worker → /api/videos/normalize-callback
```

**Status**: ✅ Active and recommended

### These Worker Endpoints (Transitional)

```
/api/jobs/transcode → /api/workers/transcode → /api/workers/transcode-simple
```

**Status**: ⚠️ Used by legacy blob upload, needed until migration complete

---

## Recommendations

### Immediate Actions (Phase 2B)

#### 1. ❌ DELETE: `/api/transcode/complete`

```bash
rm -rf src/app/api/transcode/complete
```

**Reason**: Already deprecated (410), no usage found  
**Risk**: None

#### 2. 📝 CLEANUP: Remove PendingMedia references in `transcode-simple`

**File**: `src/app/api/workers/transcode-simple/route.ts`

**Changes needed**:

- Line 53: ✅ Correct comment about CaptainVideo (keep)
- Line 71: ❌ Remove `fail()` function that references pendingMedia
- Line 265: ❌ Update comment: ~~"pendingMedia logic"~~ → "handled by CaptainVideo pipeline"

#### 3. 📝 ADD JSDOC: Document these endpoints

Add JSDoc to:

- `/api/jobs/transcode` - Queue entry point documentation
- `/api/workers/transcode` - QStash callback documentation
- `/api/workers/transcode-simple` - Internal worker documentation

#### 4. ⚠️ MARK: Add deprecation warnings

Add console warnings to `/api/jobs/transcode`:

```typescript
console.warn(
  "⚠️  /api/jobs/transcode is legacy. Migrate to /api/videos/queue pipeline."
);
```

---

### Future Actions (Post Phase 2B)

#### Phase 2C: Migrate `/api/blob/upload`

**Blocker**: `/api/blob/upload` still uses `/api/jobs/transcode`

**Steps**:

1. Update `/api/blob/upload` to use new `/api/videos/queue` pipeline
2. Remove `/api/jobs/transcode` invocation
3. Test migration thoroughly
4. Mark `/api/jobs/transcode` as deprecated (return 410)

#### Phase 2D: Remove Worker Endpoints

**After** `/api/blob/upload` migrated:

**Delete**:

- `/api/jobs/transcode` (no longer called)
- `/api/workers/transcode` (replaced by `/api/videos/worker-normalize`)
- `/api/workers/transcode-simple` (replaced by external worker)

**Timeline**: Estimated 2-4 weeks after Phase 2B

---

## Testing Strategy

### Before Deletion

```bash
# 1. Verify no production usage
grep -r "/api/transcode/complete" src --exclude-dir=node_modules --exclude-dir=__tests__

# 2. Check git history
git log --all --oneline -- src/app/api/transcode/complete/

# 3. Search deployment logs (if available)
# Check production logs for any hits to this endpoint
```

### After Deletion

```bash
# 1. Type check
npm run typecheck

# 2. Run tests
npm run test:ci

# 3. Test debug panel (manual)
# Visit /dev/debug and test worker endpoints
```

---

## Files to Update

### Delete

- [ ] `src/app/api/transcode/complete/route.ts`

### Cleanup

- [ ] `src/app/api/workers/transcode-simple/route.ts` (remove PendingMedia references)

### Document

- [ ] `src/app/api/jobs/transcode/route.ts` (add JSDoc + deprecation warning)
- [ ] `src/app/api/workers/transcode/route.ts` (add JSDoc)
- [ ] `src/app/api/workers/transcode-simple/route.ts` (add JSDoc)

### Update README

- [ ] `src/app/api/README.md` (mark Phase 2B progress)

---

## Risk Assessment

### Low Risk ✅

- Deleting `/api/transcode/complete` (already 410)
- Adding JSDoc documentation
- Cleaning up PendingMedia references in comments

### Medium Risk ⚠️

- Keeping legacy workers (technical debt accumulation)
- Not immediately blocking usage of `/api/jobs/transcode`

### High Risk 🔴

- Deleting `/api/jobs/transcode` now (breaks `/api/blob/upload`)
- Removing worker endpoints before blob upload migration

---

## Decision Matrix

| Action                           | Risk   | Impact              | Effort | Do Now?                       |
| -------------------------------- | ------ | ------------------- | ------ | ----------------------------- |
| Delete `/api/transcode/complete` | Low    | Cleanup             | 1 min  | ✅ YES                        |
| Cleanup PendingMedia refs        | Low    | Clarity             | 5 min  | ✅ YES                        |
| Add JSDoc to workers             | Low    | Documentation       | 15 min | ✅ YES                        |
| Add deprecation warnings         | Low    | Developer awareness | 5 min  | ✅ YES                        |
| Mark endpoints deprecated        | Medium | Breaking change     | 2 min  | ❌ NO - Too early             |
| Delete worker endpoints          | High   | Breaking change     | 1 min  | ❌ NO - Needs migration first |

---

## Next Steps

**Recommended approach**: Execute safe deletions and cleanup now, defer breaking changes

1. ✅ Delete `/api/transcode/complete`
2. ✅ Cleanup PendingMedia references
3. ✅ Add JSDoc documentation
4. ✅ Update Phase 2B status
5. ⏸️ Plan `/api/blob/upload` migration (Phase 2C)

**Estimated time**: 30 minutes

---

**Ready to proceed?**

- Option A: Execute Phase 2B safe deletions & cleanup now
- Option B: Review analysis first, execute later
- Option C: Skip to Phase 3 (documentation) instead
