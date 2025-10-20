# Media Separation - Quick Reference

**Goal:** CharterMedia = Photos | CaptainVideo = Videos

---

## Key Changes Summary

### What's Changing

| Component          | Before                           | After                                                      |
| ------------------ | -------------------------------- | ---------------------------------------------------------- |
| **Video Storage**  | CharterMedia + CaptainVideo      | CaptainVideo only                                          |
| **Photo Storage**  | CharterMedia                     | CharterMedia (unchanged)                                   |
| **Video Link**     | `charterMediaId` in CaptainVideo | `charterId` in CaptainVideo                                |
| **Finalize Route** | Creates CharterMedia for videos  | Updates CaptainVideo.charterId only                        |
| **GET Charter**    | Filters CharterMedia by kind     | Fetches photos from CharterMedia, videos from CaptainVideo |

---

## Code Patterns

### ❌ OLD: Filter CharterMedia by Kind

```typescript
const charter = await prisma.charter.findUnique({
  include: {
    media: true, // Gets both photos and videos
  },
});

const photos = charter.media.filter((m) => m.kind === "CHARTER_PHOTO");
const videos = charter.media.filter((m) => m.kind === "CHARTER_VIDEO");
```

### ✅ NEW: Fetch Separately

```typescript
const charter = await prisma.charter.findUnique({
  include: {
    media: true, // Only photos now
    videos: {
      // New relation
      where: { processStatus: "ready" },
      select: {
        ready720pUrl: true,
        thumbnailUrl: true,
        processedDurationSec: true,
        blobKey: true,
      },
    },
  },
});

const photos = charter.media; // All are photos
const videos = charter.videos; // Direct from CaptainVideo
```

---

## Critical Files

### Must Change (Phase 1)

```
/api/charter-drafts/[id]/finalize/route.ts    🔴 Line 662-672
/api/charters/[id]/route.ts                   🔴 Line 480+
/api/charters/[id]/get/route.ts               🔴 Line 72, 80
/api/charters/[id]/media/route.ts             🟡 Remove videos
/src/server/charters.ts                       🟡 Line 203
```

### Should Change (Phase 1)

```
/api/charters/[id]/thumbnails/route.ts        🟢 Query fix
/api/charters/[id]/media/video/thumbnail/route.ts  🟢 Query fix
/app/(admin)/staff/media/data.ts              🟢 Line 558
```

---

## Schema Changes

### Phase 2: Add Relation

```prisma
model Charter {
  videos  CaptainVideo[]  // ADD THIS
}

model CaptainVideo {
  charterId  String?
  charter    Charter?  @relation(fields: [charterId], references: [id])

  @@index([charterId])  // ADD THIS for performance
}
```

### Phase 3: Remove Legacy

```diff
model CharterMedia {
-  tripId          String?
-  kind            MediaKind
-  thumbnailUrl    String?
-  durationSeconds Int?
-  trip            Trip?
-  captainVideos   CaptainVideo[]
}

model CaptainVideo {
-  charterMediaId  String?
-  charterMedia    CharterMedia?
}

enum MediaKind {
  CHARTER_PHOTO
-  CHARTER_VIDEO
  CAPTAIN_AVATAR
-  TRIP_MEDIA  // if unused
}
```

---

## Testing Commands

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Run CI tests
npm run test:ci

# Check environment
npm run check:env

# Database commands
npm run prisma:migrate -- --name "migration_name"
npm run prisma:generate
npm run prisma:studio
```

---

## Deployment Order

1. **Phase 1:** Code changes (no migration) → Staging → Prod → Monitor 1 week
2. **Phase 2:** Add schema relation → Staging → Prod → Monitor 1 week
3. **Phase 3:** Remove legacy fields → Staging → Prod → Monitor 1 week

---

## Quick Rollback

### Phase 1 (Code)

```bash
git revert <commit>
git push
# Auto-deploys
```

### Phase 2 (Schema)

```bash
npx prisma migrate resolve --rolled-back <migration>
npx prisma migrate deploy
```

### Phase 3 (Schema Cleanup)

**⚠️ NO AUTO ROLLBACK - Restore from backup required**

---

## Health Checks

### After Phase 1 Deploy

```bash
# Check error rate
curl https://fishon-captain.vercel.app/api/health

# Check logs for errors
vercel logs --follow

# Test registration
# 1. Go to /captain/onboard
# 2. Complete form with 3+ photos and 1+ video
# 3. Finalize
# 4. Check charter page displays media
```

### Database Queries

```sql
-- Check for new CHARTER_VIDEO records (should be 0)
SELECT COUNT(*) FROM "CharterMedia" WHERE kind = 'CHARTER_VIDEO';

-- Check video links to charters
SELECT COUNT(*) FROM "CaptainVideo" WHERE "charterId" IS NOT NULL;

-- Check orphan videos
SELECT COUNT(*) FROM "CaptainVideo" WHERE "charterId" IS NULL;

-- Check orphan photos
SELECT COUNT(*) FROM "CharterMedia" WHERE "charterId" IS NULL;
```

---

## Common Issues & Fixes

### Issue: Videos not showing on charter page

**Cause:** Missing `videos` relation in query  
**Fix:** Add `videos: { include }` to charter query

### Issue: Finalize fails with "kind is required"

**Cause:** Still trying to create CharterMedia for videos  
**Fix:** Update finalize route to skip CharterMedia creation

### Issue: Edit mode shows no videos

**Cause:** Query filters for `kind = CHARTER_VIDEO` in CharterMedia  
**Fix:** Query CaptainVideo table with `charterId`

### Issue: Migration fails

**Cause:** Existing data violates new constraints  
**Fix:** Clean up orphan records before migration

---

## Environment Variables

No new environment variables required. Uses existing:

```bash
DATABASE_URL                  # Prisma connection
BLOB_READ_WRITE_TOKEN         # Vercel Blob
NEXT_PUBLIC_SITE_URL          # For video queue API calls
EXTERNAL_WORKER_URL           # Video processing worker
VIDEO_WORKER_SECRET           # Worker authentication
```

---

## Support Queries

### Find charters by captain

```sql
SELECT c.id, c.name, cp."userId"
FROM "Charter" c
JOIN "CaptainProfile" cp ON c."captainId" = cp.id
WHERE cp."userId" = '<user-id>';
```

### Find all media for charter

```sql
-- Photos
SELECT * FROM "CharterMedia" WHERE "charterId" = '<charter-id>';

-- Videos
SELECT * FROM "CaptainVideo" WHERE "charterId" = '<charter-id>';
```

### Link orphan media to charter

```sql
-- Photos
UPDATE "CharterMedia"
SET "charterId" = '<charter-id>'
WHERE id = '<media-id>' AND "charterId" IS NULL;

-- Videos
UPDATE "CaptainVideo"
SET "charterId" = '<charter-id>'
WHERE id = '<video-id>' AND "charterId" IS NULL;
```

---

## Key Contacts

- **Database Issues:** Check Vercel Dashboard → Storage → Postgres
- **Video Processing:** Check EXTERNAL_WORKER_URL logs
- **Blob Storage:** Check Vercel Dashboard → Storage → Blob

---

## Documentation

- Full Plan: `docs/migrations/MEDIA_SEPARATION_CLEANUP.md`
- Summary: `docs/migrations/MEDIA_SEPARATION_SUMMARY.md`
- Checklist: `docs/migrations/MEDIA_SEPARATION_CHECKLIST.md`
- Legacy Schema: `docs/LEGACY_SCHEMA.md` (after Phase 3)

---

**Last Updated:** October 21, 2025
