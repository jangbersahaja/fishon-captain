/*
  Warnings:

  - You are about to drop the column `alcoholAllowed` on the `Policies` table. All the data in the column will be lost.
  - You are about to drop the column `smokingAllowed` on the `Policies` table. All the data in the column will be lost.
  - Added the required column `alcoholNotAllowed` to the `Policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smokingNotAllowed` to the `Policies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Policies" DROP COLUMN "alcoholAllowed",
DROP COLUMN "smokingAllowed",
ADD COLUMN     "alcoholNotAllowed" BOOLEAN NOT NULL,
ADD COLUMN     "smokingNotAllowed" BOOLEAN NOT NULL;
