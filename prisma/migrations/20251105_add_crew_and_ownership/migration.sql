-- ============================================================================
-- Phase 1: Add New Ownership Fields (Non-Breaking)
-- Migration: Add crew management and ownership architecture
-- Created: 2025-11-05
-- ============================================================================

-- Step 1: Add new enum values to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPERATOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CREW';

-- Step 2: Create CrewRole enum
CREATE TYPE "CrewRole" AS ENUM ('FIRST_MATE', 'DECKHAND', 'COOK', 'ENGINEER', 'GUIDE', 'CLEANER', 'OTHER');

-- Step 3: Add ownerId column to Charter (nullable initially)
ALTER TABLE "Charter" ADD COLUMN "ownerId" TEXT;

-- Step 4: Add ownerId column to CharterMedia (nullable initially)
ALTER TABLE "CharterMedia" ADD COLUMN "ownerId" TEXT;

-- Step 5: Add ownerId column to CaptainVideo (nullable initially)
ALTER TABLE "CaptainVideo" ADD COLUMN "ownerId" TEXT;

-- Step 6: Populate ownerId from existing captainId relationships
UPDATE "Charter" c
SET "ownerId" = (
  SELECT cp."userId" 
  FROM "CaptainProfile" cp 
  WHERE cp.id = c."captainId"
);

UPDATE "CharterMedia" cm
SET "ownerId" = (
  SELECT cp."userId"
  FROM "CaptainProfile" cp
  WHERE cp.id = cm."captainId"
);

UPDATE "CaptainVideo" cv
SET "ownerId" = (
  SELECT cp."userId"
  FROM "CaptainProfile" cp
  WHERE cp.id = cv."captainId"
);

-- Step 7: Add foreign keys for ownerId
ALTER TABLE "Charter" 
  ADD CONSTRAINT "Charter_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CharterMedia" 
  ADD CONSTRAINT "CharterMedia_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaptainVideo" 
  ADD CONSTRAINT "CaptainVideo_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add indexes for ownerId
CREATE INDEX "Charter_ownerId_idx" ON "Charter"("ownerId");
CREATE INDEX "CharterMedia_ownerId_createdAt_idx" ON "CharterMedia"("ownerId", "createdAt");
CREATE INDEX "CaptainVideo_ownerId_processStatus_idx" ON "CaptainVideo"("ownerId", "processStatus");

-- Step 9: Create CrewMember table
CREATE TABLE "crew_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "displayName" TEXT NOT NULL,
    "primaryRole" "CrewRole" NOT NULL,
    "bio" TEXT,
    "experienceYrs" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "licenses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id")
);

-- Step 10: Add foreign key and indexes for CrewMember
ALTER TABLE "crew_members" 
  ADD CONSTRAINT "crew_members_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "crew_members_userId_key" ON "crew_members"("userId");
CREATE INDEX "crew_members_userId_idx" ON "crew_members"("userId");
CREATE INDEX "crew_members_isActive_idx" ON "crew_members"("isActive");

-- Step 11: Create CharterCaptain junction table
CREATE TABLE "charter_captains" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schedule" TEXT,
    "compensation" JSONB,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charter_captains_pkey" PRIMARY KEY ("id")
);

-- Step 12: Add foreign keys and indexes for CharterCaptain
ALTER TABLE "charter_captains"
  ADD CONSTRAINT "charter_captains_charterId_fkey"
  FOREIGN KEY ("charterId") REFERENCES "Charter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "charter_captains"
  ADD CONSTRAINT "charter_captains_captainId_fkey"
  FOREIGN KEY ("captainId") REFERENCES "CaptainProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "charter_captains_charterId_captainId_key" ON "charter_captains"("charterId", "captainId");
CREATE INDEX "charter_captains_charterId_idx" ON "charter_captains"("charterId");
CREATE INDEX "charter_captains_captainId_idx" ON "charter_captains"("captainId");
CREATE INDEX "charter_captains_isActive_idx" ON "charter_captains"("isActive");

-- Step 13: Create CharterCrew junction table
CREATE TABLE "charter_crew" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "role" "CrewRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schedule" TEXT,
    "compensation" JSONB,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charter_crew_pkey" PRIMARY KEY ("id")
);

-- Step 14: Add foreign keys and indexes for CharterCrew
ALTER TABLE "charter_crew"
  ADD CONSTRAINT "charter_crew_charterId_fkey"
  FOREIGN KEY ("charterId") REFERENCES "Charter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "charter_crew"
  ADD CONSTRAINT "charter_crew_crewId_fkey"
  FOREIGN KEY ("crewId") REFERENCES "crew_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "charter_crew_charterId_crewId_key" ON "charter_crew"("charterId", "crewId");
CREATE INDEX "charter_crew_charterId_idx" ON "charter_crew"("charterId");
CREATE INDEX "charter_crew_crewId_idx" ON "charter_crew"("crewId");
CREATE INDEX "charter_crew_isActive_idx" ON "charter_crew"("isActive");

-- ============================================================================
-- Verification queries (run these manually to verify migration success)
-- ============================================================================

-- Verify ownerId populated correctly
-- SELECT COUNT(*) as total_charters, 
--        COUNT("ownerId") as charters_with_owner,
--        COUNT(*) - COUNT("ownerId") as orphaned_charters
-- FROM "Charter";

-- Verify CharterMedia ownerId
-- SELECT COUNT(*) as total_media,
--        COUNT("ownerId") as media_with_owner,
--        COUNT("captainId") as media_with_captain
-- FROM "CharterMedia";

-- Verify CaptainVideo ownerId
-- SELECT COUNT(*) as total_videos,
--        COUNT("ownerId") as videos_with_owner,
--        COUNT("captainId") as videos_with_captain
-- FROM "CaptainVideo";

-- ============================================================================
-- Notes:
-- - captainId columns are kept for backward compatibility
-- - ownerId is nullable to allow gradual migration
-- - All new tables created successfully
-- - No data loss during migration
-- ============================================================================
