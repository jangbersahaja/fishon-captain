# Fix: Video Dimensions Returning Null

**Date**: 17 October 2025  
**Issue**: ffprobe not configured, causing dimension extraction to fail  
**Status**: ✅ **Fixed**

---

## Problem Identified

### Logs Analysis

**External worker logs showed**:

```
[worker] original_metadata_probed { duration: null, width: null, height: null }
[worker] processed_metadata_probed { duration: null, width: null, height: null }
```

**Root cause**: Line 16 in worker template:

```typescript
const ffprobeBinary: string | undefined = undefined; ❌
```

ffprobe binary was **not configured**, so `fluent-ffmpeg` couldn't probe video metadata.

---

## Fix Applied

### 1. Auto-detect ffprobe-static

```typescript
// Before: Always undefined
const ffprobeBinary: string | undefined = undefined;

// After: Try to load ffprobe-static package
let ffprobeBinary: string | undefined;
try {
  ffprobeBinary = require("ffprobe-static").path;
  console.log("[worker] ffprobe-static loaded:", ffprobeBinary);
} catch {
  console.log("[worker] ffprobe-static not found, will use system ffprobe");
  ffprobeBinary = undefined;
}
```

### 2. Added Startup Logging

```typescript
if (ffmpegPath) {
  fluent.setFfmpegPath(ffmpegPath);
  console.log("[worker] ffmpeg path set:", ffmpegPath);
}
if (ffprobeBinary) {
  fluent.setFfprobePath(ffprobeBinary);
  console.log("[worker] ffprobe path set:", ffprobeBinary);
} else {
  console.log(
    "[worker] ffprobe path not set, fluent-ffmpeg will use system PATH"
  );
}
```

### 3. Enhanced Error Logging

Added detailed logs when ffprobe fails:

```typescript
if (err) {
  console.error("[worker] ffprobe_original_failed", {
    videoId,
    error: (err as Error)?.message || String(err),
    stack: (err as Error)?.stack,
  });
  return resolve({ duration: null, width: null, height: null });
}
```

Added raw data inspection:

```typescript
console.log("[worker] ffprobe_original_raw_data", {
  videoId,
  hasDuration: !!durRaw,
  hasStreams: !!data?.streams?.length,
  streamCount: data?.streams?.length || 0,
  videoStream: videoStream
    ? {
        codec_type: videoStream.codec_type,
        width: videoStream.width,
        height: videoStream.height,
      }
    : null,
});
```

---

## Required Action

### Install ffprobe-static in External Worker

```bash
cd fishon-video-worker  # Your external worker project
npm install ffprobe-static
```

### Update Worker Code

```bash
# Copy updated template
cp ../fishon-captain/src/app/dev/_external-worker/normalize.ts api/worker-normalize.ts
```

### Deploy

```bash
vercel --prod
```

---

## Verification Steps

### 1. Check Startup Logs

After deployment, worker logs should show:

```
✅ [worker] ffprobe-static loaded: /var/task/node_modules/ffprobe-static/bin/linux/x64/ffprobe
✅ [worker] ffmpeg path set: /var/task/node_modules/ffmpeg-static/ffmpeg
✅ [worker] ffprobe path set: /var/task/node_modules/ffprobe-static/bin/linux/x64/ffprobe
```

If you see:

```
⚠️ [worker] ffprobe-static not found, will use system ffprobe
```

Then `npm install ffprobe-static` is needed.

### 2. Upload Test Video

Upload a new video and check logs:

**Expected**:

```
✅ [worker] ffprobe_original_raw_data {
  hasStreams: true,
  streamCount: 2,
  videoStream: { codec_type: 'video', width: 1920, height: 1080 }
}
✅ [worker] original_metadata_probed { duration: 60, width: 1920, height: 1080 }
✅ [worker] ffprobe_processed_raw_data { ... }
✅ [worker] processed_metadata_probed { duration: 30, width: 1280, height: 720 }
✅ [worker] sending_result {
  dimensions: {
    originalWidth: 1920,
    originalHeight: 1080,
    processedWidth: 1280,
    processedHeight: 720
  }
}
```

### 3. Check Main App Callback

Main app logs should show:

```
✅ [normalize-callback] success {
  videoId: 'xyz123',
  originalDeletedAt: true,
  dimensions: {
    original: { width: 1920, height: 1080 },
    processed: { width: 1280, height: 720 },
    stored: {
      originalWidth: 1920,
      originalHeight: 1080,
      processedWidth: 1280,
      processedHeight: 720
    }
  }
}
```

### 4. Check Admin Dashboard

Navigate to `/staff/media?tab=videos&status=ready`

**Before fix**:

```
Original: 109 MB, 15s, N/A ❌
Normalized: 31 MB, 15s, N/A ❌
```

**After fix**:

```
Original: 109 MB, 15s, 2160×3840 ✅
Normalized: 31 MB, 15s, 720×1280 ✅
```

---

## If Still Not Working

### Check Package Installation

```bash
npm list ffprobe-static
```

Should output:

```
fishon-video-worker@1.0.0
└── ffprobe-static@3.1.0
```

If missing:

```
npm install --save ffprobe-static
```

### Check Vercel Build Logs

Look for:

```
Installing dependencies...
✓ Installed ffprobe-static@3.1.0
```

### Manual Test

Create a test script in worker project:

```javascript
// test-ffprobe.js
const fluent = require("fluent-ffmpeg");
const ffprobePath = require("ffprobe-static").path;

fluent.setFfprobePath(ffprobePath);
console.log("ffprobe path:", ffprobePath);

fluent("https://example.com/test-video.mp4").ffprobe((err, data) => {
  if (err) {
    console.error("ERROR:", err);
    return;
  }
  console.log("Success!", {
    duration: data.format.duration,
    streams: data.streams.length,
    video: data.streams.find((s) => s.codec_type === "video"),
  });
});
```

Run locally:

```bash
node test-ffprobe.js
```

---

## Summary of Changes

### Files Modified

1. **`src/app/dev/_external-worker/normalize.ts`**

   - Auto-detect `ffprobe-static` package
   - Add startup logging for binary paths
   - Add detailed ffprobe error logging
   - Add raw data inspection logs

2. **`src/app/api/videos/normalize-callback/route.ts`**

   - Enhanced success log with dimension details

3. **`docs/EXTERNAL_WORKER_SETUP.md`** (new)

   - Complete setup guide for external worker
   - Troubleshooting section for dimension issues
   - Package installation instructions

4. **`docs/DEBUG_VIDEO_DIMENSIONS.md`**
   - Debugging guide for dimension extraction issues

---

## Next Upload Test

After deploying the fix:

1. **Upload a video** (any resolution, portrait or landscape)
2. **Watch worker logs** for ffprobe messages
3. **Check callback logs** in main app
4. **Verify admin dashboard** shows actual resolutions

**Expected timeline**: 30-60 seconds from upload to seeing dimensions in dashboard.

---

**Status**: Fix ready for deployment. Install `ffprobe-static` in external worker and redeploy.
