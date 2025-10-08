/*
  Warnings:

  - A unique constraint covering the columns `[pendingMediaId]` on the table `CharterMedia` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."PendingMediaStatus" AS ENUM ('QUEUED', 'TRANSCODING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "public"."CharterMedia" ADD COLUMN     "pendingMediaId" TEXT;

-- CreateTable
CREATE TABLE "public"."PendingMedia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "charterId" TEXT,
    "kind" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "finalKey" TEXT,
    "finalUrl" TEXT,
    "thumbnailKey" TEXT,
    "thumbnailUrl" TEXT,
    "status" "public"."PendingMediaStatus" NOT NULL,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "error" TEXT,
    "correlationId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "charterMediaId" TEXT,

    CONSTRAINT "PendingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingMedia_charterMediaId_key" ON "public"."PendingMedia"("charterMediaId");

-- CreateIndex
CREATE INDEX "PendingMedia_userId_status_idx" ON "public"."PendingMedia"("userId", "status");

-- CreateIndex
CREATE INDEX "PendingMedia_charterId_idx" ON "public"."PendingMedia"("charterId");

-- CreateIndex
CREATE INDEX "PendingMedia_createdAt_idx" ON "public"."PendingMedia"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CharterMedia_pendingMediaId_key" ON "public"."CharterMedia"("pendingMediaId");

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_pendingMediaId_fkey" FOREIGN KEY ("pendingMediaId") REFERENCES "public"."PendingMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
