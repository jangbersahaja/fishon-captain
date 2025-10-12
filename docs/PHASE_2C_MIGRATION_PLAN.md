# Phase 2C Migration Plan: Blob Upload → Video Queue Pipeline

**Date**: October 12, 2025  
**Phase**: 2C - Blob Upload Migration  
**Status**: 📋 PLANNING

---

## Executive Summary

Migrate `/api/blob/upload` video processing from legacy `/api/jobs/transcode` to new `/api/videos/queue` pipeline. This unblocks deletion of legacy worker endpoints in Phase 2D.

**Goal**: Replace line 172 in `/api/blob/upload/route.ts` with new CaptainVideo-based pipeline.

**Impact**: Medium complexity, requires careful data flow mapping and testing.

---

## Current vs New Architecture

### Current Flow (Legacy)

```
/api/blob/upload
  ↓
1. Upload video to blob storage (temp path)
2. Create CharterMedia record (temp URL)
3. Call /api/jobs/transcode (line 172)
     ↓
   /api/workers/transcode (QStash callback)
     ↓
   /api/workers/transcode-simple (actual work)
     ↓
4. Update CharterMedia with processed URL
```

### New Flow (Target)

```
/api/blob/upload
  ↓
1. Upload video to blob storage
2. Create CaptainVideo record (ownerId, originalUrl, processStatus: 'queued')
3. Call /api/videos/queue ({ videoId })
     ↓
   QStash → EXTERNAL_WORKER_URL or /api/videos/worker-normalize
     ↓
   Callback → /api/videos/normalize-callback
     ↓
4. Update CaptainVideo with processed URLs + status
5. Associate with CharterMedia (via blob key or separate link)
```

---

## Key Differences Analysis

### 1. Database Model Change

| Aspect                | Legacy (CharterMedia)              | New (CaptainVideo)                                            |
| --------------------- | ---------------------------------- | ------------------------------------------------------------- |
| **Primary Record**    | CharterMedia (kind: CHARTER_VIDEO) | CaptainVideo                                                  |
| **Owner Field**       | `charterId`                        | `ownerId` (userId)                                            |
| **Status Tracking**   | No process status field            | `processStatus` (queued/processing/ready/failed/cancelled)    |
| **URL Fields**        | `url`, `storageKey`                | `originalUrl`, `ready720pUrl`, `thumbnailUrl`                 |
| **Trim Metadata**     | Not stored                         | `trimStartSec`, `processedDurationSec`, `appliedTrimStartSec` |
| **Duration**          | Not stored                         | `originalDurationSec`, `processedDurationSec`                 |
| **Blob Keys**         | `storageKey`                       | `blobKey`, `normalizedBlobKey`, `thumbnailBlobKey`            |
| **Fallback Tracking** | No                                 | `didFallback`, `fallbackReason`                               |
| **Deletion**          | Hard delete                        | Soft delete (`originalDeletedAt`)                             |

### 2. Payload Differences

#### Legacy /api/jobs/transcode Payload

```typescript
{
  originalKey: string; // blob storage key
  originalUrl: string; // public URL
  charterId: string; // charter association
  filename: string; // original filename
  userId: string; // owner ID
}
```

#### New /api/videos/queue Payload

```typescript
{
  videoId: string; // CaptainVideo.id (REQUIRED)
}
```

**Critical Change**: New pipeline requires CaptainVideo record to exist BEFORE queueing!

### 3. Authorization Model

| Endpoint              | Auth Required            | Method                                                          |
| --------------------- | ------------------------ | --------------------------------------------------------------- |
| `/api/jobs/transcode` | None (internal)          | Direct call                                                     |
| `/api/videos/queue`   | Session OR worker secret | Session check or `Authorization: Bearer ${VIDEO_WORKER_SECRET}` |

---

## Migration Strategy

### Option A: Dual Pipeline (Recommended)

**Approach**: Create CaptainVideo record alongside CharterMedia, use both pipelines temporarily.

**Pros**:

- Zero risk to existing functionality
- Easy rollback
- Can compare results between pipelines
- Gradual cutover

**Cons**:

- Temporary code duplication
- Both pipelines run (extra processing)

**Implementation**:

```typescript
// In /api/blob/upload after video upload succeeds:

// 1. Create CharterMedia (existing)
const media = await prisma.charterMedia.create({
  data: {
    charterId,
    kind: "CHARTER_VIDEO",
    url,
    storageKey: key,
    sortOrder: nextOrder,
  },
});

// 2. Create CaptainVideo (NEW)
const captainVideo = await prisma.captainVideo.create({
  data: {
    ownerId: userId,
    originalUrl: url,
    blobKey: key,
    processStatus: "queued",
  },
});

// 3. Queue via NEW pipeline
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/videos/queue`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ videoId: captainVideo.id }),
});

// 4. OLD pipeline (keep for now, remove in Phase 2D)
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/jobs/transcode`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    originalKey: key,
    originalUrl: url,
    charterId,
    filename: sanitized,
    userId,
  }),
});
```

### Option B: Direct Replacement (Riskier)

**Approach**: Replace legacy call with new pipeline only.

**Pros**:

- Cleaner code immediately
- No duplicate processing

**Cons**:

- Higher risk if new pipeline has bugs
- Harder to rollback
- May break existing video processing

**Not Recommended** for Phase 2C - use Option A instead.

---

## Implementation Plan

### Phase 2C-1: Add CaptainVideo Pipeline (Dual Mode)

**Goal**: Run both pipelines, keep legacy as fallback.

**Changes**:

1. After blob upload, create CaptainVideo record
2. Call `/api/videos/queue` with `videoId`
3. Keep legacy `/api/jobs/transcode` call
4. Add logging to compare results

**Rollback**: Remove new pipeline code, keep legacy.

### Phase 2C-2: Monitor & Validate (2-4 weeks)

**Goal**: Verify new pipeline works in production.

**Tasks**:

- Monitor CaptainVideo processStatus transitions
- Check callback success rates
- Compare processed video quality
- Verify CharterMedia updates still work

**Metrics to Track**:

- `video_queue_success_rate`
- `video_queue_failure_rate`
- `captain_video_ready_count`
- `legacy_transcode_vs_new_pipeline_time`

### Phase 2C-3: Feature Flag Cutover (Future - Phase 2D)

**Goal**: Disable legacy pipeline via feature flag.

**Changes**:

1. Add `USE_NEW_VIDEO_PIPELINE` env var (default: true)
2. Conditional legacy call based on flag
3. Monitor for 1-2 weeks
4. If stable: remove legacy code + workers (Phase 2D)

---

## Data Flow Mapping

### Step-by-Step Comparison

#### Current (Legacy)

| Step | Action             | Database                         | External Calls                         |
| ---- | ------------------ | -------------------------------- | -------------------------------------- |
| 1    | Upload to blob     | -                                | Vercel Blob `put()`                    |
| 2    | Create temp record | `CharterMedia` (url = temp)      | -                                      |
| 3    | Queue transcode    | -                                | `/api/jobs/transcode`                  |
| 4    | QStash delivery    | -                                | QStash → `/api/workers/transcode`      |
| 5    | Worker process     | -                                | `/api/workers/transcode-simple`        |
| 6    | Upload processed   | -                                | Vercel Blob `put()` x2 (video + thumb) |
| 7    | Update record      | `CharterMedia` (url = processed) | -                                      |

#### New (Target)

| Step | Action                 | Database                                             | External Calls                                    |
| ---- | ---------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| 1    | Upload to blob         | -                                                    | Vercel Blob `put()`                               |
| 2    | Create video record    | `CaptainVideo` (processStatus = queued)              | -                                                 |
| 3    | Queue normalization    | `CaptainVideo` (processStatus = processing)          | `/api/videos/queue`                               |
| 4    | QStash delivery        | -                                                    | QStash → EXTERNAL_WORKER_URL                      |
| 5    | Worker process         | -                                                    | External worker or `/api/videos/worker-normalize` |
| 6    | Callback               | `CaptainVideo` (processStatus = ready, URLs updated) | `/api/videos/normalize-callback`                  |
| 7    | Associate with charter | `CharterMedia` or direct link                        | -                                                 |

---

## Risk Assessment

### High Risk Items

| Risk                                | Probability | Impact | Mitigation                         |
| ----------------------------------- | ----------- | ------ | ---------------------------------- |
| **New pipeline fails silently**     | Medium      | High   | Dual pipeline + monitoring         |
| **CaptainVideo not created**        | Low         | High   | Wrap in try-catch, log errors      |
| **Session auth fails**              | Low         | Medium | Test auth in dev/staging first     |
| **QStash delivery fails**           | Low         | High   | Queue retries video on error       |
| **CharterMedia association breaks** | Medium      | High   | Keep CharterMedia creation for now |

### Medium Risk Items

| Risk                          | Probability | Impact | Mitigation                 |
| ----------------------------- | ----------- | ------ | -------------------------- |
| **Video quality differs**     | Low         | Medium | Compare outputs manually   |
| **Processing time increases** | Medium      | Low    | Monitor timing metrics     |
| **Storage costs double**      | High        | Low    | Temporary only (1-2 weeks) |

### Low Risk Items

| Risk                        | Probability | Impact | Mitigation                 |
| --------------------------- | ----------- | ------ | -------------------------- |
| **Legacy worker confusion** | Low         | Low    | Clear deprecation warnings |
| **Old videos not migrated** | Low         | Low    | Not migrating old data yet |

---

## Testing Strategy

### Unit Tests

**File**: `src/app/api/blob/__tests__/upload-video-migration.test.ts`

**Test Cases**:

1. ✅ Creates CaptainVideo record on video upload
2. ✅ Calls /api/videos/queue with videoId
3. ✅ Still creates CharterMedia for backward compatibility
4. ✅ Still calls legacy transcode (dual mode)
5. ✅ Handles CaptainVideo creation failure gracefully
6. ✅ Handles queue call failure gracefully
7. ✅ Validates videoId is CUID format
8. ✅ Logs migration events for monitoring

### Integration Tests

**File**: `src/app/api/blob/__tests__/upload-video-e2e.test.ts`

**Test Cases**:

1. ✅ End-to-end video upload → queue → process → ready
2. ✅ Verify CaptainVideo status transitions
3. ✅ Verify CharterMedia URL updated
4. ✅ Compare legacy vs new pipeline output
5. ✅ Test various video formats (mp4, mov, webm)
6. ✅ Test trimmed videos (trimStartSec metadata)
7. ✅ Test short-form captain videos

### Manual Testing Checklist

- [ ] Upload video via charter onboarding form
- [ ] Verify CaptainVideo record created in database
- [ ] Verify processStatus: queued → processing → ready
- [ ] Check processed video plays correctly
- [ ] Verify thumbnail generated
- [ ] Check CharterMedia association intact
- [ ] Test with different video formats
- [ ] Test with trimmed videos (30s limit)
- [ ] Monitor QStash dashboard for delivery
- [ ] Check worker logs for errors
- [ ] Verify storage paths correct

---

## Database Schema Considerations

### CharterMedia vs CaptainVideo Relationship

**Current**: CharterMedia stores video URL directly

**After Migration**: Two options:

#### Option 1: Keep CharterMedia as Primary (Recommended for Phase 2C)

```prisma
model CharterMedia {
  // Existing fields
  url          String   // Points to CaptainVideo.ready720pUrl
  storageKey   String?  // Points to CaptainVideo.normalizedBlobKey

  // Add reference (optional, for future queries)
  captainVideoId String?
  captainVideo   CaptainVideo? @relation(fields: [captainVideoId], references: [id])
}
```

#### Option 2: CaptainVideo as Source of Truth (Phase 3+)

```prisma
model CaptainVideo {
  charterMediaLinks CharterMedia[]  // Multiple charters can use same video
}
```

**Phase 2C Decision**: Use Option 1 (minimal schema change)

---

## Environment Variables

### Required

```bash
# Already exist
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
VIDEO_WORKER_SECRET=your-secret-here
QSTASH_TOKEN=your-qstash-token
QSTASH_URL=https://qstash.upstash.io

# May need to add
EXTERNAL_WORKER_URL=https://your-worker.vercel.app/api/normalize
```

### Optional (Phase 2D)

```bash
# Feature flag for gradual cutover
USE_NEW_VIDEO_PIPELINE=true  # Default true after 2C stable
```

---

## Rollback Plan

### If New Pipeline Fails in Phase 2C

**Scenario**: CaptainVideo pipeline not working, videos stuck in processing.

**Actions**:

1. Revert `/api/blob/upload` to legacy-only (remove CaptainVideo creation)
2. Git revert commit: `git revert <commit-hash>`
3. Deploy immediately
4. Investigate issue in staging environment
5. Fix and re-attempt migration

**Recovery Time**: ~15 minutes (revert + deploy)

**Data Impact**: CaptainVideo records may be orphaned (processStatus stuck), but CharterMedia unaffected since legacy still runs.

### If Both Pipelines Fail

**Scenario**: Catastrophic failure, no videos processing.

**Actions**:

1. Check QStash dashboard for delivery failures
2. Check worker logs for errors
3. Verify environment variables present
4. Check Vercel Blob quota/limits
5. Fallback: manual video upload via staff dashboard

---

## Success Criteria

### Phase 2C-1 (Dual Pipeline)

- ✅ CaptainVideo records created on every video upload
- ✅ `/api/videos/queue` called successfully
- ✅ Legacy pipeline still runs (backward compatibility)
- ✅ All tests passing
- ✅ No increase in video processing failures
- ✅ Monitoring dashboards showing dual metrics

### Phase 2C-2 (Validation)

- ✅ 95%+ videos reach `processStatus: ready` via new pipeline
- ✅ Processed video quality matches legacy
- ✅ Average processing time comparable (<20% increase)
- ✅ No customer complaints about video quality
- ✅ 2-4 weeks of stable production operation

### Phase 2C-3 (Cutover - Future Phase 2D)

- ✅ Legacy pipeline disabled via feature flag
- ✅ No fallback to legacy for 1-2 weeks
- ✅ All metrics healthy
- ✅ Ready to delete `/api/jobs/transcode` and workers

---

## Timeline Estimate

| Phase                          | Duration  | Status                  |
| ------------------------------ | --------- | ----------------------- |
| Phase 2C-1: Implementation     | 2-4 hours | 🔜 Ready to start       |
| Phase 2C-1: Testing            | 1-2 hours | ⏳ After implementation |
| Phase 2C-1: Code review        | 30 min    | ⏳ After testing        |
| Phase 2C-1: Deploy to staging  | 15 min    | ⏳ After review         |
| Phase 2C-1: Staging validation | 1-2 hours | ⏳ After deploy         |
| Phase 2C-1: Deploy to prod     | 15 min    | ⏳ After staging        |
| Phase 2C-2: Monitoring         | 2-4 weeks | ⏳ After prod deploy    |
| Phase 2C-3: Cutover            | 30 min    | ⏳ Phase 2D             |

**Total Active Work**: ~4-8 hours  
**Total Elapsed (with monitoring)**: 2-4 weeks

---

## Code Changes Preview

### /api/blob/upload/route.ts (Line 172 Area)

#### Before (Current)

```typescript
if (isVideo && charterId && docType === "charter_media") {
  // Create CharterMedia record
  await prisma.charterMedia.create({
    data: {
      charterId,
      kind: "CHARTER_VIDEO",
      url,
      storageKey: key,
      sortOrder: nextOrder,
    },
  });

  // Queue legacy transcode
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/jobs/transcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originalKey: key,
      originalUrl: url,
      charterId,
      filename: sanitized,
      userId,
    }),
  });
}
```

#### After (Dual Pipeline - Phase 2C-1)

```typescript
if (isVideo && charterId && docType === "charter_media") {
  // 1. Create CharterMedia record (backward compatibility)
  const media = await prisma.charterMedia.create({
    data: {
      charterId,
      kind: "CHARTER_VIDEO",
      url,
      storageKey: key,
      sortOrder: nextOrder,
    },
  });

  // 2. Create CaptainVideo record (NEW)
  let captainVideoId: string | null = null;
  try {
    const captainVideo = await prisma.captainVideo.create({
      data: {
        ownerId: userId,
        originalUrl: url,
        blobKey: key,
        processStatus: "queued",
      },
    });
    captainVideoId = captainVideo.id;

    // 3. Queue via NEW pipeline
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/videos/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: captainVideo.id }),
    });

    console.log(
      `[blob-upload] Queued CaptainVideo ${captainVideo.id} via new pipeline`
    );
    counter("video_upload_new_pipeline_queued").inc();
  } catch (err) {
    console.error("[blob-upload] Failed to queue via new pipeline:", err);
    counter("video_upload_new_pipeline_queue_fail").inc();
    // Don't fail the upload - fallback to legacy
  }

  // 4. Queue via LEGACY pipeline (keep for now - Phase 2D will remove)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/jobs/transcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalKey: key,
        originalUrl: url,
        charterId,
        filename: sanitized,
        userId,
        captainVideoId, // Pass for correlation if needed
      }),
    });
    counter("video_transcode_jobs_queued").inc();
  } catch (error) {
    console.error("Failed to queue legacy transcode job:", error);
    counter("video_transcode_jobs_queue_fail").inc();
  }
}
```

---

## Monitoring & Observability

### Metrics to Add

```typescript
// In /api/blob/upload
counter("video_upload_new_pipeline_queued").inc();
counter("video_upload_new_pipeline_queue_fail").inc();
counter("captain_video_created").inc();

// In /api/videos/queue
counter("video_queue_success").inc();
counter("video_queue_auth_fail").inc();
counter("video_queue_enqueue_fail").inc();

// In /api/videos/normalize-callback
counter("video_normalization_success").inc();
counter("video_normalization_failed").inc();
counter("video_normalization_callback_received").inc();
```

### Logs to Track

```typescript
// Key events to log
console.log("[blob-upload] CaptainVideo created:", {
  videoId,
  userId,
  charterId,
});
console.log("[blob-upload] Queued via new pipeline:", { videoId });
console.log("[video-queue] Processing video:", {
  videoId,
  status: "processing",
});
console.log("[normalize-callback] Video ready:", {
  videoId,
  duration,
  quality,
});
```

### Dashboards

**Grafana/Vercel Analytics Queries**:

- New pipeline queue rate: `sum(rate(video_upload_new_pipeline_queued[5m]))`
- New pipeline failure rate: `sum(rate(video_upload_new_pipeline_queue_fail[5m]))`
- Legacy pipeline rate: `sum(rate(video_transcode_jobs_queued[5m]))`
- CaptainVideo by status: `count(captain_video) by (processStatus)`

---

## Next Steps

1. ✅ Review this migration plan
2. ✅ Get approval from team/stakeholders
3. 🔜 Implement Phase 2C-1 (dual pipeline code)
4. 🔜 Write unit tests
5. 🔜 Test in dev environment
6. 🔜 Deploy to staging
7. 🔜 Deploy to production
8. 🔜 Monitor for 2-4 weeks
9. 🔜 Proceed to Phase 2D (remove legacy) when stable

---

**Document Status**: 📋 READY FOR REVIEW  
**Estimated Start**: October 12, 2025  
**Estimated Completion**: November 2025 (including monitoring period)  
**Risk Level**: Medium  
**Recommended Approach**: Dual Pipeline (Option A)

---

**Questions? Concerns?** Review before proceeding to implementation.
