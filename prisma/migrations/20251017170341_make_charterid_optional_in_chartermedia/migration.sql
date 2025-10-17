-- DropForeignKey
ALTER TABLE "public"."CharterMedia" DROP CONSTRAINT "CharterMedia_charterId_fkey";

-- AlterTable
ALTER TABLE "public"."CharterMedia" ALTER COLUMN "charterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."CharterMedia" ADD CONSTRAINT "CharterMedia_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
