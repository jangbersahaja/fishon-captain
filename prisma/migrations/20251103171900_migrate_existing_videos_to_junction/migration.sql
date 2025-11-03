-- Migrate existing CaptainVideo relationships to CharterVideo junction table
-- This script creates junction records for all videos that have charterId set

-- STEP 1: Show what we're migrating
DO $$
BEGIN
  RAISE NOTICE 'Videos to migrate:';
  RAISE NOTICE 'Total CaptainVideo with charterId: %', (SELECT COUNT(*) FROM "CaptainVideo" WHERE "charterId" IS NOT NULL);
  RAISE NOTICE 'Ready videos: %', (SELECT COUNT(*) FROM "CaptainVideo" WHERE "charterId" IS NOT NULL AND "processStatus" = 'ready');
  RAISE NOTICE 'Non-deleted: %', (SELECT COUNT(*) FROM "CaptainVideo" WHERE "charterId" IS NOT NULL AND "originalDeletedAt" IS NULL);
END $$;

-- STEP 2: Insert junction records for existing video-charter relationships
INSERT INTO "CharterVideo" ("charterId", "videoId", "order", "createdAt", "updatedAt")
SELECT 
  cv."charterId",
  cv.id,
  ROW_NUMBER() OVER (PARTITION BY cv."charterId" ORDER BY cv."createdAt") - 1 as "order",
  NOW(),
  NOW()
FROM "CaptainVideo" cv
WHERE cv."charterId" IS NOT NULL
  AND cv."originalDeletedAt" IS NULL
  -- REMOVED processStatus check - migrate all videos regardless of status
  AND NOT EXISTS (
    -- Skip if junction record already exists
    SELECT 1 FROM "CharterVideo" cvj 
    WHERE cvj."charterId" = cv."charterId" 
    AND cvj."videoId" = cv.id
  );

-- STEP 3: Report migration results
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Total CharterVideo records: %', (SELECT COUNT(*) FROM "CharterVideo");
END $$;
