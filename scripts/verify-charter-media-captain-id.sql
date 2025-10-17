-- Verification query for CharterMedia captainId backfill
-- Run with: psql $DATABASE_URL -f scripts/verify-charter-media-captain-id.sql

\echo '🔍 Verifying CharterMedia captainId backfill...'
\echo ''

\echo '📊 Total CharterMedia records:'
SELECT COUNT(*) AS total FROM "public"."CharterMedia";
\echo ''

\echo '✅ Records with captainId:'
SELECT COUNT(*) AS with_captain_id FROM "public"."CharterMedia" WHERE "captainId" IS NOT NULL;
\echo ''

\echo '❌ Records without captainId:'
SELECT COUNT(*) AS without_captain_id FROM "public"."CharterMedia" WHERE "captainId" IS NULL;
\echo ''

\echo '📷 Breakdown by media kind:'
SELECT 
  kind,
  COUNT(*) as count,
  COUNT(CASE WHEN "captainId" IS NOT NULL THEN 1 END) as with_captain_id
FROM "public"."CharterMedia"
GROUP BY kind;
\echo ''

\echo '🔍 Checking for mismatches between CharterMedia.captainId and Charter.captainId:'
SELECT COUNT(*) as mismatch_count
FROM "public"."CharterMedia" cm
JOIN "public"."Charter" c ON cm."charterId" = c.id
WHERE cm."captainId" IS NOT NULL
  AND cm."captainId" != c."captainId";
\echo ''

\echo '✅ Verification complete!'
