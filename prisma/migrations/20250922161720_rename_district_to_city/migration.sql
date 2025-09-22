/*
  Warnings:

  - You are about to drop the column `district` on the `Charter` table. All the data in the column will be lost.
  - Added the required column `city` to the `Charter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Charter" DROP COLUMN "district",
ADD COLUMN     "city" TEXT NOT NULL;
