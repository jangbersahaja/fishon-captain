# Copilot Instructions · FishOn Captain Register# Copilot Instructions · FishOn Captain Register

## Platform Snapshot## Platform Snapshot

- Next.js 15 (App Router) + Prisma + NextAuth power an internal dashboard for captains/admins; data eventually feeds Fishon.my's public marketplace.- Next.js 15 (App Router) + Prisma + NextAuth power an internal dashboard for captains/admins; data eventually feeds Fishon.my’s public marketplace.

- Domain logic lives in feature modules (e.g. `src/features/charter-onboarding`) that bundle `schema.ts`, `server/`, `components/`, `hooks/`, `__tests__/`, and README guidance. Import via barrels like `@features/charter-onboarding`.- Domain logic lives in feature modules (e.g. `src/features/charter-onboarding`) that bundle `schema.ts`, `server/`, `components/`, `hooks/`, `__tests__/`, and README guidance. Import via barrels like `@features/charter-onboarding`.

- Middleware (`src/middleware.ts`) gates `/captain/*` and `/staff/*` routes; staff pages require STAFF or ADMIN roles.

## Core Workflows

- Charter onboarding form supports **new registration** and **edit mode**; draft saves hit `/api/charter-drafts` and finalization calls `/api/charter-drafts/:id/finalize`. Always check `isEditing`/initial state before changing flow logic.

- **Charter onboarding form** supports **new registration** and **edit mode**; draft saves hit `/api/charter-drafts` and finalization calls `/api/charter-drafts/:id/finalize`. Always check `isEditing`/initial state before changing flow logic.- Media lifecycle: uploads land in `PendingMedia`, finalize moves them to `CharterMedia`. Videos use `CaptainVideo` with a metadata-rich record (trim start, processed duration, blob keys, deletion flags).

- **Draft lifecycle**: PATCH `/api/charter-drafts/:id` with `clientVersion` for optimistic locking (409 on conflict), POST finalize with media payload → creates Charter + CaptainProfile, marks draft SUBMITTED.- Local dev commands:

- **Media lifecycle**: ~~uploads land in `PendingMedia`~~ (removed), direct Vercel Blob uploads → finalize associates keys with CharterMedia records. Videos use `CaptainVideo` with metadata (trim start, processed duration, blob keys, deletion flags). ```bash

- **Local dev commands**: npm run dev --turbopack # preferred dev server

  ````bash npm run check:env         # ensure required env vars exist

  npm run dev --turbopack   # preferred dev server (--turbo is deprecated)  npm run typecheck         # strict TS gate

  npm run check:env         # ensure required env vars exist  npm test                  # Vitest (jsdom)

  npm run typecheck         # strict TS gate, runs in prebuild  ```

  npm test                  # Vitest (jsdom)- Database: `npx prisma migrate dev`, `npx prisma generate`, `npx prisma studio`.

  npm run test:ci           # single-run mode with dot reporter

  ```## Video Pipeline (critical path)

  ````

- **Database**: `npx prisma migrate dev`, `npx prisma generate`, `npx prisma studio`. Schema drift healing: `npm run migrate:drift-heal`.

- Client trim modal (`src/components/captain/VideoTrimModal.tsx`) enforces ≤30 s clips, surfaces bitrate-based size estimates, and feeds trim metadata into the queue.

## Video Pipeline (critical path)- Queue orchestration lives in `src/lib/uploads/videoQueue.ts`; it handles IndexedDB persistence, retry policy, and finishing via `/api/blob/finish`.

- Finish route (`src/app/api/blob/finish/route.ts`) decides bypass vs normalization. It may probe dimensions with ffprobe, sets `processedDurationSec`, and enqueues `/api/videos/queue` when `EXTERNAL_WORKER_URL` is present.

- **Client trim modal** (`src/components/captain/VideoTrimModal.tsx`) enforces ≤30 s clips, surfaces bitrate-based size estimates, and feeds trim metadata into the queue.- `/api/videos/normalize-callback` ingests worker responses (see `docs/API_VIDEO_ROUTES.md`). External trimming worker template lives in `src/app/dev/_external-worker/` with required env (`VIDEO_WORKER_SECRET`, `VERCEL_BLOB_READ_WRITE_TOKEN`).

- **Queue orchestration** lives in `src/lib/uploads/videoQueue.ts`; it handles **IndexedDB persistence** (survives page refresh), retry policy, and finishing via `/api/blob/finish`.- UI consumers include `EnhancedVideoUploader`, `VideoManager` (status pills + thumbnails), and the review-step preview (`VideoPreviewCarousel`) which expects fixed-height, horizontally scrollable galleries.

- **Finish route** (`src/app/api/blob/finish/route.ts`) decides bypass vs normalization. It may probe dimensions with ffprobe, sets `processedDurationSec`, and enqueues `/api/videos/queue` when `EXTERNAL_WORKER_URL` is present.

- **Normalization callback** (`/api/videos/normalize-callback`) ingests worker responses (see `docs/API_VIDEO_ROUTES.md`). External trimming worker template lives in `src/app/dev/_external-worker/` with required env (`VIDEO_WORKER_SECRET`, `VERCEL_BLOB_READ_WRITE_TOKEN`).## API & Security Patterns

- **UI consumers**: `EnhancedVideoUploader`, `VideoManager` (status pills + thumbnails), and the review-step preview (`VideoPreviewCarousel`) which expects fixed-height, horizontally scrollable galleries.

- **Video statuses**: `queued` → `processing` → `ready` | `failed` (retryable) | `cancelled` (during deletion). Worker gracefully handles `cancelled` videos.- Wrap App Router handlers with: `getServerSession(authOptions)` → role checks → `rateLimit` guard → business logic inside `withTiming` → `applySecurityHeaders(NextResponse.json(...))`.

- Roles: `/captain/*` requires CAPTAIN+, `/staff/*` requires STAFF+. Admins can impersonate via `?adminUserId=...` query.

## API & Security Patterns- Logging uses structured entries (`logger.info("event", { meta })`). Audit events go through `writeAuditLog()`.

- **Standard handler structure**: `getServerSession(authOptions)` → role checks → `rateLimit` guard → business logic inside `withTiming` → `applySecurityHeaders(NextResponse.json(...))`.## Testing & Tooling

- **Rate limiter** (`src/lib/rateLimiter.ts`): in-memory store by default, pluggable interface (`RateLimiterStore`) for Redis/Upstash. Common limits: finalize 5/min, draft create 3/min.

- **Roles**: `/captain/*` requires CAPTAIN+, `/staff/*` requires STAFF+. Admins can impersonate via `?adminUserId=...` query (check implementations in API routes).- Tests sit next to features in `__tests__/` folders; most use Vitest + jsdom with custom mocks for Prisma, IndexedDB, and upload APIs.

- **Logging**: structured JSON in prod, colorized in dev via `src/lib/logger.ts` (`logger.info("event", { meta })`). Audit events go through `writeAuditLog()` from `@/server/audit`.- CI shortcut: `npm run test:ci`. Keep new tests aligned with existing mocking utilities instead of re-implementing fetch/Prisma stubs.

- **Security headers** (`src/lib/headers.ts`): CSP with Google Maps allowlist, currently uses `'unsafe-inline'` for scripts (Next.js bootstrap) until nonce pipeline implemented.

## Implementation Conventions

## Feature Module Architecture

- Respect path aliases `@/` and `@features/`. Avoid deep relative imports inside feature modules.

- **Charter onboarding** (`src/features/charter-onboarding/`):- Whenever adjusting form validation, update both the Zod schema and downstream sanitizers/DTOs in the same feature folder.

  - `charterForm.schema.ts` → Zod validation with step-specific subsets- Video UX assumes toast auto-dismiss behavior (`ToastContext`) and queue status simplifications—rework both client and API layers when changing states.

  - `charterForm.defaults.ts` → type-safe default values- Environment essentials: `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth pair, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; fail early with `npm run check:env`.

  - `charterForm.draft.ts` → draft sanitization/hydration

  - `server/validation.ts` → `validateDraftForFinalizeFeature()`Need clarification or spot gaps? Ask which sections feel incomplete so we can refine this guide.

  - `server/mapping.ts` → charter ↔ draft transformations
  - `analytics.ts` → event bus for instrumentation (step views, finalize timing, media batches)
  - Components use barrel imports: `import { ... } from "@features/charter-onboarding"`

- **Analytics events** (subset): `step_view` (deduped), `step_complete`, `draft_saved`, `finalize_attempt/success`, `media_upload_start/complete/batch_complete`, `lazy_component_loaded`, `preview_ready`. Enable console logging: `NEXT_PUBLIC_CHARTER_FORM_DEBUG=1`.

## Testing & Tooling

- Tests sit next to features in `__tests__/` folders; **Vitest + jsdom** with custom mocks for Prisma (`vi.mock("@prisma/client")`), IndexedDB, and upload APIs.
- **Test config** (`vitest.config.ts`): aliases `@/` and `@features/`, setup via `vitest.setup.ts`.
- CI shortcut: `npm run test:ci`. Keep new tests aligned with existing mocking utilities (`__mocks__/`) instead of re-implementing fetch/Prisma stubs.
- **Mock patterns**: `getServerSession` returns `{ user: { id: "user-1" } }` in tests, Prisma uses inline `vi.fn()` chains.

## Implementation Conventions

- **Path aliases**: `@/` (src root) and `@features/` (feature modules). Avoid deep relative imports inside feature modules.
- **Form validation**: update both Zod schema and downstream sanitizers/DTOs in the same feature folder. Server-side validation in feature `server/` dir.
- **Video UX**: toast auto-dismiss behavior (`ToastContext`) and queue status simplifications—rework both client and API layers when changing states.
- **Environment essentials**: `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth pair (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Server-side Places key: `GOOGLE_PLACES_API_KEY`. Fail early with `npm run check:env`.
- **Timing instrumentation**: wrap async operations with `withTiming(name, fn)` (logs `request_timing` with ms).
- **Audit log**: use `writeAuditLog({ action, actorId, resourceType, resourceId, metadata })` or `auditWithDiff({ prev, next, ... })` for major mutations.

## Data Model Highlights (Prisma)

- **User** (CAPTAIN | STAFF | ADMIN roles) → **CaptainProfile** (1:1) → **Charter** (1:many)
- **CharterDraft** (status: ACTIVE | SUBMITTED) with `version` for optimistic locking, `dataJson` stores sanitized form snapshot.
- **Charter** → **CharterMedia** (images/videos), **Boat** (1:1), **Pickup** (1:1), **Trip** (1:many), **Policies** (1:1).
- **CaptainVideo**: `processStatus` (queued/processing/ready/failed/cancelled), `originalBlobKey`, `ready720pBlobKey`, `thumbnailBlobKey`, `didFallback`, `processedDurationSec`, `originalDeletedAt`.
- **AuditLog**: tracks mutations with `before`/`after` diffs, `action`, `actorId`, `resourceType`, `resourceId`.

## Common Pitfalls & Fixes

- **Infinite render loops**: check `useEffect` deps, especially in forms with autosave. See `docs/FIX_INFINITE_RENDER_LOOP.md`.
- **PendingMedia removed**: legacy model, don't import. Direct blob uploads only. See `docs/PENDINGMEDIA_CLEANUP_README.md`.
- **Video worker external**: normalization worker runs externally (QStash in prod, direct HTTP in dev). Worker template in `src/app/dev/_external-worker/`. Don't confuse with internal `/api/videos/worker-normalize`.
- **CSP violations with Maps**: ensure script-src includes `https://maps.googleapis.com` and `https://maps.gstatic.com`. Current setup in `src/lib/headers.ts`.
- **Draft version conflicts**: client must send `x-draft-version` header on finalize; server returns 409 if mismatch. Client strategy: discard local, fetch server snapshot.

## Key Files for Onboarding

- `src/middleware.ts` — auth gates
- `src/lib/auth.ts` — NextAuth config with Google OAuth, custom JWT callbacks
- `src/features/charter-onboarding/README.md` — feature module overview
- `docs/API_VIDEO_ROUTES.md` — video API reference
- `src/app/api/README.md` — API cleanup plan, route inventory
- `prisma/schema.prisma` — data model source of truth

## External Integrations

- **Vercel Blob** (`@vercel/blob`): media storage, public URLs with signed tokens. Three-part upload: `create` → multipart chunks → `finish`.
- **Google Maps**: Places Autocomplete (`/api/places/autocomplete`), Details API (`/api/places/details`), Maps JS SDK (client). Separate API keys for server vs browser.
- **QStash** (`@upstash/qstash`): async video normalization queue in production (dev uses direct HTTP).
- **NextAuth**: Google OAuth provider, Prisma adapter, JWT strategy with role claims in token.

Need clarification or spot gaps? Ask which sections feel incomplete so we can refine this guide.
