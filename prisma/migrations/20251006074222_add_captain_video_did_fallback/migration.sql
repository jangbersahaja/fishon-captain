-- AlterTable
ALTER TABLE "public"."CaptainVideo" ADD COLUMN     "didFallback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fallbackReason" TEXT;
