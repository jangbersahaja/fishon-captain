# Copilot Instructions · FishOn Captain Register

## Platform Snapshot

- Next.js 15 (App Router) + Prisma + NextAuth power an internal dashboard for captains/admins; data eventually feeds Fishon.my’s public marketplace.
- Domain logic lives in feature modules (e.g. `src/features/charter-onboarding`) that bundle `schema.ts`, `server/`, `components/`, `hooks/`, `__tests__/`, and README guidance. Import via barrels like `@features/charter-onboarding`.

## Core Workflows

- Charter onboarding form supports **new registration** and **edit mode**; draft saves hit `/api/charter-drafts` and finalization calls `/api/charter-drafts/:id/finalize`. Always check `isEditing`/initial state before changing flow logic.
- Media lifecycle: uploads land in `PendingMedia`, finalize moves them to `CharterMedia`. Videos use `CaptainVideo` with a metadata-rich record (trim start, processed duration, blob keys, deletion flags).
- Local dev commands:
  ```bash
  npm run dev --turbopack   # preferred dev server
  npm run check:env         # ensure required env vars exist
  npm run typecheck         # strict TS gate
  npm test                  # Vitest (jsdom)
  ```
- Database: `npx prisma migrate dev`, `npx prisma generate`, `npx prisma studio`.

## Video Pipeline (critical path)

- Client trim modal (`src/components/captain/VideoTrimModal.tsx`) enforces ≤30 s clips, surfaces bitrate-based size estimates, and feeds trim metadata into the queue.
- Queue orchestration lives in `src/lib/uploads/videoQueue.ts`; it handles IndexedDB persistence, retry policy, and finishing via `/api/blob/finish`.
- Finish route (`src/app/api/blob/finish/route.ts`) decides bypass vs normalization. It may probe dimensions with ffprobe, sets `processedDurationSec`, and enqueues `/api/videos/queue` when `EXTERNAL_WORKER_URL` is present.
- `/api/videos/normalize-callback` ingests worker responses (see `docs/API_VIDEO_ROUTES.md`). External trimming worker template lives in `src/app/dev/_external-worker/` with required env (`VIDEO_WORKER_SECRET`, `VERCEL_BLOB_READ_WRITE_TOKEN`).
- UI consumers include `EnhancedVideoUploader`, `VideoManager` (status pills + thumbnails), and the review-step preview (`VideoPreviewCarousel`) which expects fixed-height, horizontally scrollable galleries.

## API & Security Patterns

- Wrap App Router handlers with: `getServerSession(authOptions)` → role checks → `rateLimit` guard → business logic inside `withTiming` → `applySecurityHeaders(NextResponse.json(...))`.
- Roles: `/captain/*` requires CAPTAIN+, `/staff/*` requires STAFF+. Admins can impersonate via `?adminUserId=...` query.
- Logging uses structured entries (`logger.info("event", { meta })`). Audit events go through `writeAuditLog()`.

## Testing & Tooling

- Tests sit next to features in `__tests__/` folders; most use Vitest + jsdom with custom mocks for Prisma, IndexedDB, and upload APIs.
- CI shortcut: `npm run test:ci`. Keep new tests aligned with existing mocking utilities instead of re-implementing fetch/Prisma stubs.

## Implementation Conventions

- Respect path aliases `@/` and `@features/`. Avoid deep relative imports inside feature modules.
- Whenever adjusting form validation, update both the Zod schema and downstream sanitizers/DTOs in the same feature folder.
- Video UX assumes toast auto-dismiss behavior (`ToastContext`) and queue status simplifications—rework both client and API layers when changing states.
- Environment essentials: `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth pair, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; fail early with `npm run check:env`.

Need clarification or spot gaps? Ask which sections feel incomplete so we can refine this guide.
