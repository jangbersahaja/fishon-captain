-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."CaptainVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "idFront" JSONB,
    "idBack" JSONB,
    "captainLicense" JSONB,
    "boatRegistration" JSONB,
    "fishingLicense" JSONB,
    "additional" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptainVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaptainVerification_userId_key" ON "public"."CaptainVerification"("userId");

-- AddForeignKey
ALTER TABLE "public"."CaptainVerification" ADD CONSTRAINT "CaptainVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
