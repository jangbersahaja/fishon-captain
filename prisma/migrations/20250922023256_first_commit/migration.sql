-- CreateEnum
CREATE TYPE "public"."CharterPricingPlan" AS ENUM ('BASIC', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "public"."CharterStyle" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('CHARTER_PHOTO', 'CHARTER_VIDEO', 'CAPTAIN_AVATAR', 'TRIP_MEDIA');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "district" TEXT NOT NULL,
    "startingPoint" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "description" TEXT NOT NULL,
    "pricingPlan" "public"."CharterPricingPlan" NOT NULL DEFAULT 'BASIC',
    "boatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "alcoholAllowed" BOOLEAN NOT NULL,
    "smokingAllowed" BOOLEAN NOT NULL,

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

    CONSTRAINT "CharterMedia_pkey" PRIMARY KEY ("id")
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
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trip" ADD CONSTRAINT "Trip_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripStartTime" ADD CONSTRAINT "TripStartTime_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripSpecies" ADD CONSTRAINT "TripSpecies_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripTechnique" ADD CONSTRAINT "TripTechnique_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
