/*
  Warnings:

  - Made the column `additional` on table `CaptainVerification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."CaptainVerification" ALTER COLUMN "additional" SET NOT NULL,
ALTER COLUMN "additional" SET DEFAULT '[]';
