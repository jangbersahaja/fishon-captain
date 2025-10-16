# Admin Video Details Feature

**Date**: 16 October 2025  
**Status**: ✅ **Implemented - Ready for Data Collection**  
**Purpose**: Display original vs normalized video comparison in admin dashboard

---

## Overview

Added comprehensive video metadata display in the staff media admin page (`/staff/media`). The "Durations" column has been replaced with a "Details" column that shows side-by-side comparison of original and normalized (720p) video specifications.

---

## What Was Implemented

### 1. Type System Updates

**File**: `src/app/(admin)/staff/media/shared.ts`

Added new fields to `VideoRow` type:

```typescript
export type VideoRow = {
  // ... existing fields ...

  // Video metadata
  originalSize: number | null;
  originalResolution: string | null;
  normalizedSize: number | null;
  normalizedResolution: string | null;
};
```

### 2. Data Fetching

**File**: `src/app/(admin)/staff/media/data.ts`

#### Added Helper Function

```typescript
async function getBlobMetadata(url: string | null): Promise<{
  size: number | null;
  contentType: string | null;
}> {
  if (!url) return { size: null, contentType: null };

  try {
    const blob = await head(url);
    return {
      size: blob.size,
      contentType: blob.contentType || null,
    };
  } catch (error) {
    console.error(
      `[getBlobMetadata] Failed to fetch metadata for ${url}:`,
      error
    );
    return { size: null, contentType: null };
  }
}
```

#### Parallel Metadata Fetching

```typescript
// Fetch blob metadata for original and normalized videos in parallel
const blobMetadataPromises = rawItems.flatMap((item) => [
  getBlobMetadata(item.originalUrl).then((meta) => ({
    id: item.id,
    type: "original" as const,
    ...meta,
  })),
  getBlobMetadata(item.ready720pUrl).then((meta) => ({
    id: item.id,
    type: "normalized" as const,
    ...meta,
  })),
]);

const blobMetadataResults = await Promise.allSettled(blobMetadataPromises);
```

**Benefits**:

- ✅ Fetches metadata for all videos in parallel (non-blocking)
- ✅ Graceful error handling with `Promise.allSettled`
- ✅ Maps results by video ID for efficient lookup
- ✅ Uses Vercel Blob's `head()` function (fast, no download required)

### 3. UI Display

**File**: `src/app/(admin)/staff/media/VideoSection.tsx`

#### Column Header Change

```typescript
// Before: "Durations"
// After: "Details"
<th className="px-4 py-3 text-left">Details</th>
```

#### Cell Content

```tsx
<td className="px-4 py-3 align-top text-xs text-slate-600">
  <div className="space-y-2">
    {/* Original Video Details */}
    <div className="space-y-1">
      <div className="font-medium text-slate-700 text-[11px] uppercase tracking-wide">
        Original
      </div>
      <div className="text-[11px] text-slate-600 space-y-0.5">
        <div>
          <span className="text-slate-500">Size:</span>{" "}
          {row.originalSize ? formatBytes(row.originalSize) : "-"}
        </div>
        <div>
          <span className="text-slate-500">Duration:</span>{" "}
          {row.originalDurationSec != null
            ? `${Math.round(row.originalDurationSec)}s`
            : "-"}
        </div>
        <div>
          <span className="text-slate-500">Resolution:</span>{" "}
          {row.originalResolution || "N/A"}
        </div>
      </div>
    </div>

    {/* Normalized Video Details */}
    {(row.ready720pUrl || row.normalizedSize || row.processedDurationSec) && (
      <div className="space-y-1 pt-2 border-t border-slate-200">
        <div className="font-medium text-emerald-700 text-[11px] uppercase tracking-wide">
          Normalized (720p)
        </div>
        <div className="text-[11px] text-slate-600 space-y-0.5">
          <div>
            <span className="text-slate-500">Size:</span>{" "}
            {row.normalizedSize ? formatBytes(row.normalizedSize) : "-"}
          </div>
          <div>
            <span className="text-slate-500">Duration:</span>{" "}
            {row.processedDurationSec != null
              ? `${Math.round(row.processedDurationSec)}s`
              : "-"}
          </div>
          <div>
            <span className="text-slate-500">Resolution:</span>{" "}
            {row.normalizedResolution || "N/A"}
          </div>
        </div>
      </div>
    )}
  </div>
</td>
```

**Display Format Example**:

```
Details Column:
┌─────────────────────────┐
│ ORIGINAL                │
│ Size: 45 MB             │
│ Duration: 25s           │
│ Resolution: N/A         │
├─────────────────────────┤
│ NORMALIZED (720P)       │
│ Size: 8.2 MB            │
│ Duration: 25s           │
│ Resolution: N/A         │
└─────────────────────────┘
```

---

## Current State

### What's Working ✅

1. **Size Fetching**: Original and normalized file sizes are fetched from Vercel Blob metadata
2. **Duration Display**: Original and processed durations from database
3. **Parallel Loading**: All metadata fetched concurrently for performance
4. **Error Handling**: Graceful fallbacks when metadata unavailable
5. **Conditional Display**: Normalized section only shows when 720p video exists

### What's Not Implemented Yet 🚧

1. **Resolution Detection**: Currently shows "N/A"
   - Requires video dimension extraction
   - Options:
     - Store dimensions in database during processing (recommended)
     - Use ffprobe via API endpoint
     - Use mediainfo library

---

## Next Steps: Resolution Implementation

### Option A: Store During Processing (Recommended)

Add width/height to database during video normalization:

**Prisma Schema Update**:

```prisma
model CaptainVideo {
  // ... existing fields ...
  originalWidth  Int?
  originalHeight Int?
  processedWidth  Int?
  processedHeight Int?
}
```

**Worker Updates**:

```typescript
// In normalize-callback or worker-normalize
const dimensions = await probeDimensions(videoUrl);
await prisma.captainVideo.update({
  where: { id },
  data: {
    originalWidth: dimensions.original.width,
    originalHeight: dimensions.original.height,
    processedWidth: 1280,
    processedHeight: 720,
  },
});
```

**Display Logic**:

```typescript
const originalResolution =
  row.originalWidth && row.originalHeight
    ? `${row.originalWidth}×${row.originalHeight}`
    : "N/A";
const normalizedResolution =
  row.processedWidth && row.processedHeight
    ? `${row.processedWidth}×${row.processedHeight}`
    : "N/A";
```

### Option B: API Endpoint with ffprobe

Create `/api/admin/video/probe` endpoint:

```typescript
import ffmpeg from "fluent-ffmpeg";

export async function POST(req: Request) {
  const { url } = await req.json();

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(url, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      resolve({
        width: videoStream?.width,
        height: videoStream?.height,
      });
    });
  });
}
```

**Cons**:

- Requires ffmpeg/ffprobe installed on server
- Slower (additional API call per video)
- Not cached

---

## Data Collection for Estimation Formula

Now that the admin page displays sizes, you can collect real data:

### Steps to Collect Data

1. **Navigate to Admin Page**: `/staff/media?tab=videos`
2. **Filter to Ready Videos**: Click "Ready" filter
3. **Collect Sample Data**: For 10-20 videos, note:

   ```
   Video 1:
   - Original: [Size], [Duration]s
   - Normalized: [Size], [Duration]s

   Video 2:
   ...
   ```

### Data Format Template

```markdown
| Video ID | Original Size | Orig Duration | Norm Size | Norm Duration | Compression Ratio |
| -------- | ------------- | ------------- | --------- | ------------- | ----------------- |
| xyz123   | 45 MB         | 25s           | 8.2 MB    | 25s           | 5.5x              |
| abc456   | 120 MB        | 30s           | 9.5 MB    | 30s           | 12.6x             |
| def789   | 28 MB         | 20s           | 6.1 MB    | 20s           | 4.6x              |
```

### Analysis Goals

Once data is collected, we can:

1. **Calculate average compression ratio** (original size / normalized size)
2. **Identify patterns** (e.g., 4K videos compress more than 1080p)
3. **Update estimation formula** in VideoTrimModal.tsx
4. **Add confidence intervals** (e.g., "Estimated: 7-9 MB")

---

## Files Modified

1. **`src/app/(admin)/staff/media/shared.ts`**

   - Added `originalSize`, `originalResolution`, `normalizedSize`, `normalizedResolution` to `VideoRow` type

2. **`src/app/(admin)/staff/media/data.ts`**

   - Added `getBlobMetadata()` helper function
   - Added parallel metadata fetching with `Promise.allSettled`
   - Updated `loadVideoData()` to populate new metadata fields

3. **`src/app/(admin)/staff/media/VideoSection.tsx`**
   - Changed column header from "Durations" to "Details"
   - Replaced duration-only display with comprehensive metadata display
   - Added formatted size display using `formatBytes()`
   - Added conditional rendering for normalized video section

---

## Performance Considerations

### Current Implementation

- **Parallel Fetching**: All blob metadata fetched concurrently
- **Promise.allSettled**: Individual failures don't block entire page
- **HEAD Requests**: Only fetches metadata, not video content (~1KB per request)

### Estimated Load Time

For 100 videos:

- 200 HEAD requests (original + normalized)
- Each request: ~50-100ms
- Parallel execution: ~100-200ms total (vs ~10-20s sequential)

### Future Optimizations

1. **Caching**: Store metadata in database to avoid repeated Blob API calls
2. **Pagination**: Limit to 50 videos per page
3. **Background Job**: Pre-fetch and cache metadata periodically
4. **Redis Cache**: Cache metadata for 1 hour

---

## Testing Checklist

### Manual Testing

- [ ] Navigate to `/staff/media?tab=videos`
- [ ] Verify "Details" column appears (not "Durations")
- [ ] Check "Original" section shows:
  - [ ] Size in MB (e.g., "45 MB")
  - [ ] Duration in seconds (e.g., "25s")
  - [ ] Resolution shows "N/A"
- [ ] Check "Normalized (720p)" section (for ready videos):
  - [ ] Size in MB (e.g., "8.2 MB")
  - [ ] Duration in seconds (e.g., "25s")
  - [ ] Resolution shows "N/A"
- [ ] Verify normalized section only appears when 720p exists
- [ ] Check loading performance (should load in <2s for 100 videos)

### Edge Cases

- [ ] Videos without normalized versions (only original shows)
- [ ] Videos with failed processing (original only, no normalized)
- [ ] Very large videos (>100 MB) - size format correct
- [ ] Very short videos (<5s) - duration displays correctly
- [ ] Blob metadata fetch failures (shows "-" gracefully)

---

## Known Limitations

1. **Resolution Not Available**: Shows "N/A" until Option A or B implemented
2. **No Caching**: Metadata fetched on every page load
3. **No Bitrate Display**: Could be added if needed
4. **No Codec Info**: Could extract from Blob contentType if needed

---

## Future Enhancements

### Immediate (After Data Collection)

1. **Update Estimation Formula**: Use collected compression ratios
2. **Add Resolution Storage**: Implement Option A for resolution tracking
3. **Cache Metadata**: Store in database to reduce API calls

### Medium-Term

1. **Compression Ratio Display**: Show "5.5x compression" in details
2. **Quality Metrics**: Show bitrate, codec, quality score
3. **Visual Preview**: Hover to show thumbnail comparison
4. **Export Data**: Download CSV of all video metadata

### Long-Term

1. **Real-Time Monitoring**: WebSocket updates for processing videos
2. **Analytics Dashboard**: Charts showing compression efficiency over time
3. **Cost Analysis**: Calculate storage costs vs quality trade-offs
4. **Bulk Operations**: Batch re-process videos with new settings

---

**Status**: ✅ Implementation complete, ready for data collection from admin dashboard to improve size estimation accuracy.
