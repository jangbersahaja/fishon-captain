/*
  Warnings:

  - You are about to drop the column `pendingMediaId` on the `CharterMedia` table. All the data in the column will be lost.
  - You are about to drop the `PendingMedia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CharterMedia" DROP CONSTRAINT "CharterMedia_pendingMediaId_fkey";

-- DropIndex
DROP INDEX "public"."CharterMedia_pendingMediaId_key";

-- AlterTable
ALTER TABLE "public"."CharterMedia" DROP COLUMN "pendingMediaId";

-- DropTable
DROP TABLE "public"."PendingMedia";

-- DropEnum
DROP TYPE "public"."PendingMediaStatus";
