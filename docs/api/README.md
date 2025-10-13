# API Documentation

## Overview

All API routes follow consistent patterns for authentication, rate limiting, error handling, and security headers.

## Standard Handler Structure

```typescript
export async function POST(req: Request) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Role check (if needed)
  if (!["STAFF", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Rate limiting
  const rateLimitResult = await rateLimit({
    key: `endpoint:${session.user.id}`,
    windowMs: 60_000,
    max: 5,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 4. Business logic (wrap with timing)
  const result = await withTiming("operation_name", async () => {
    // ... actual work
  });

  // 5. Return with security headers
  return applySecurityHeaders(NextResponse.json({ ok: true, data: result }));
}
```

## API Categories

### Media & Blob Storage

**Upload Flow**: `create` → `upload` (multipart) → `finish`

- `POST /api/blob/create` - Initialize upload, get signed URL
- `PUT /api/blob/upload` - Upload file chunk (client → Vercel Blob)
- `POST /api/blob/finish` - Finalize upload, trigger video processing
- `DELETE /api/blob/delete` - Delete blob by key
- `POST /api/media/photo` - Upload photo directly

### Video Processing

See [Video API Routes](./API_VIDEO_ROUTES.md) for detailed documentation.

- `POST /api/videos/queue` - Enqueue video for normalization
- `POST /api/videos/normalize-callback` - External worker callback
- `GET /api/videos/list` - List videos by owner
- `GET /api/videos/[id]` - Get video details
- `DELETE /api/videos/[id]` - Delete video, cancel processing
- `POST /api/videos/worker-normalize` - Internal worker endpoint

**Status Flow**: `queued` → `processing` → `ready` | `failed` | `cancelled`

### Charter Management

**Draft Flow**: Create → Patch (autosave) → Finalize

- `GET /api/charter-drafts` - Get user's active draft
- `POST /api/charter-drafts` - Create new draft
- `GET /api/charter-drafts/[id]` - Get specific draft
- `PATCH /api/charter-drafts/[id]` - Update draft (with version locking)
- `DELETE /api/charter-drafts/[id]` - Delete draft
- `POST /api/charter-drafts/[id]/finalize` - Convert draft to charter

**Charter Routes**:

- `GET /api/charters/[id]` - Get charter details
- `POST /api/charters/from-charter` - Create draft from existing charter
- `PUT /api/charters/[id]/media` - Reorder/update media
- `DELETE /api/charters/[id]/media/remove` - Remove media item

### Captain Profile

- `POST /api/captain/avatar` - Upload captain avatar
- `POST /api/captain/verification` - Submit verification request

### Places (Google Maps)

- `GET /api/places/autocomplete?input=...` - Address suggestions
- `GET /api/places/details?placeId=...` - Get place details (lat/lng)

### Authentication & Account

- `GET /api/account/status` - Current user session info
- `/api/auth/*` - NextAuth routes (sign in/out/callback)

### Health & Diagnostics

- `GET /api/health` - Service liveness check

## Authentication

Uses NextAuth.js with Google OAuth provider.

**Session Structure**:

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: "CAPTAIN" | "STAFF" | "ADMIN";
    image?: string;
  }
}
```

**Getting Session**:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
```

## Authorization

### Route Protection

Middleware in `src/middleware.ts` protects routes:

- `/captain/*` - Requires CAPTAIN role or higher
- `/staff/*` - Requires STAFF or ADMIN role

### Admin Impersonation

Admins can impersonate users via query parameter:

```text
/api/charter-drafts?adminUserId=user_123
```

## Rate Limiting

Pluggable rate limiter in `src/lib/rateLimiter.ts`.

**Default Limits**:

- Draft create: 3/min per user
- Draft finalize: 5/min per user
- Video queue: 10/min per user
- General mutations: 10/min per user
- Reads: 60/min per user

**Redis/Upstash**: Implement `RateLimiterStore` interface for distributed limiting.

## Error Responses

Standard error format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

**Common Status Codes**:

- `400` - Bad request (validation failed)
- `401` - Unauthorized (not signed in)
- `403` - Forbidden (insufficient role)
- `404` - Not found
- `409` - Conflict (version mismatch, duplicate)
- `429` - Too many requests
- `500` - Internal server error

## Security Headers

Applied via `applySecurityHeaders()` in `src/lib/headers.ts`:

- **CSP**: Restricts script sources, allows Google Maps
- **X-Frame-Options**: `SAMEORIGIN`
- **X-Content-Type-Options**: `nosniff`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restrictive defaults

## Logging

Structured logging via `src/lib/logger.ts`:

```typescript
logger.info("event_name", { userId, resource, action });
logger.warn("warning_type", { context });
logger.error("error_type", { error, userId });
```

**Audit Logging**: Use `writeAuditLog()` for mutations:

```typescript
import { writeAuditLog } from "@/server/audit";

await writeAuditLog({
  action: "charter_finalized",
  actorId: session.user.id,
  resourceType: "Charter",
  resourceId: charter.id,
  metadata: { draftId },
});
```

## Testing

API routes should have tests in `__tests__/` subdirectories.

**Test Patterns**:

```typescript
import { vi } from "vitest";

// Mock Prisma
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    charter: { findUnique: vi.fn(), create: vi.fn() },
    // ... other models
  })),
}));

// Mock auth
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(() => ({
    user: { id: "user-1", role: "CAPTAIN" },
  })),
}));
```

## External Dependencies

### Vercel Blob

Three-step upload:

1. `create` - Get upload URL
2. Client uploads directly to blob storage
3. `finish` - Confirm completion

**Blob URLs**: Temporary signed URLs with expiration.

### QStash (Production)

Async job queue for video processing.

- Publishes to `EXTERNAL_WORKER_URL`
- Validates signatures on callbacks
- Handles retries automatically

**Dev Mode**: Direct HTTP calls (no QStash).

### Google Maps APIs

- **Places Autocomplete**: Server-side, restricted by API key
- **Places Details**: Server-side, gets coordinates
- **Maps JavaScript**: Client-side, displays interactive maps

**Keys**: Use separate keys for server vs browser, restrict appropriately.

## Migration Status

See [API Cleanup Plan](./API_CLEANUP_ACTION_PLAN.md) for detailed inventory and deprecation timeline.

**Current Phase**: 2C-2 (Monitoring dual pipeline)

### Active Migrations

- **Video Processing**: Dual pipeline (legacy + new CaptainVideo)
  - Both `/api/jobs/transcode` and `/api/videos/queue` run
  - Will disable legacy in Phase 2C-3 after validation
  - Phase 2D will remove legacy worker endpoints

### Deprecated Endpoints

- `/api/media/upload` - Use `/api/blob/*` flow
- `/api/media/pending` - PendingMedia model removed
- `/api/media/video` - Returns 410

## Future Improvements

- [ ] OpenAPI/Swagger specification
- [ ] Request/response type generation
- [ ] API versioning strategy
- [ ] GraphQL consideration for complex queries
- [ ] Distributed rate limiting (Redis)
- [ ] Enhanced monitoring dashboards

---

**Last Updated**: October 12, 2025  
**See Also**: [API Cleanup Plan](./API_CLEANUP_ACTION_PLAN.md), [Video API Routes](./API_VIDEO_ROUTES.md)
