-- CreateTable
CREATE TABLE "public"."CaptainVideo" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "trimStartSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ready720pUrl" TEXT,
    "processStatus" TEXT NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptainVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaptainVideo_ownerId_processStatus_idx" ON "public"."CaptainVideo"("ownerId", "processStatus");

-- CreateIndex
CREATE INDEX "CaptainVideo_createdAt_idx" ON "public"."CaptainVideo"("createdAt");
