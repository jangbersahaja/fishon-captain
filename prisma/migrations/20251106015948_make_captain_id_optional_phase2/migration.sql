-- AlterTable
-- Phase 2: Make captainId nullable in CaptainVideo
-- This allows videos to be owned by User (via ownerId) without requiring CaptainProfile
ALTER TABLE "CaptainVideo" ALTER COLUMN "captainId" DROP NOT NULL;
