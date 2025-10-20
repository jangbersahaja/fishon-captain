-- Phase 3: Media Separation Cleanup Migration
-- This migration performs the following:
-- 1. Migrate CaptainVideo.ownerId to CaptainVideo.captainId
-- 2. Remove legacy fields from CharterMedia
-- 3. Remove legacy fields from CaptainVideo
-- 4. Update MediaKind enum

-- Step 1: Add captainId column to CaptainVideo
ALTER TABLE "public"."CaptainVideo" ADD COLUMN "captainId" TEXT;

-- Step 2: Populate captainId from ownerId via CaptainProfile lookup
UPDATE "public"."CaptainVideo" cv
SET "captainId" = cp.id
FROM "public"."CaptainProfile" cp
WHERE cv."ownerId" = cp."userId";

-- Step 3: Make captainId non-nullable
ALTER TABLE "public"."CaptainVideo" ALTER COLUMN "captainId" SET NOT NULL;

-- Step 4: Drop old ownerId index
DROP INDEX IF EXISTS "CaptainVideo_ownerId_processStatus_idx";

-- Step 5: Create new captainId index
CREATE INDEX "CaptainVideo_captainId_processStatus_idx" ON "public"."CaptainVideo"("captainId", "processStatus");

-- Step 6: Add foreign key for CaptainVideo.captainId -> CaptainProfile.id
ALTER TABLE "public"."CaptainVideo" ADD CONSTRAINT "CaptainVideo_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."CaptainProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Drop old ownerId column from CaptainVideo
ALTER TABLE "public"."CaptainVideo" DROP COLUMN "ownerId";

-- Step 8: Drop charterMediaId foreign key and column from CaptainVideo
ALTER TABLE "public"."CaptainVideo" DROP CONSTRAINT IF EXISTS "CaptainVideo_charterMediaId_fkey";
ALTER TABLE "public"."CaptainVideo" DROP COLUMN IF EXISTS "charterMediaId";

-- Step 9: Drop legacy columns from CharterMedia
ALTER TABLE "public"."CharterMedia" DROP COLUMN IF EXISTS "tripId";
ALTER TABLE "public"."CharterMedia" DROP COLUMN IF EXISTS "kind";
ALTER TABLE "public"."CharterMedia" DROP COLUMN IF EXISTS "thumbnail_url";
ALTER TABLE "public"."CharterMedia" DROP COLUMN IF EXISTS "duration_seconds";

-- Step 10: Update MediaKind enum (remove CHARTER_VIDEO and TRIP_MEDIA)
-- First, ensure no data uses the values we're removing (should already be cleaned up in Phase 1)
-- Then alter the enum type
ALTER TYPE "MediaKind" RENAME TO "MediaKind_old";
CREATE TYPE "MediaKind" AS ENUM ('CHARTER_PHOTO', 'CAPTAIN_AVATAR');
-- No need to update any columns since CharterMedia.kind is dropped
DROP TYPE "MediaKind_old";
