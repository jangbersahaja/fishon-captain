-- CreateTable
CREATE TABLE "CharterVideo" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharterVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharterVideo_charterId_order_idx" ON "CharterVideo"("charterId", "order");

-- CreateIndex
CREATE INDEX "CharterVideo_videoId_idx" ON "CharterVideo"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterVideo_charterId_videoId_key" ON "CharterVideo"("charterId", "videoId");

-- AddForeignKey
ALTER TABLE "CharterVideo" ADD CONSTRAINT "CharterVideo_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "Charter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterVideo" ADD CONSTRAINT "CharterVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "CaptainVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from CaptainVideo.charterId to CharterVideo junction table
-- Only migrate videos that have a charterId set
INSERT INTO "CharterVideo" ("id", "charterId", "videoId", "order", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "charterId",
    "id" as "videoId",
    0 as "order",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CaptainVideo"
WHERE "charterId" IS NOT NULL
ON CONFLICT ("charterId", "videoId") DO NOTHING;

-- Note: We keep the charterId column in CaptainVideo for backward compatibility
-- It will be deprecated but not dropped immediately
