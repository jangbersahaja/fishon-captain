# API Folder Cleanup Plan

This document inventories all routes under `src/app/api`, groups them by domain, marks legacy endpoints for removal, and records stability guarantees for external worker integrations. Use it as the source of truth during the cleanup.

## Conventions to preserve

- Auth and roles: `getServerSession(authOptions)` → role checks.
- Guards: `rateLimit` and `withTiming` around core logic.
- Responses: wrap with `applySecurityHeaders(NextResponse.json(...))` and include `requestId` where helpful.
- Logging: `logger.info|warn|error` with structured meta; `writeAuditLog` for major mutations.
- Types: Zod validation for inputs; Prisma for data access.

## Route categories

Media (blob + photos)

- KEEP: `/api/blob/create`, `/api/blob/upload`, `/api/blob/finish`, `/api/blob/delete`
- KEEP: `/api/media/photo`
- DEPRECATE: `/api/media/upload` (legacy), `/api/media/pending` (legacy), `/api/media/video` (already returns 410)

Videos (CaptainVideo pipeline)

- KEEP: `/api/videos/queue` (enqueue normalization)
- KEEP: `/api/videos/normalize-callback` (external worker callback)
- KEEP: `/api/videos/[id]`, `/api/videos/list`, `/api/videos/list-self`, `/api/videos/analytics`
- REVIEW: `/api/videos/normalize` and `/api/videos/worker-normalize` (ensure consistent with current worker flow)

Charters & Drafts

- KEEP: `/api/charter-drafts/[id]` (GET/PATCH/DELETE), `/api/charter-drafts/[id]/finalize`
- KEEP: `/api/charters/[id]`, `/api/charters/from-charter`
- KEEP: `/api/charters/[id]/media` (PUT ordering & deletions), `/api/charters/[id]/media/remove`

Captain Profile & Verification

- KEEP: `/api/captain/avatar`, `/api/captain/verification`

Authentication & Account

- KEEP: `/api/account/status`
- KEEP: `/api/auth/*` (if present via NextAuth app routes)

Workers & Jobs (internal/testing)

- REVIEW: `/api/jobs/transcode`, `/api/workers/transcode`, `/api/workers/transcode-simple`
- DEV ONLY: `/api/test-worker/*`

Diagnostics

- KEEP: `/api/health` (simple liveness)
- KEEP: `/api/metrics` (if wired to metrics)
- DEV ONLY: `/api/dev/*`, `/api/debug/*`
- DEPRECATE: `/api/debug/charter-media` if no longer used

Video thumbnails

- KEEP: `/api/video-thumbnail`

## External worker stability guarantees

Do not change these without a coordinated worker update and a compatibility grace period:

- POST `/api/videos/queue` — Orchestrates normalization, called from finish step when `EXTERNAL_WORKER_URL` is configured.
- POST `/api/videos/normalize-callback` — Worker posts results here. API expects shared secret validation and updates `CaptainVideo` records.
- POST `/api/blob/finish` — Client-side finish calls may enqueue normalization (bypass or queue based on media properties).

If renaming/reorganizing, create permanent redirects or proxy handlers to maintain these paths during the transition window.

## Deprecations and removals

Remove after confirming no usages in code/tests and announcing in the changelog:

- `/api/media/upload` — legacy
- `/api/media/pending` — legacy
- `/api/media/video` — currently returns 410 (safe to delete once clients are migrated)
- `/api/debug/charter-media` — remove if unused

## Phase plan

Phase 1 — Inventory & soft deprecate ✅ COMPLETE

- [x] Inventory routes by domain and flag deprecations
- [x] Document external worker contracts
- [ ] Add route-level JSDoc on remaining handlers noting inputs/outputs and auth

Phase 2A — Safe deletions ✅ COMPLETE (Oct 12, 2025)

- [x] Delete VideoUploadSection component (unused, referenced deprecated endpoints)
- [x] Delete `/api/videos/normalize` stub endpoint (redundant)
- [x] Clean up dev debug panel (removed deprecated endpoint references)
- [x] Remove PendingMedia test file (model removed in previous migration)
- [x] Update dev/debug route documentation

See: `docs/PHASE_2A_CLEANUP_COMPLETE.md` for detailed report

Phase 2B — Worker consolidation (IN PROGRESS)

- [ ] Review `/api/workers/transcode` and `/api/workers/transcode-simple` usage
- [ ] Review `/api/jobs/transcode` and `/api/transcode/complete` purpose
- [ ] Normalize workers/jobs endpoints naming; ensure they're internal-only or behind auth
- [ ] Consolidate or remove redundant endpoints

Phase 3 — Structure & docs

- [ ] Ensure each category has an `index` with light docs, or extend this README with example requests
- [ ] Ensure all routes follow conventions (auth → rateLimit → logic → secure response)
- [ ] Add tests for external endpoints and critical media paths

## Quick checklist per route

- Ownership/role checks present
- Rate limiting where applicable (mutations)
- Zod schema or equivalent validation
- Applies security headers
- Returns typed JSON with consistent error format
- Logs events with requestId
- No references to removed models (e.g., PendingMedia)

---

Last updated: 2025-10-12
