-- CreateEnum
CREATE TYPE "public"."MfaMethod" AS ENUM ('TOTP', 'WHATSAPP', 'SMS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "mfaBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaMethod" "public"."MfaMethod",
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "mfaVerifiedAt" TIMESTAMP(3);
