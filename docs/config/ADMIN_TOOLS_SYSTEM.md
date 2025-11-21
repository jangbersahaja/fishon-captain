---
type: feature
status: in-production
feature: admin-tools
updated: 2025-10-17
tags:
  [admin, dashboard, video-moderation, storage-inventory, api-cleanup, staff]
---

# Admin Tools

## Overview

Comprehensive admin dashboard features for staff and admin users, including:

- Video details and moderation
- Storage inventory with video pipeline support
- API cleanup and endpoint management
- Security and audit logging

Accessible via `/staff/*` and `/admin/*` routes (role-gated).

---

## 1. Video Details & Moderation

### Purpose

Display original vs normalized video metadata, enable moderation actions, and support efficient data collection for analytics and troubleshooting.

### Key Features

- Side-by-side comparison of original and normalized (720p) video specs
- Metadata: file size, resolution, content type, processing status
- Parallel metadata fetching using Vercel Blob `head()` (no download required)
- Error handling with `Promise.allSettled`
- Efficient mapping by video ID for lookup
- Moderation actions: delete, retry, mark as failed

### Implementation

**Files:**

- `src/app/(admin)/staff/media/shared.ts` (VideoRow type)
- `src/app/(admin)/staff/media/data.ts` (getBlobMetadata, parallel fetch)

**Type Example:**

```typescript
export type VideoRow = {
  // ...existing fields...
  originalSize: number | null;
  originalResolution: string | null;
  normalizedSize: number | null;
  normalizedResolution: string | null;
};
```

**Metadata Fetch:**

```typescript
async function getBlobMetadata(
  url: string | null
): Promise<{ size: number | null; contentType: string | null }> {
  if (!url) return { size: null, contentType: null };
  try {
    const blob = await head(url);
    return { size: blob.size, contentType: blob.contentType || null };
  } catch (error) {
    console.error(
      `[getBlobMetadata] Failed to fetch metadata for ${url}:`,
      error
    );
    return { size: null, contentType: null };
  }
}
```

---

## 2. Storage Inventory

### Purpose

Track all video assets and their relationships in the new video pipeline. Visualize asset types, relationships, and processing status for admin review.

### Key Features

- Supports new `CaptainVideo` model (no legacy `PendingMedia`)
- Classifies storage scopes: `captain-videos/`, `captains/{userId}/videos/`
- Maps video relationships: original, thumbnail, normalized (720p)
- Asset badges: blue (original), purple (thumbnail), green (720p)
- Relationship panel: shows video ID, processing status, asset type
- Reference list: links to detail view for each asset

### Implementation

**Files:**

- `src/app/(admin)/staff/media/shared.ts` (StorageRow type)
- `src/app/(admin)/staff/media/data.ts` (videoKeyMap, asset mapping)
- `src/app/(admin)/staff/media/StorageManager.tsx` (UI badges, relationship panel)

**Type Example:**

```typescript
linkedVideoId?: string;           // CaptainVideo.id
videoStatus?: string;             // processStatus (queued/processing/ready/failed)
originalVideoKey?: string | null; // Original video blob key
thumbnailKey?: string | null;     // Thumbnail blob key
normalizedKey?: string | null;    // Normalized 720p blob key
isOriginalVideo?: boolean;        // This blob is the original video
isThumbnail?: boolean;            // This blob is the thumbnail
isNormalizedVideo?: boolean;      // This blob is the normalized 720p
```

---

## 3. API Cleanup & Endpoint Management

### Purpose

Maintain a clean, secure, and efficient API surface for admin and staff operations. Remove legacy endpoints, consolidate worker routes, and ensure proper role checks and audit logging.

### Key Features

- Phase-based API cleanup plan (see `api-cleanup-action-plan.md`)
- Removal of legacy media endpoints (no more `PendingMedia`)
- Consolidation of video worker endpoints
- Admin route audit: `/api/admin/verification`, `/api/admin/charters`, `/api/admin/media/delete`, etc.
- Role checks for all admin endpoints
- Audit logging for sensitive actions

### Implementation

**Files:**

- `src/app/api/admin/*` (admin endpoints)
- `src/app/api/videos/*` (video worker endpoints)
- `src/app/api/blob/*` (blob management)
- `src/app/api/README.md` (API inventory)
- `docs/features/api-cleanup-action-plan.md` (cleanup plan)

**Admin Endpoints Example:**

```text
/api/admin/verification
/api/admin/charters
/api/admin/cleanup-edit-drafts
/api/admin/media/delete
```

**Security:**

- All admin endpoints require `ADMIN` role (checked via NextAuth session)
- Audit logs written for all mutations (see `src/server/audit.ts`)

---

## 4. Security & Audit Logging

### Purpose

Protect admin operations with strict role checks, rate limiting, and comprehensive audit trails.

### Key Features

- Role-based access: only STAFF/ADMIN can access `/staff/*` and `/admin/*`
- Rate limiting on sensitive endpoints (see `src/lib/rateLimiter.ts`)
- Audit logging for all admin actions (see `src/server/audit.ts`)
- Structured logs for moderation, deletions, API changes

---

## 5. UI & User Experience

### Admin Dashboard

- `/staff/media` - Video moderation, details, asset relationships
- `/staff/storage` - Storage inventory, asset badges, relationship panel
- `/admin/*` - API management, verification, charters, cleanup

### Features

- Responsive tables and panels
- Asset badges for quick identification
- Relationship visualization for video pipeline
- Error handling and status indicators
- Links to detail views for deep dives

---

## Testing & Validation

### Manual Testing Checklist

- [ ] Video details display correct metadata
- [ ] Storage inventory shows all asset types and relationships
- [ ] Admin endpoints enforce role checks
- [ ] Audit logs written for all admin actions
- [ ] Legacy endpoints removed (no `PendingMedia` references)
- [ ] UI badges and panels render correctly

### Automated Tests

- `src/app/(admin)/staff/media/__tests__/*` - Video details, storage inventory
- `src/app/api/admin/__tests__/*` - Endpoint role checks, audit logging

---

## Troubleshooting

### Common Issues

- **Missing video metadata:** Check blob URLs and Vercel Blob permissions
- **Incorrect asset classification:** Review `classifyScope()` logic
- **Role check failures:** Validate NextAuth session and role claims
- **Audit logs not written:** Ensure `writeAuditLog()` is called in all mutations
- **Legacy endpoint errors:** Remove all references to `PendingMedia` and old routes

---

## Future Enhancements

- Bulk moderation actions (multi-select)
- Advanced filtering and search in storage inventory
- Real-time asset status updates (WebSocket)
- Enhanced audit log UI (filter by action, user, date)
- API endpoint analytics (usage, error rates)
- Integration with external storage providers

---

## Related Documentation

- [API Cleanup Action Plan](/docs/features/api-cleanup-action-plan.md)
- [Video Upload System](/docs/features/VIDEO-UPLOAD-SYSTEM.md)
- [Authentication System](/docs/features/AUTHENTICATION-SYSTEM.md)
- [Captain Verification Documents](/docs/CAPTAIN_VERIFICATION_DOCUMENTS.md)
- [Prisma Schema Reference](/prisma/schema.prisma)

---

## Changelog

**2025-10-17:** Consolidated admin video details, storage inventory, and API cleanup docs
**2025-10-16:** Video details feature implemented
**2025-10-15:** Storage inventory updated for new video pipeline
**2025-10-12:** API cleanup plan finalized
