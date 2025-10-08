-- Add duration + trim metadata fields to CaptainVideo
ALTER TABLE "public"."CaptainVideo"
  ADD COLUMN "originalDurationSec" DOUBLE PRECISION,
  ADD COLUMN "processedDurationSec" DOUBLE PRECISION,
  ADD COLUMN "appliedTrimStartSec" DOUBLE PRECISION,
  ADD COLUMN "processedAt" TIMESTAMP WITH TIME ZONE;