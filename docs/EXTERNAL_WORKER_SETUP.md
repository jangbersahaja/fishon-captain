# External Video Worker Setup Guide

**Purpose**: Standalone Vercel worker for video normalization with ffmpeg  
**Location**: Separate repository/project from main app  
**Status**: ⚠️ Requires ffprobe for dimension extraction

---

## Quick Setup

### 1. Create External Worker Project

```bash
mkdir fishon-video-worker
cd fishon-video-worker
npm init -y
```

### 2. Install Dependencies

**Critical dependencies**:

```bash
npm install @vercel/blob fluent-ffmpeg
npm install --save-dev @types/fluent-ffmpeg

# Static binaries for Vercel deployment
npm install ffmpeg-static ffprobe-static
```

**Why ffprobe-static is critical**: Without it, video dimension extraction fails silently, causing "N/A" resolutions in admin dashboard.

### 3. Copy Worker Code

```bash
# From main repo
cp ../fishon-captain/src/app/dev/_external-worker/normalize.ts api/worker-normalize.ts
```

Or create `api/worker-normalize.ts` and paste the template code.

### 4. Create package.json Scripts

```json
{
  "name": "fishon-video-worker",
  "scripts": {
    "dev": "vercel dev",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "@vercel/blob": "^0.23.0",
    "fluent-ffmpeg": "^2.1.3",
    "ffmpeg-static": "^5.2.0",
    "ffprobe-static": "^3.1.0"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

### 5. Environment Variables

Create `.env` file:

```bash
# Required: Worker authentication
VIDEO_WORKER_SECRET=your-random-secret-here

# Required: Vercel Blob storage token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
# OR
VERCEL_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Get Blob token**:

1. Go to Vercel dashboard → Storage → Blob
2. Copy the read-write token
3. Add to worker environment variables

### 6. Deploy to Vercel

```bash
vercel --prod
```

Copy the deployment URL (e.g., `https://fishon-video-worker.vercel.app`)

### 7. Configure Main App

In your main app's `.env`:

```bash
EXTERNAL_WORKER_URL=https://fishon-video-worker.vercel.app/api/worker-normalize
VIDEO_WORKER_SECRET=same-secret-as-worker
```

---

## Troubleshooting

### Issue: Dimensions Always "N/A"

**Symptom**: Admin dashboard shows:

```
Original: 109 MB, 15s, N/A ❌
Normalized: 31 MB, 15s, N/A ❌
```

**Check worker logs** for:

```
[worker] ffprobe-static not found, will use system ffprobe
```

**Solution**: Install ffprobe-static

```bash
cd fishon-video-worker
npm install ffprobe-static
vercel --prod
```

### Issue: "ffprobe_original_failed" Error

**Check logs** for error message. Common causes:

1. **Missing ffprobe binary**

   ```
   Error: Cannot find ffprobe
   ```

   → Install `ffprobe-static`

2. **Corrupted video file**

   ```
   Error: Invalid data found when processing input
   ```

   → Check original video upload

3. **Permission issues**

   ```
   Error: EACCES: permission denied
   ```

   → Vercel runtime issue, try redeploying

### Issue: Transcoding Works But No Dimensions

**Expected logs**:

```
✅ [worker] ffprobe-static loaded: /path/to/ffprobe
✅ [worker] ffprobe_original_raw_data { hasStreams: true, videoStream: {...} }
✅ [worker] original_metadata_probed { width: 1920, height: 1080 }
```

**If you see**:

```
❌ [worker] original_metadata_probed { width: null, height: null }
```

Then ffprobe is failing. Check:

1. Is `ffprobe-static` installed? (`npm list ffprobe-static`)
2. Does Vercel have enough memory? (Video functions need 1024 MB+)
3. Is the video file valid? (Try with a different video)

---

## Vercel Configuration

### Function Settings

For video processing, configure in `vercel.json`:

```json
{
  "functions": {
    "api/worker-normalize.ts": {
      "memory": 3008,
      "maxDuration": 300
    }
  }
}
```

**Memory**: 3008 MB (recommended for HD video processing)  
**Max Duration**: 300s (5 minutes for large videos)

### Runtime

The worker uses **Node.js runtime** (not Edge):

```typescript
export const config = { runtime: "nodejs" };
```

This is required for:

- `fluent-ffmpeg` (uses child processes)
- `ffmpeg-static` / `ffprobe-static` (native binaries)
- File system access (`fs.writeFile`, `fs.createReadStream`)

---

## Testing Locally

### Prerequisites

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Run Development Server

```bash
npm run dev
# or
vercel dev
```

### Test Endpoint

```bash
curl -X POST "http://localhost:3000/api/worker-normalize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret" \
  -d '{
    "videoId": "test123",
    "originalUrl": "https://example.com/video.mp4",
    "trimStartSec": 0
  }'
```

**Expected response** (takes 10-30s):

```json
{
  "success": true,
  "videoId": "test123",
  "readyUrl": "https://blob.vercel-storage.com/...",
  "originalDurationSec": 60,
  "processedDurationSec": 30,
  "originalWidth": 1920,
  "originalHeight": 1080,
  "processedWidth": 1280,
  "processedHeight": 720
}
```

---

## Package Versions

**Known working versions**:

```json
{
  "@vercel/blob": "^0.23.0",
  "fluent-ffmpeg": "^2.1.3",
  "ffmpeg-static": "^5.2.0",
  "ffprobe-static": "^3.1.0"
}
```

**Check installed versions**:

```bash
npm list ffmpeg-static ffprobe-static
```

Should show:

```
├── ffmpeg-static@5.2.0
└── ffprobe-static@3.1.0
```

---

## Updating Worker Code

When the main app's template changes:

```bash
# 1. Update local template
cd fishon-captain
git pull

# 2. Copy to worker project
cp src/app/dev/_external-worker/normalize.ts ../fishon-video-worker/api/worker-normalize.ts

# 3. Review changes
cd ../fishon-video-worker
git diff api/worker-normalize.ts

# 4. Deploy
vercel --prod

# 5. Verify in logs
# Upload a test video and check for new log messages
```

---

## Monitoring

### Success Indicators

**Worker logs should show**:

```
✅ [worker] ffprobe-static loaded: /var/task/node_modules/ffprobe-static/bin/...
✅ [worker] original_metadata_probed { width: 1920, height: 1080 }
✅ [worker] processed_metadata_probed { width: 1280, height: 720 }
✅ [worker] sending_result { dimensions: { originalWidth: 1920, ... } }
```

**Main app logs should show**:

```
✅ [normalize-callback] success {
  dimensions: {
    original: { width: 1920, height: 1080 },
    processed: { width: 1280, height: 720 },
    stored: { originalWidth: 1920, ... }
  }
}
```

### Failure Indicators

```
❌ [worker] ffprobe-static not found
❌ [worker] ffprobe_original_failed { error: "Cannot find ffprobe" }
❌ [worker] original_metadata_probed { width: null, height: null }
```

---

## Cost Considerations

### Vercel Function Pricing

- **Free tier**: 100 GB-hours per month
- **Video processing**: ~0.5-2 GB-hours per video (depending on duration)
- **Recommendation**: Pro plan for production use

### Blob Storage

- **Cost**: ~$0.15/GB/month
- **Egress**: $0.10/GB (only on first download)
- **Optimization**: Delete original videos after normalization (saves ~80% storage)

---

## Security

### Worker Authentication

The worker requires a bearer token:

```typescript
const secret = process.env.VIDEO_WORKER_SECRET;
if (secret && auth !== `Bearer ${secret}`) {
  return respond(401, { error: "unauthorized" });
}
```

**Best practices**:

- Use strong random secret (32+ characters)
- Store in Vercel environment variables (encrypted)
- Rotate periodically (update both worker and main app)

### QStash Signature (Optional)

For QStash-triggered jobs, enable strict signature verification:

```bash
# In worker .env
STRICT_QSTASH_SIGNATURE=1
QSTASH_CURRENT_SIGNING_KEY=your-qstash-key
```

---

## Related Documentation

- Main app: `docs/VIDEO_DIMENSIONS_IMPLEMENTATION.md`
- Debugging: `docs/DEBUG_VIDEO_DIMENSIONS.md`
- API reference: `docs/API_VIDEO_ROUTES.md`

---

**Status**: This guide reflects the current worker template (with dimension extraction). Last updated: 17 October 2025.
