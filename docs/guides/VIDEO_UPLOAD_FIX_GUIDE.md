# FishOn Captain Video Upload & Trim System – Refactor & UX Guide

## Overview

This guide documents the improved workflow, UI/UX, and code responsibilities for the video upload, trim, queue, callback, and preview panel features. It includes recent tweaks for minimalist queue cards and preview logic.

---

## 1. Upload & Queue Section

### UX/Design

- **Mobile-first:** Minimalist, inline queue card component (no modal/popover).
- **Remove Button:** Works for queued items.
- **Drop Box:** Drag-and-drop area for video files.
- **Select Video Button:** Styled to match "Add Photo" button.
- **Max Video Guard:** Prevent >10 videos total.
- **Queue Limit UI:** "You can upload up to 5 videos at once."
- **Auto Remove Done:** Completed uploads auto-remove from queue.
- **Failed Queue Persistence:** Failed uploads not persisted after reload.
- **Retry Button:** Works for failed uploads.

### Implementation

- Refactor `EnhancedVideoUploader.tsx` and queue logic. (IN PROGRESS)
- Use inline minimalist card for queue items. (DONE)
- Add drag-and-drop logic. (DONE)
- Guard for max 10 videos. (DONE client-side; server validation pending)
- Auto-remove done, do not persist failed. (DONE)
- Test remove/retry buttons. (PENDING QA)

---

## 2. Trim UI

- **150MB Guard:** Removed; allow >150MB selection.
- **Final Size Calculation:** Estimate trimmed video size; block if >100MB.
- **Bypass Logic:** If video ≤30s and ≤720p, allow direct upload (no transcode).
- **Single Confirm Button:** One confirm button, conditional logic.
- **Mobile Trim Points:** Fix drag/select for start/end points on mobile.

---

## 3. Trim Process

- **Flexible Trim:** User can trim to <30s; send start and end points to worker.

---

## 4. Media Grid

- **"New" Indicator:** Show "New" badge for recently uploaded videos.
- **Uploaded Time:** Show relative timestamp (e.g., "5s ago").

---

## 5. Callback Issue

- **Original File Removal:** Callback deletes original blob and sets `originalDeletedAt`.

---

## 6. Preview Panel

- **Source:** Only show videos from `CaptainVideo` table.
- **Video Source:** Use `ready720pUrl` if ready, else use original if bypassed.
- **Thumbnails:** Fix thumbnail display logic.
- **Processing Indicator:** Show fallback or "processing" indicator if video is not ready.

---

## 7. Development & Testing

- Test all features on desktop and mobile.
- Review with team/admin before deploying.

---

## 8. Component Responsibilities

- **Uploader/Queue:** `EnhancedVideoUploader.tsx`, queue logic, inline minimalist card.
- **Trim UI:** `VideoTrimModal.tsx`, hooks for drag/select.
- **Callback:** `src/app/api/videos/normalize-callback/route.ts`.
- **Preview Panel:** Preview component, queries `CaptainVideo`, uses correct video source.
- **Media Grid:** Grid component, badge/timestamp logic.

---

## 9. Known Edge Cases & Troubleshooting

- Large video uploads: Final trimmed size must be ≤100MB.
- Bypass logic: Only for ≤30s and ≤720p videos.
- Failed queue: Not persisted after reload.
- Mobile drag/select: Use touch events for trim points.

---

## 10. How to Extend

- Add new video features in `CaptainVideo` model and update UI accordingly.
- For new queue logic, update inline card and queue reducer.
- For preview, always check video status and source selection logic.

---

## 11. Quick Reference

- **Max videos:** 10 total
- **Max concurrent uploads:** 5
- **Trim size limit:** 100MB
- **Bypass:** ≤30s, ≤720p
- **Queue card:** Inline, minimalist
- **Preview:** Use 720p if ready, original if bypass

---

For questions or further improvements, see the feature module README or contact the lead developer.

---

## 12. Oct 9 2025 Enhancements (Implemented In This Pass)

### Mobile / Touch Trim Improvements

- Added unified touch handling for start, end, and selection drag (with haptic vibrate attempt where supported).
- Larger hit targets on mobile (`w-4` handles) with active scale animation.
- `touch-none` added to prevent accidental scrolling/selection while dragging.

### Bitrate-Based Size Estimation

- Replaced linear proportional size estimate with: `(file.size / fullDurationSec) * selectedDurationSec * 1.04` (adds ~4% container overhead cushion).
- Displays both approximate output size and computed bitrate (kbps) in trim modal metadata bar.

### Trim Modal UI Tweaks

- Shows Size≈ and Bitrate≈ values; still enforces 100MB trimmed clip ceiling.
- Maintains bypass banner (already compliant) logic; no functional regression.

### Video Manager Refresh

- Added `timeAgo` utility for relative timestamps ("just now", `Xs ago`, `Xm ago`, etc.).
- NEW badge displayed for first 2 minutes after creation.
- Processing overlay simplified: subtle blur + animated yellow dot, less flicker.
- Manual thumbnail capture button when ready video lacks a thumbnail (attempts client-side frame extraction on demand).
- Direct `open` link to normalized (ready720p) URL when present.

### Thumbnail Capture Fallback

- User-triggered capture improves perceived completeness without waiting for server callback side-effects.

### No API Changes

- All changes are UI/UX layer only; server routes and normalization logic untouched.

### Follow-Up Suggestions

- Persist manually captured thumbnails via an optional POST endpoint.
- Add tests for: touch drag path, bitrate estimation boundaries, timeAgo utility edge cases.
- Telemetry: counters for manual thumbnail capture attempts & success rate.

Last updated: 2025-10-09
