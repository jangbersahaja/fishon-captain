# PendingMedia & Legacy VideoUploader Cleanup

## Overview

This document outlines the process for auditing, planning, and executing the removal of all legacy video uploader logic and the PendingMedia table from the FishOn Captain Register codebase. The goal is to fully migrate to the CaptainVideo pipeline and EnhancedVideoUploader component.

## Audit Results

### Legacy References Found

- **Prisma Model:** `PendingMedia` and related enums/fields in `schema.prisma`
- **API Routes:**
  - `/api/media/upload/route.ts`
  - `/api/media/video/route.ts`
  - `/api/media/pending/route.ts`
  - `/api/charters/[id]/media/remove/route.ts`
  - `/api/debug/charter-media/route.ts`
- **Admin/Staff Tools:**
  - `src/app/(admin)/staff/media/data.ts`
  - `src/app/(admin)/staff/media/shared.ts`
- **Dev/Debug:**
  - `src/app/dev/debug/VideoUploadTest.tsx`
  - `src/app/dev/debug/DebugPanel.tsx`
  - `src/app/dev/debug/page.ts`
- **Charter Onboarding:**
  - `src/features/charter-onboarding/hooks/useCharterMediaManager.ts`
  - `src/features/charter-onboarding/hooks/usePendingMediaPoll.ts`
  - `src/features/charter-onboarding/__tests__/useCharterMediaManager.pendingMedia.test.tsx`
- **Components:**
  - `src/components/captain/VideoUploader.tsx` (legacy)
  - `src/components/captain/NewVideoUploader.tsx` (basic queue)
  - `src/components/captain/EnhancedVideoUploader.tsx` (check for fallback logic)
  - `src/features/charter-onboarding/components/VideoUploadSection.tsx`
- **Docs:**
  - `docs/VIDEO_UPLOAD_MIGRATION.md`
  - `docs/VIDEO_UPLOAD_PHASES_STATUS.md`
  - `docs/FIX_ENHANCED_VIDEO_UPLOADER_LOOP.md`
  - `docs/AUTO_TRIM_MODAL_IMPLEMENTATION.md`

## Cleanup & Migration Plan

### 1. Prisma/DB

- Remove `PendingMedia` model and related enums/fields after migration.
- Migrate any remaining data to `CaptainVideo` if needed.

### 2. API Layer

- Remove endpoints and logic that create, update, or query `PendingMedia`.
- Refactor upload endpoints to use only `CaptainVideo` and new queue logic.

### 3. Hooks & Feature Modules

- Delete or refactor hooks like `usePendingMediaPoll` and `useCharterMediaManager` to remove PendingMedia logic.
- Update onboarding flows to use only `CaptainVideo`.

### 4. Components

- Remove `VideoUploader.tsx` and any usage of legacy uploader.
- Ensure all upload UI uses `EnhancedVideoUploader` and CaptainVideo pipeline.
- Remove fallback logic for PendingMedia in `EnhancedVideoUploader`.

### 5. Admin/Staff Tools

- Refactor staff/admin media tools to use only CaptainVideo.
- Remove PendingMedia status mapping and queries.

### 6. Dev/Debug/Test

- Remove or refactor dev/test panels and mocks that use PendingMedia.

### 7. Docs

- Update migration docs to reflect full removal.
- Document new upload flow and CaptainVideo pipeline.

## Next Steps

- For each file above, list the exact lines/functions to remove or refactor.
- Plan DB migration and code removal in phases to avoid breaking uploads.
- Add tests to confirm only CaptainVideo is used everywhere.

---

**Contact:**

For questions or migration blockers, reach out to the FishOn engineering team.
