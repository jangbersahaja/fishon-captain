-- AlterTable
ALTER TABLE "public"."CharterMedia" ADD COLUMN     "captainId" TEXT;

-- Backfill captainId from charter.captainId for existing records
UPDATE "public"."CharterMedia" cm
SET "captainId" = c."captainId"
FROM "public"."Charter" c
WHERE cm."charterId" = c.id
  AND cm."captainId" IS NULL;

-- CreateIndex
CREATE INDEX "CharterMedia_captainId_createdAt_idx" ON "public"."CharterMedia"("captainId", "createdAt");

-- CreateIndex
CREATE INDEX "CharterMedia_charterId_sortOrder_idx" ON "public"."CharterMedia"("charterId", "sortOrder");

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."CaptainProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
