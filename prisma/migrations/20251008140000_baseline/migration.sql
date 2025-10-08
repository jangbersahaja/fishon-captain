-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."DraftStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ABANDONED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."CharterPricingPlan" AS ENUM ('BASIC', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "public"."CharterStyle" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('CHARTER_PHOTO', 'CHARTER_VIDEO', 'CAPTAIN_AVATAR', 'TRIP_MEDIA');

-- CreateEnum
CREATE TYPE "public"."PendingMediaStatus" AS ENUM ('QUEUED', 'TRANSCODING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CAPTAIN', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'CAPTAIN',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CaptainProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "experienceYrs" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptainProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Charter" (
    "id" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "charterType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "startingPoint" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "description" TEXT NOT NULL,
    "pricingPlan" "public"."CharterPricingPlan" NOT NULL DEFAULT 'BASIC',
    "boatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "backupPhone" TEXT,

    CONSTRAINT "Charter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Boat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lengthFt" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pickup" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "fee" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "Pickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PickupArea" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "PickupArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policies" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "licenseProvided" BOOLEAN NOT NULL,
    "catchAndKeep" BOOLEAN NOT NULL,
    "catchAndRelease" BOOLEAN NOT NULL,
    "childFriendly" BOOLEAN NOT NULL,
    "liveBaitProvided" BOOLEAN NOT NULL,
    "alcoholNotAllowed" BOOLEAN NOT NULL,
    "smokingNotAllowed" BOOLEAN NOT NULL,

    CONSTRAINT "Policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharterAmenity" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CharterAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharterFeature" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CharterFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharterMedia" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "tripId" TEXT,
    "kind" "public"."MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thumbnail_url" TEXT,
    "duration_seconds" INTEGER,
    "pendingMediaId" TEXT,

    CONSTRAINT "CharterMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharterDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "formVersion" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "charterId" TEXT,
    "lastTouchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharterDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Trip" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tripType" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "maxAnglers" INTEGER NOT NULL,
    "style" "public"."CharterStyle" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "promoPrice" DECIMAL(10,2),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TripStartTime" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TripStartTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TripSpecies" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TripSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TripTechnique" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TripTechnique_pkey" PRIMARY KEY ("id")
);

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
    "additional" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptainVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DraftNote" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "changed" JSONB,
    "correlationId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

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
    "blobKey" TEXT,
    "normalizedBlobKey" TEXT,
    "thumbnailBlobKey" TEXT,
    "didFallback" BOOLEAN NOT NULL DEFAULT false,
    "fallbackReason" TEXT,
    "originalDurationSec" DOUBLE PRECISION,
    "processedDurationSec" DOUBLE PRECISION,
    "appliedTrimStartSec" DOUBLE PRECISION,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "CaptainVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CaptainProfile_userId_key" ON "public"."CaptainProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Charter_boatId_key" ON "public"."Charter"("boatId");

-- CreateIndex
CREATE UNIQUE INDEX "Pickup_charterId_key" ON "public"."Pickup"("charterId");

-- CreateIndex
CREATE UNIQUE INDEX "Policies_charterId_key" ON "public"."Policies"("charterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterMedia_pendingMediaId_key" ON "public"."CharterMedia"("pendingMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterDraft_charterId_key" ON "public"."CharterDraft"("charterId");

-- CreateIndex
CREATE INDEX "CharterDraft_lastTouchedAt_idx" ON "public"."CharterDraft"("lastTouchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PendingMedia_charterMediaId_key" ON "public"."PendingMedia"("charterMediaId");

-- CreateIndex
CREATE INDEX "PendingMedia_userId_status_idx" ON "public"."PendingMedia"("userId", "status");

-- CreateIndex
CREATE INDEX "PendingMedia_charterId_idx" ON "public"."PendingMedia"("charterId");

-- CreateIndex
CREATE INDEX "PendingMedia_createdAt_idx" ON "public"."PendingMedia"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaptainVerification_userId_key" ON "public"."CaptainVerification"("userId");

-- CreateIndex
CREATE INDEX "DraftNote_draftId_idx" ON "public"."DraftNote"("draftId");

-- CreateIndex
CREATE INDEX "DraftNote_authorId_idx" ON "public"."DraftNote"("authorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "public"."AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "public"."AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CaptainVideo_ownerId_processStatus_idx" ON "public"."CaptainVideo"("ownerId", "processStatus");

-- CreateIndex
CREATE INDEX "CaptainVideo_createdAt_idx" ON "public"."CaptainVideo"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."CaptainProfile" ADD CONSTRAINT "CaptainProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Charter" ADD CONSTRAINT "Charter_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "public"."Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Charter" ADD CONSTRAINT "Charter_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."CaptainProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pickup" ADD CONSTRAINT "Pickup_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickupArea" ADD CONSTRAINT "PickupArea_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "public"."Pickup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policies" ADD CONSTRAINT "Policies_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterAmenity" ADD CONSTRAINT "CharterAmenity_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterFeature" ADD CONSTRAINT "CharterFeature_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_pendingMediaId_fkey" FOREIGN KEY ("pendingMediaId") REFERENCES "public"."PendingMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterDraft" ADD CONSTRAINT "CharterDraft_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharterDraft" ADD CONSTRAINT "CharterDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trip" ADD CONSTRAINT "Trip_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripStartTime" ADD CONSTRAINT "TripStartTime_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripSpecies" ADD CONSTRAINT "TripSpecies_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripTechnique" ADD CONSTRAINT "TripTechnique_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaptainVerification" ADD CONSTRAINT "CaptainVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftNote" ADD CONSTRAINT "DraftNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftNote" ADD CONSTRAINT "DraftNote_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."CharterDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

