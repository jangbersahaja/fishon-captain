-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "lastOtpSentAt" TIMESTAMP(3),
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpires" TIMESTAMP(3),
ADD COLUMN     "otpPurpose" TEXT;
