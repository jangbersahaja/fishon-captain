# Video API Routes Documentation

This document outlines all video-related API endpoints for the Fishon Captain Registration system.

## Overview

The video system uses a queue-based processing pipeline with the following stages:

1. **Upload** → Video is uploaded and saved as `queued`
2. **Processing** → Video is normalized/transcoded (30s max, 720p+)
3. **Ready** → Video is available for use
4. **Failed** → Processing failed, can be retried

## API Endpoints

### GET `/api/videos/list`

Lists videos for a specific owner.

**Query Parameters:**

- `ownerId` (required): User ID to fetch videos for

**Response:**

```json
{
  "videos": [
    {
      "id": "video_id",
      "originalUrl": "https://blob.url/original",
      "thumbnailUrl": "https://blob.url/thumb.jpg",
      "processStatus": "ready|queued|processing|failed|cancelled",
      "createdAt": "2025-01-01T00:00:00Z",
      "errorMessage": "Error details if failed",
      "ready720pUrl": "https://blob.url/processed",
      "didFallback": false,
      "fallbackReason": null
    }
  ]
}
```

### GET `/api/videos/[id]`

Get details for a specific video.

**Path Parameters:**

- `id`: Video ID

**Response:**

```json
{
  "video": {
    "id": "video_id",
    "originalUrl": "https://blob.url/original",
    "thumbnailUrl": "https://blob.url/thumb.jpg",
    "processStatus": "ready",
    "createdAt": "2025-01-01T00:00:00Z",
    "ready720pUrl": "https://blob.url/processed"
  }
}
```

**Error Responses:**

- `404`: Video not found
- `403`: Not authorized to access this video

### DELETE `/api/videos/[id]`

Delete a video and cancel any pending processing.

**Path Parameters:**

- `id`: Video ID

**Response:**

```json
{
  "ok": true,
  "video": {
    /* deleted video object */
  },
  "queueCancelled": true,
  "originalStatus": "queued"
}
```

**Behavior:**

- **Ready videos**: Immediately deleted with blob cleanup
- **Queued/Processing videos**: Marked as `cancelled` then deleted
- **Failed videos**: Immediately deleted
- **Blob cleanup**: Removes original, normalized, and thumbnail blobs

**Error Responses:**

- `404`: Video not found
- `403`: Not authorized to delete this video
- `400`: Deletion failed

### POST `/api/videos/queue`

Enqueue a video for processing or retry a failed video.

**Request Body:**

```json
{
  "videoId": "video_id"
}
```

**Response:**

```json
{
  "ok": true
}
```

**Behavior:**

- Only processes videos with status `queued`
- Updates status to `processing`
- Enqueues job via QStash (production) or direct call (development)
- Used for both initial processing and retry operations

**Error Responses:**

- `400`: Missing videoId
- `404`: Video not found
- `403`: Not authorized
- `500`: Failed to enqueue job

### POST `/api/videos/worker-normalize`

Internal worker endpoint for video processing.

**Authentication:** Requires `VIDEO_WORKER_SECRET` bearer token

**Request Body:**

```json
{
  "videoId": "video_id"
}
```

**Response:**

```json
{
  "ok": true,
  "processedUrl": "https://blob.url/processed",
  "thumbnailUrl": "https://blob.url/thumb.jpg"
}
```

**Behavior:**

- Downloads original video
- Processes with FFmpeg (30s max duration, 720p+ resolution)
- Generates thumbnail at 0.15s mark
- Uploads processed files to blob storage
- Updates video status to `ready` or `failed`
- Handles `cancelled` videos gracefully (skips processing)

### POST `/api/videos/normalize-callback`

QStash callback endpoint for async processing completion.

**Authentication:** QStash signature validation

**Behavior:**

- Receives processing results from QStash
- Updates video status based on worker response
- Handles failures and retries

### GET `/api/videos/analytics`

Get video processing statistics.

**Response:**

```json
{
  "totalVideos": 150,
  "statusCounts": {
    "ready": 120,
    "queued": 10,
    "processing": 5,
    "failed": 15
  },
  "averageProcessingTime": "45s",
  "successRate": 0.95
}
```

## Status Flow

```text
Upload → queued → processing → ready
                     ↓
                  failed → (retry) → queued
                     ↓
                cancelled ← (delete during processing)
```

## Queue Cancellation

When a video is deleted while `queued` or `processing`:

1. **Status Update**: Video marked as `cancelled` in database
2. **Worker Handling**: Worker checks status and skips processing if `cancelled`
3. **Resource Cleanup**: Original/processed/thumbnail blobs are deleted
4. **Queue State**: Job continues but is handled gracefully by worker

## Error Handling

### Common Error Codes

- `400`: Bad request (missing parameters, validation errors)
- `401`: Unauthorized (missing/invalid auth)
- `403`: Forbidden (not owner of resource)
- `404`: Not found (video doesn't exist)
- `500`: Internal server error (processing failures)

### Processing Failures

Videos can fail for various reasons:

- Unsupported format
- File corruption
- Network timeouts
- FFmpeg processing errors
- Blob storage issues

Failed videos can be retried using the `/api/videos/queue` endpoint.

## Rate Limiting

All video endpoints are subject to rate limiting based on user session. Limits are:

- Upload operations: 10 per minute
- List/Get operations: 60 per minute
- Delete operations: 5 per minute

## Security

- **Authentication**: All endpoints require valid user session
- **Authorization**: Users can only access their own videos
- **Worker Security**: Processing endpoints use secret token authentication
- **Blob Security**: All blob URLs are temporary and signed

## Integration Examples

### Upload and Process Video

```typescript
// 1. Upload video (handled by EnhancedVideoUploader)
const videoRecord = await uploadVideo(file);

// 2. Video is automatically queued
// Status: "queued"

// 3. Processing starts automatically
// Status: "processing"

// 4. Check status periodically
const status = await fetch(`/api/videos/${videoRecord.id}`);

// 5. Video ready for use
// Status: "ready"
```

### Delete Video with Confirmation

```typescript
// Show confirmation dialog
const confirmed = await showDeleteDialog(video);

if (confirmed) {
  const result = await fetch(`/api/videos/${video.id}`, {
    method: "DELETE",
  });

  if (result.ok) {
    const data = await result.json();
    console.log(`Deleted ${data.originalStatus} video`);
    if (data.queueCancelled) {
      console.log("Processing was cancelled");
    }
  }
}
```

### Retry Failed Video

```typescript
const retryResult = await fetch("/api/videos/queue", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ videoId: failedVideo.id }),
});

if (retryResult.ok) {
  // Video status updated to "queued", processing will start
}
```
