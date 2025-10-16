# Video Gallery Fixes - Review Step

## Issues Identified

### 1. Gallery Not Loading After Reload

**Problem**: VideoPreviewCarousel component not showing after page reload in review step.

**Root Cause**: Dynamic import with `ssr: false` causing hydration issues + inadequate loading state.

**Fix**:

- Improved loading placeholder in `previewPanel.tsx` to match gallery dimensions
- Added debug logging to trace videos prop flow
- Changed conditional rendering from `&&` to ternary for better React reconciliation

### 2. Some Videos Not Loaded

**Problem**: Videos filtered out and not showing in gallery.

**Root Cause**: Too strict URL pattern matching - only accepting `captain-videos/` path, excluding original upload paths.

**Fix** (`FormSection.tsx`):

```typescript
// OLD: Only normalized path
if (!/\bcaptain-videos\//.test(url)) continue;

// NEW: Accept both normalized AND original paths
const isCaptainVideo =
  /\bcaptain-videos\//.test(url) || // normalized (720p)
  /captains\/[^/]+\/videos\//.test(url); // original upload
```

### 3. Thumbnails Not Showing

**Problem**: Thumbnail URLs not passed through the data pipeline.

**Root Causes**:

1. **Server-side**: `thumbnailUrl` fetched from DB but not included in video metadata
2. **Component**: No fallback visual for missing/failed thumbnails

**Fixes**:

#### A. Server Data Layer (`/captain/charter/page.tsx`)

```typescript
// OLD: Only name + url
const videoMetas = videos.map((video) => ({
  name: deriveFileName(fileUrl, `video-${index + 1}`),
  url: fileUrl,
}));

// NEW: Include thumbnail + duration
const videoMetas = videos.map((video) => ({
  name: deriveFileName(fileUrl, `video-${index + 1}`),
  url: fileUrl,
  thumbnailUrl: video.thumbnailUrl, // ← Added
  durationSeconds: video.processedDurationSec, // ← Added
}));
```

#### B. Thumbnail Component (`VideoPreviewCarousel.tsx`)

- Improved fallback placeholder with video icon (instead of plain gray)
- Added gradient background for better visual appeal
- Added error logging to track failed thumbnail loads
- Increased sizes hint from `160px` to `176px` (actual w-44 = 176px)

## Files Modified

1. **`src/app/(portal)/captain/charter/page.tsx`**

   - Added `thumbnailUrl` and `durationSeconds` to video metadata

2. **`src/features/charter-onboarding/FormSection.tsx`**

   - Expanded URL pattern matching for captain videos
   - Added comprehensive debug logging

3. **`src/features/charter-onboarding/preview/previewPanel.tsx`**

   - Improved loading placeholder dimensions
   - Added debug logging for videos prop
   - Changed conditional rendering pattern

4. **`src/components/charter/VideoPreviewCarousel.tsx`**
   - Enhanced VideoThumb fallback with icon
   - Added debug logging for items processing
   - Improved error handling

## Testing Checklist

- [ ] Navigate to review step - gallery should load immediately
- [ ] Refresh page on review step - gallery persists
- [ ] All uploaded videos appear in gallery (check count)
- [ ] Thumbnails display for all videos (or fallback icon)
- [ ] Click video thumbnail - lightbox opens correctly
- [ ] Lightbox thumbnails also show (bottom film strip)
- [ ] Console logs show video flow (can be removed after verification)

## Debug Output

With console logging enabled, you should see:

```
[FormSection] normalizedVideoPreviews: [...]
[FormSection] Adding video: { url, name, thumbnailUrl }
[FormSection] Final review videos: 3 [...]
[PreviewPanel] videos prop: { hasVideos: true, length: 3, sample: {...} }
[VideoPreviewCarousel] items: { totalVideos: 3, filteredItems: 3, sample: {...} }
```

## Cleanup (Post-Verification)

Once verified working, remove debug console.log statements from:

- `FormSection.tsx` (lines 880-912)
- `previewPanel.tsx` (lines 180-186)
- `VideoPreviewCarousel.tsx` (lines 29-35)

## Related Files

- Video normalization worker: `src/app/dev/_external-worker/normalize.ts` (updated scaling)
- Trim modal size estimates: `src/components/captain/VideoTrimModal.tsx` (updated bitrate)
