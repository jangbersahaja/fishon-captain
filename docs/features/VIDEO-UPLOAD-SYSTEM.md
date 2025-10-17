---
type: feature
status: active
feature: video-upload-system
updated: 2025-10-17
tags: [video, upload, queue, worker, trim, normalization]
---

# Video Upload System

## Summary

Comprehensive video upload, processing, and management system with client-side trimming, queue-based uploads with retry logic, server-side normalization, and dual-pipeline architecture for zero-downtime migration.

---

## Current Architecture

### Client-Side Components

**EnhancedVideoUploader** (`src/components/captain/EnhancedVideoUploader.tsx`)

- Queue-based upload system with IndexedDB persistence
- Automatic video trimming for files >30s or >720p
- Progress tracking and retry logic
- Concurrent upload management (max 3 simultaneous)

**VideoTrimModal** (`src/components/captain/VideoTrimModal.tsx`)

- WhatsApp-style trim UI with drag handles
- 30-second maximum trim length enforcement
- Real-time bitrate-based size estimation
- Client-side MP4 slicing via `trimMp4Slice.ts`

**VideoManager** (`src/components/captain/VideoManager.tsx`)

- Display processed videos with status badges
- Thumbnail generation and preview
- Delete and retry capabilities

### Upload Queue System

**VideoUploadQueue** (`src/lib/uploads/videoQueue.ts`)

- Three-phase upload: `create` → multipart chunks → `finish`
- IndexedDB persistence across page refreshes
- Automatic retry with exponential backoff
- Discriminated union types for type safety

**Queue Storage** (`src/lib/storage/queueStorage.ts`)

- IndexedDB wrapper for queue state
- Atomic updates and conflict resolution
- Automatic cleanup of completed uploads

### Server-Side Processing

**Dual Pipeline Architecture** (Phase 2C-1 Complete)

```
Upload → CaptainVideo Creation → NEW Pipeline + Legacy Pipeline
                                       ↓              ↓
                              /api/videos/queue   /api/jobs/transcode
                                       ↓              ↓
                               External Worker    Legacy Worker
                                       ↓              ↓
                                 Normalized       Transcoded
                                   (720p)          (legacy)
```

**NEW Pipeline** (Active):

1. Client uploads to Vercel Blob
2. Creates `CaptainVideo` record (status: `queued`)
3. Calls `/api/videos/queue` with `videoId`
4. External worker normalizes to 720p
5. Worker calls `/api/videos/normalize-callback`
6. Updates `CaptainVideo` (status: `ready`)

**Legacy Pipeline** (Fallback):

- Still runs in parallel for safety
- Will be deprecated in Phase 2D

### Video Status Lifecycle

```
queued → processing → ready
   ↓
failed (retryable)
   ↓
cancelled (during deletion)
```

---

## API Routes

### Upload & Finish

**POST `/api/blob/upload`**

- Accepts video files (mp4, mov, webm, etc.)
- Size limit: 50MB for short videos
- Creates temp blob key: `temp/{charterId}/original/{filename}`
- Creates `CaptainVideo` record
- Queues both NEW and legacy pipelines

**POST `/api/blob/finish`**

- Called after multipart upload completes
- Probes video dimensions with ffprobe
- Sets `processedDurationSec`
- Decides bypass vs normalization
- Enqueues `/api/videos/queue` if needed

### Video Processing

**POST `/api/videos/queue`**

- Validates `videoId` exists
- Updates status to `processing`
- Sends job to external worker (QStash in prod)
- Returns immediately (async processing)

**POST `/api/videos/normalize-callback`**

- Receives worker completion notification
- Updates `CaptainVideo` with normalized URLs
- Sets status to `ready` or `failed`
- Generates thumbnail blob key

**GET `/api/captain/videos`**

- Lists captain's processed videos
- Returns status, URLs, thumbnails
- Supports pagination and filtering

### Video Management

**DELETE `/api/captain/videos/:id`**

- Marks video as `cancelled`
- Worker checks status before processing (graceful)
- Deletes blob keys: original, 720p, thumbnail
- Sets `originalDeletedAt` timestamp

---

## Database Schema

**CaptainVideo Model**:

```prisma
model CaptainVideo {
  id                   String    @id @default(cuid())
  ownerId              String
  originalUrl          String
  blobKey              String?   // original blob key
  trimStartSec         Float     @default(0)
  ready720pUrl         String?
  ready720pBlobKey     String?
  thumbnailBlobKey     String?
  processStatus        String    // queued|processing|ready|failed|cancelled
  errorMessage         String?
  didFallback          Boolean   @default(false)
  fallbackReason       String?
  processedDurationSec Float?
  originalDeletedAt    DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  owner                User      @relation(fields: [ownerId], references: [id])
}
```

---

## Key Features

### 30-Second Trim Enforcement

- Auto-opens trim modal for videos >30s
- Prevents upload of untrimmed long videos
- Estimates trimmed file size before upload
- Client-side MP4 slicing (no server upload needed)

### Queue Persistence

- Survives page refresh via IndexedDB
- Resumes incomplete uploads automatically
- Tracks retry attempts and errors
- Atomic state updates prevent corruption

### Retry Logic

- Exponential backoff: 1s → 2s → 4s → 8s
- Max 3 retry attempts per upload
- Preserves queue position across retries
- User can manually retry failed uploads

### Concurrent Upload Limits

- Max 3 simultaneous uploads
- Queued uploads wait for slots
- Fair queue ordering (FIFO)
- Prevents browser/server overload

### Graceful Degradation

- Bypass normalization for compliant videos (≤30s, ≤720p)
- Fallback to original if normalization fails
- Dual pipeline ensures legacy compatibility
- Sets `didFallback` flag for monitoring

---

## Implementation History

### ✅ Phase 0-6: Foundation (Complete)

- Video upload domain types
- Core VideoUploadQueue class
- React integration (useVideoQueue hook)
- IndexedDB persistence
- Video trimming integration

### ✅ Phase 7-8: Advanced Queue Management (Complete)

- Concurrent upload limits
- Retry logic with exponential backoff
- Error handling and recovery
- Status badge UI improvements

### ✅ Phase 9: Comprehensive Testing (Complete)

- 17 passing tests across queue, hooks, storage
- Mocking infrastructure for IndexedDB, XHR
- Integration test coverage

### ✅ Phase 10: Advanced Queue Management (Complete)

- Enhanced concurrency controls
- Background process monitoring
- Queue health metrics

### ✅ Phase 13: Migration & Deprecation (Complete)

- Migrated from legacy `VideoUploader` to `EnhancedVideoUploader`
- Deprecated `VideoUploadSection`
- Backward compatibility maintained
- Migration guide created

### ✅ Phase 2C-1: Dual Pipeline Implementation (Complete)

- NEW pipeline (`/api/videos/queue`) runs alongside legacy
- `CaptainVideo` records created for all uploads
- Metrics tracking: `captain_video_created`, `video_upload_new_pipeline_queued`
- Zero-risk migration path

### 🔄 Phase 2C-2: External Worker Deployment (In Progress)

- Deploy QStash-based worker for production
- Environment variables: `EXTERNAL_WORKER_URL`, `VIDEO_WORKER_SECRET`
- Worker template: `src/app/dev/_external-worker/`
- Graceful handling of `cancelled` videos

### 📋 Phase 2D: Legacy Pipeline Removal (Planned)

- Monitor NEW pipeline success rate >95%
- Deprecate `/api/jobs/transcode`
- Remove CharterMedia video records
- Clean up legacy worker code

---

## Configuration

### Environment Variables

**Required:**

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob API token
- `DATABASE_URL` - Prisma database connection
- `NEXT_PUBLIC_SITE_URL` - Base URL for API calls

**Video Processing:**

- `EXTERNAL_WORKER_URL` - External normalization worker endpoint
- `VIDEO_WORKER_SECRET` - Shared secret for worker authentication
- `UPSTASH_QSTASH_URL` - QStash URL (production)
- `UPSTASH_QSTASH_TOKEN` - QStash auth token (production)

**Limits:**

- `MAX_SHORT_VIDEO_BYTES` = 50MB (defined in `@/config/mediaProcessing`)

### Feature Flags

**Trim Modal Auto-Open:**

- Enabled for videos >30s or resolution >720p
- Can be bypassed if already trimmed client-side
- Controlled in `EnhancedVideoUploader.tsx`

**Bypass Normalization:**

- Videos ≤30s AND ≤720p skip processing
- Directly uses original URL
- Controlled in `/api/blob/finish`

---

## Monitoring & Metrics

### Success Metrics

- `captain_video_created` - Total videos uploaded
- `video_upload_new_pipeline_queued` - NEW pipeline queue calls
- `video_normalization_success` - Successful normalizations
- `video_uploads_total` - Overall upload count

### Error Metrics

- `captain_video_create_fail` - Failed video record creation
- `video_upload_new_pipeline_queue_fail` - Failed queue calls
- `video_normalization_failed` - Failed normalization jobs

### Health Checks

- Queue success rate: `video_upload_new_pipeline_queued / captain_video_created` (target: >95%)
- Pipeline failure rate: `video_upload_new_pipeline_queue_fail / captain_video_created` (target: <5%)
- Normalization success: `video_normalization_success / video_upload_new_pipeline_queued` (target: >90%)

### Alerting Thresholds

- Queue failure rate >20% → Investigate immediately
- Orphaned videos (status=`queued` for >1 hour) → Clean up
- Worker timeout (processing >10 minutes) → Retry or fail

---

## Future Enhancements

### Short-Term (Q4 2025)

- [ ] Complete Phase 2C-2: Deploy external worker
- [ ] Monitor NEW pipeline in production (2-4 weeks)
- [ ] Begin Phase 2D: Remove legacy pipeline
- [ ] Add video analytics (view counts, completion rates)

### Mid-Term (Q1 2026)

- [ ] Multiple resolution support (480p, 1080p)
- [ ] HLS streaming for longer videos
- [ ] Advanced trimming (cut multiple segments)
- [ ] Video filters and effects

### Long-Term (Q2+ 2026)

- [ ] AI-powered video enhancement
- [ ] Automatic subtitle generation
- [ ] Multi-language audio tracks
- [ ] Live streaming support

---

## Troubleshooting

### Upload Fails Immediately

**Symptoms:** Video upload fails on start, no retry
**Causes:**

- File size exceeds 50MB limit
- Invalid file format (not mp4/mov/webm)
- Missing `BLOB_READ_WRITE_TOKEN`

**Solutions:**

1. Check file size in browser DevTools
2. Verify file extension is supported
3. Ensure env var is set in Vercel dashboard

### Upload Stuck at "Processing"

**Symptoms:** Video status remains `processing` >10 minutes
**Causes:**

- External worker not running
- Worker crashed during normalization
- Network timeout to worker

**Solutions:**

1. Check worker logs (Vercel Functions or QStash)
2. Verify `EXTERNAL_WORKER_URL` is correct
3. Manually retry via admin panel

### Video Shows as "Failed"

**Symptoms:** Status changes from `processing` to `failed`
**Causes:**

- Normalization error (corrupt video, unsupported codec)
- Worker exception (ffmpeg crash)
- Callback delivery failure

**Solutions:**

1. Check worker error logs for ffmpeg output
2. Download original and test with ffmpeg locally
3. Re-upload with different encoding

### Queue Not Persisting Across Refresh

**Symptoms:** Upload queue resets after page reload
**Causes:**

- IndexedDB disabled in browser
- Private/incognito mode
- Browser storage quota exceeded

**Solutions:**

1. Enable IndexedDB in browser settings
2. Use regular browsing mode
3. Clear IndexedDB storage and retry

---

## Related Documentation

- [External Worker Setup Guide](./external-video-worker-setup-guide.md)
- [Video API Routes Documentation](./video-api-routes-documentation.md)
- [Video Trim UI Implementation](./whatsapp-style-video-trim-ui-implementation-complete.md)
- [Storage Inventory](./storage-inventory-update---new-video-pipeline-support.md)

---

## Archive Notes

### Merged Documents

- `docs/VIDEO_UPLOAD_PHASES_STATUS.md`
- `docs/VIDEO_UPLOAD_PROGRESS_BAR.md`
- `docs/VIDEO_UPLOAD_PHASE_7_8_COMPLETION.md`
- `docs/PHASE_13_COMPLETION_SUMMARY.md`
- `docs/PHASE_2C_COMPLETION_REPORT.md`
- Multiple phase-specific completion reports

### Deprecated Components

- `src/components/captain/VideoUploader.tsx` (legacy)
- `src/features/charter-onboarding/components/VideoUploadSection.tsx` (legacy)
- `/api/jobs/transcode` (will be removed in Phase 2D)
