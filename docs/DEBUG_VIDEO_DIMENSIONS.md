# Debugging Video Dimensions Issue

**Date**: 17 October 2025  
**Issue**: Normalized video resolutions showing "N/A" in admin dashboard  
**Status**: 🔍 Debugging in progress

---

## Current Situation

### What's Working ✅

1. **Database schema** has dimension fields (migration applied)
2. **Worker template code** includes dimension probing
3. **Callback handler** ready to receive and save dimensions
4. **Admin dashboard** displays dimensions when available

### What's NOT Working ❌

All normalized video resolutions show **"N/A"** despite having correct original resolutions:

```
Example 1:
Original: 109.18 MB, 15s, 2160×3840
Normalized: 31.4 MB, 15s, N/A ❌

Example 2:
Original: 77.82 MB, 56s, 1920×1080
Normalized: 1.9 MB, 30s, N/A ❌

Example 3:
Original: 70.72 MB, 69s, 1080×1920
Normalized: 8.9 MB, 30s, N/A ❌
```

**Key Observation**: Original resolutions are captured correctly (from laptop file info after upload), but **processed dimensions are not being stored**.

---

## Root Cause Analysis

### Possible Causes

1. **External Worker Not Updated** ⚠️ MOST LIKELY

   - Template file updated but external worker app not redeployed
   - Worker still running old code without dimension probing
   - Solution: Redeploy external worker with updated code

2. **ffprobe Failing Silently**

   - ffprobe errors being caught and returning null
   - Probing happens but extracts no data from streams
   - Solution: Check worker logs for ffprobe errors

3. **Payload Format Issue**

   - Worker sends dimensions but callback doesn't parse them
   - Base64 encoding/decoding issue in QStash wrapper
   - Solution: Check callback logs for received payload

4. **Database Write Not Persisting**
   - Update query succeeds but values not saved
   - Type mismatch (e.g., sending strings instead of integers)
   - Solution: Check database directly with SQL query

---

## Debugging Steps

### Step 1: Check External Worker Logs

After uploading a new video, check the external worker logs (Vercel dashboard or worker logs):

**Expected logs** (if code is updated):

```
[worker] original_metadata_probed
{
  videoId: "xyz123",
  duration: 15,
  width: 2160,
  height: 3840
}

[worker] processed_metadata_probed
{
  videoId: "xyz123",
  duration: 15,
  width: 720,
  height: 1280
}

[worker] sending_result
{
  videoId: "xyz123",
  dimensions: {
    originalWidth: 2160,
    originalHeight: 3840,
    processedWidth: 720,
    processedHeight: 1280
  }
}
```

**If you DON'T see these logs** → External worker code not updated ❌

### Step 2: Check Callback Logs

In your main app logs (Vercel dashboard), look for:

```
[normalize-callback] success
{
  videoId: "xyz123",
  originalDeletedAt: false,
  dimensions: {
    original: { width: 2160, height: 3840 },
    processed: { width: 720, height: 1280 },
    stored: {
      originalWidth: 2160,
      originalHeight: 3840,
      processedWidth: 720,
      processedHeight: 1280
    }
  }
}
```

**What to check**:

- Are `original.width/height` and `processed.width/height` numbers or null?
- Are `stored.*` values saved correctly?

**If dimensions are null in payload** → Worker not sending them ❌  
**If stored values are null** → Database write issue ❌

### Step 3: Check Database Directly

Run this SQL query in your database:

```sql
SELECT
  id,
  "originalWidth",
  "originalHeight",
  "processedWidth",
  "processedHeight",
  "processStatus",
  "createdAt"
FROM "CaptainVideo"
WHERE "processStatus" = 'ready'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Expected result**:

```
| id     | originalWidth | originalHeight | processedWidth | processedHeight | processStatus | createdAt           |
|--------|---------------|----------------|----------------|-----------------|---------------|---------------------|
| xyz123 | 2160          | 3840           | 720            | 1280            | ready         | 2025-10-17 00:00:00 |
```

**If all values are null** → Worker or callback issue ❌

### Step 4: Test Callback Manually

Test if the callback can save dimensions:

```bash
# Get session token (from browser DevTools → Application → Cookies → next-auth.session-token)
export SESSION_TOKEN="your-session-token"
export VIDEO_ID="existing-video-id"

# Test callback with dimensions
curl -X POST "https://your-app.vercel.app/api/videos/normalize-callback" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "videoId": "'$VIDEO_ID'",
    "success": true,
    "originalWidth": 1920,
    "originalHeight": 1080,
    "processedWidth": 1280,
    "processedHeight": 720
  }'
```

**Expected response**: `{"ok": true, "video": {...}}`

Then check database if dimensions were saved.

---

## Quick Fix: Redeploy External Worker

### If your external worker is a separate Vercel project

1. **Copy updated template**:

   ```bash
   # From main repo
   cp src/app/dev/_external-worker/normalize.ts ../fishon-video-worker/api/worker-normalize.ts
   ```

2. **Verify changes**:

   ```bash
   cd ../fishon-video-worker
   grep -n "originalWidth\|processedWidth" api/worker-normalize.ts
   # Should see multiple matches with dimension probing code
   ```

3. **Deploy**:

   ```bash
   vercel --prod
   ```

4. **Test immediately**:
   - Upload a new video
   - Wait for processing
   - Check admin dashboard for dimensions

---

## Verification Checklist

After redeploying external worker:

- [ ] External worker logs show `[worker] original_metadata_probed` with dimensions
- [ ] External worker logs show `[worker] processed_metadata_probed` with dimensions
- [ ] External worker logs show `[worker] sending_result` with all 4 dimension fields
- [ ] Main app logs show `[normalize-callback] success` with dimensions in payload
- [ ] Main app logs show `stored.*` values are non-null
- [ ] Database query shows actual integer values for width/height
- [ ] Admin dashboard displays resolutions like "1920×1080" and "1280×720"

---

## Alternative: Use Internal Worker for Testing

If external worker is difficult to debug, temporarily test with internal worker:

1. **Comment out external worker URL**:

   ```bash
   # In .env.local
   # EXTERNAL_WORKER_URL=https://...
   ```

2. **Ensure local ffmpeg available**:

   ```bash
   which ffmpeg
   # Should show path like /opt/homebrew/bin/ffmpeg
   ```

3. **Upload test video**:

   - Will use internal `/api/workers/transcode-simple` route
   - Check logs for dimension probing

4. **Note**: Internal worker might not have dimension probing yet. You may need to add similar logic there.

---

## Expected Resolution Patterns

Once working, you should see:

| Original (Portrait) | Normalized (Portrait) |
| ------------------- | --------------------- |
| 2160×3840 (9:16)    | 720×1280 (9:16)       |
| 1080×1920 (9:16)    | 405×720 (9:16)        |

| Original (Landscape) | Normalized (Landscape) |
| -------------------- | ---------------------- |
| 1920×1080 (16:9)     | 1280×720 (16:9)        |
| 3840×2160 (16:9)     | 1280×720 (16:9)        |

**Note**: Heights are capped at 720px, widths are auto-calculated to maintain aspect ratio.

---

## Contact Points

**Worker code location**: `src/app/dev/_external-worker/normalize.ts` (template)  
**Callback handler**: `src/app/api/videos/normalize-callback/route.ts`  
**Admin display**: `src/app/(admin)/staff/media/VideoSection.tsx`  
**Database schema**: `prisma/schema.prisma` → `CaptainVideo` model

---

## Next Steps

1. **Upload a new video** and follow Step 1-3 above
2. **Report findings**: Which step shows null dimensions?
3. **If Step 1 fails**: Redeploy external worker
4. **If Step 2 fails**: Check QStash payload encoding
5. **If Step 3 fails**: Check Prisma type generation

Once you identify where dimensions become null, we can fix that specific point in the pipeline.
