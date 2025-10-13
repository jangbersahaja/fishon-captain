# Video Upload System Migration Guide

## Phase 13: Migration & Deprecation

This document outlines the migration from legacy video upload components to the new enhanced video upload queue system.

## Overview

The new video upload system provides:

- ✅ **Automatic retry and persistence** - Uploads resume after page refresh
- ✅ **Better progress tracking** - Real-time upload progress and status
- ✅ **Thumbnail capture integration** - Automatic video thumbnail generation
- ✅ **Queue management** - Multiple file uploads with concurrency control
- ✅ **Enhanced error handling** - Better error messages and recovery
- ✅ **State synchronization** - React-friendly state management
- ✅ **Comprehensive testing** - Full test coverage with mocking

## Component Migration Map

### ✅ Enhanced Components (Use These)

| Component               | Status   | Description                              |
| ----------------------- | -------- | ---------------------------------------- |
| `NewVideoUploader`      | ✅ Ready | Basic queue-based uploader               |
| `EnhancedVideoUploader` | ✅ Ready | Full-featured uploader with trim support |
| `useVideoQueue`         | ✅ Ready | React hook for queue management          |

### ⚠️ Legacy Components (To Be Deprecated)

| Component            | Status        | Migration Target          |
| -------------------- | ------------- | ------------------------- |
| `VideoUploader`      | 🔄 Migrating  | → `EnhancedVideoUploader` |
| `VideoUploadSection` | 📋 Identified | → `EnhancedVideoUploader` |
| `VideoUploadTest`    | 🧪 Dev Only   | → Keep for debugging      |

## Migration Steps

### 1. Replace VideoUploader Usage

**Before (Legacy):**

```tsx
import { VideoUploader } from "@/components/captain/VideoUploader";

<VideoUploader ownerId={userId} onUploaded={() => console.log("uploaded")} />;
```

**After (Enhanced):**

```tsx
import { EnhancedVideoUploader } from "@/components/captain/EnhancedVideoUploader";

<EnhancedVideoUploader
  onUploaded={() => console.log("uploaded")}
  maxFiles={5}
  allowMultiple={true}
  autoStart={true}
  showQueue={true}
/>;
```

### 2. Replace VideoUploadSection Usage

**Before (Legacy):**

```tsx
import { VideoUploadSection } from "@features/charter-onboarding/components/VideoUploadSection";

<VideoUploadSection
  charterId={charterId}
  max={5}
  onBlockingChange={setBlocking}
  onItemsChange={setItems}
  seedVideos={existingVideos}
/>;
```

**After (Enhanced):**

```tsx
import { EnhancedVideoUploader } from "@/components/captain/EnhancedVideoUploader";

<EnhancedVideoUploader
  maxFiles={5}
  onUploaded={() => {
    // Handle completion
    setBlocking(false);
  }}
  allowMultiple={true}
  showQueue={true}
/>;
```

### 3. Direct Queue Management

For advanced use cases, use the hook directly:

```tsx
import { useVideoQueue } from "@/hooks/useVideoQueue";

function CustomUploader() {
  const {
    items,
    enqueue,
    cancel,
    retry,
    pause,
    resume,
    setMaxConcurrent,
    setAutoStart,
    startUpload,
    updatePendingTrim,
  } = useVideoQueue();

  // Custom implementation using queue primitives
}
```

## Configuration Options

### EnhancedVideoUploader Props

| Prop            | Type         | Default   | Description                      |
| --------------- | ------------ | --------- | -------------------------------- |
| `onUploaded`    | `() => void` | undefined | Callback when uploads complete   |
| `maxFiles`      | `number`     | 5         | Maximum number of files in queue |
| `allowMultiple` | `boolean`    | true      | Allow multiple file selection    |
| `autoStart`     | `boolean`    | true      | Auto-start uploads when enqueued |
| `showQueue`     | `boolean`    | true      | Display the upload queue UI      |

### VideoQueue Configuration

```tsx
const {
  setMaxConcurrent, // Control simultaneous uploads
  setAutoStart, // Toggle automatic upload start
  pause, // Pause all uploads
  resume, // Resume all uploads
} = useVideoQueue();
```

## Breaking Changes

### 1. ownerId Removal

The new system doesn't require `ownerId` prop as it handles uploads through the existing API endpoints.

### 2. Different Event Callbacks

- Legacy: `onBlockingChange`, `onItemsChange`
- Enhanced: `onUploaded` (simplified)

### 3. Simplified State Management

- Legacy: Complex state objects with multiple status fields
- Enhanced: Unified `VideoUploadItem` with discriminated union status

### 4. CaptainVideo is the single source of truth

- All video reads now come from the `CaptainVideo` model. Legacy `PendingMedia` is not used for video state in the UI.
- The finish route moves uploads into `CaptainVideo` and (optionally) queues normalization.

### 5. Hook changes (useCharterMediaManager)

- The hook no longer uploads videos nor tracks `pendingId`/transcoding state.
- Video uploads must flow through `EnhancedVideoUploader` and `VideoManager`. The hook only persists ordered lists and supports removal via `/api/charters/:id/media/remove`.

## Testing

All enhanced components have comprehensive test coverage:

```bash
# Run video upload tests
npm test -- --run videoQueue useVideoQueue

# Run all tests
npm test
```

## Performance Benefits

- **Memory Efficiency**: Queue items are persisted to IndexedDB
- **Network Resilience**: Automatic retry with exponential backoff
- **Concurrency Control**: Configurable simultaneous upload limits
- **Progress Accuracy**: Real-time upload progress tracking

## Migration Timeline

1. **Phase 13.1**: ✅ Create enhanced components
2. **Phase 13.2**: 🔄 Update MediaPricingStep usage
3. **Phase 13.3**: 📋 Deprecate legacy components
4. **Phase 13.4**: 🗑️ Remove legacy code (complete)

## Cleanup Status

- Deprecated endpoints: `/api/media/video` responds 410 (use finish/queue flow)
- Legacy components not used: `VideoUploadSection`, `VideoUploader`, `NewVideoUploader` (kept for reference or dev only)
- Tests updated to CaptainVideo-only flow; legacy PendingMedia video tests removed
- `usePendingMediaPoll` returns a documented no-op for compatibility but is no longer consumed

## Support

For migration assistance or questions:

- Check test files for usage examples
- Review `NewVideoUploader.tsx` for basic implementation
- See `EnhancedVideoUploader.tsx` for advanced features
