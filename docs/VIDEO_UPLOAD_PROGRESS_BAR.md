# Video Upload Progress Bar Implementation

## Overview

Unified progress bar that shows smooth, realistic progress from 0% to 100% across all upload and processing stages.

## Progress Stages

### Stage 1: Start (0% → 10%)

- **Trigger:** Upload item created and queued
- **Action:** Initial setup, preparing upload request
- **Duration:** Instant
- **Progress:** Jumps to 10%

### Stage 2: Uploading (10% → 80%)

- **Trigger:** Direct client upload to Vercel Blob begins
- **Action:** File transfer in progress
- **Duration:** 2-15 seconds (based on file size)
- **Progress:** Smooth increments: 15% → 25% → 35% → 45% → 55% → 65% → 75% → 80%
- **Note:** Since `@vercel/blob/client` doesn't expose real-time progress events, we simulate smooth progress based on estimated upload time

### Stage 3: Upload Complete (80%)

- **Trigger:** Blob upload successfully returns URL
- **Action:** Upload confirmed
- **Duration:** Instant
- **Progress:** Jumps to 80%

### Stage 4: Processing Started (80% → 85%)

- **Trigger:** Processing item created
- **Action:** Transition from upload to processing
- **Duration:** Instant
- **Progress:** Jumps to 85%

### Stage 5: Metadata Preparation (85% → 90%)

- **Trigger:** Building form data for finalization
- **Action:** Preparing trim metadata, dimensions, duration info
- **Duration:** Instant
- **Progress:** Jumps to 90%

### Stage 6: Thumbnail Capture (90% → 92%)

- **Trigger:** Capturing thumbnail from video URL
- **Action:** Canvas-based thumbnail extraction
- **Duration:** ~500ms
- **Progress:** Jumps to 92%

### Stage 7: Finalizing (92% → 95%)

- **Trigger:** Calling `/api/blob/finish`
- **Action:** Server-side video record creation, queue worker
- **Duration:** ~1-2 seconds
- **Progress:** Jumps to 95%

### Stage 8: Final Cleanup (95% → 98%)

- **Trigger:** Finish API returns success
- **Action:** Cleanup, preparing completion state
- **Duration:** ~200ms
- **Progress:** Jumps to 98%

### Stage 9: Complete (98% → 100%)

- **Trigger:** Brief pause for smooth transition
- **Action:** Mark as done
- **Duration:** 200ms
- **Progress:** Reaches 100%

## Implementation Details

### Upload Progress Simulation

```typescript
// Estimate upload time based on file size (2s-15s range)
const estimatedUploadMs = Math.min(
  Math.max(started.file.size / 1024 / 100, 2000),
  15000
);

// Progress checkpoints during upload
const progressSteps = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.8];
const stepInterval = estimatedUploadMs / progressSteps.length;
```

### Processing Progress Updates

```typescript
const updateProcessingProgress = (progress: number) => {
  const progressDetails = this.updateProgressDetails(
    started.id,
    started.file.size,
    started.file.size,
    "finalizing"
  );
  const updating: ProcessingUploadItem = {
    ...current,
    progress,
    progressDetails,
  };
  this.replaceItem(updating);
};
```

## User Experience Benefits

1. **No Stuck States:** Continuous progress prevents users from thinking the upload is frozen
2. **Realistic Timing:** Upload stage takes most of the time (70%), matching actual behavior
3. **Smooth Transitions:** Gradual increments during upload feel natural
4. **Processing Visibility:** Clear indication that post-upload processing is happening
5. **Completion Feel:** Final 98% → 100% transition provides satisfying completion

## Technical Notes

- **Type Safety:** Updated `ProcessingUploadItem.progress` from literal `1` to `number` to allow intermediate values
- **Error Handling:** Progress is preserved on errors so users can see how far the upload got
- **Cancel Support:** Progress snapshot is captured when user cancels
- **Persistence:** Progress state is persisted to IndexedDB for page refresh survival

## Testing Checklist

- [ ] Small video (< 5MB): Progress completes in ~3-5 seconds
- [ ] Medium video (10-30MB): Progress completes in ~5-10 seconds
- [ ] Large video (50MB+): Progress completes in ~10-15 seconds
- [ ] Progress bar doesn't jump backward
- [ ] Cancel during upload preserves last progress value
- [ ] Error during upload shows progress at failure point
- [ ] Multiple simultaneous uploads each show independent progress

## Future Enhancements

1. **Real Progress Events:** If `@vercel/blob/client` adds progress callbacks, replace simulation with actual events
2. **Adaptive Timing:** Learn from previous uploads to adjust estimated times
3. **Network Speed Detection:** Adjust progress simulation based on detected connection speed
4. **Retry Progress:** Show retry attempts in progress indicator
