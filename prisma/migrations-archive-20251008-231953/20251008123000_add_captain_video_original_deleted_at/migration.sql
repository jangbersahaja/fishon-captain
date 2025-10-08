-- Add originalDeletedAt column to CaptainVideo
ALTER TABLE "CaptainVideo" ADD COLUMN IF NOT EXISTS "originalDeletedAt" TIMESTAMP;