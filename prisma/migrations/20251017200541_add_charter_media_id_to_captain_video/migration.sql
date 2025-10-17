-- AlterTable
ALTER TABLE "public"."CaptainVideo" ADD COLUMN     "charterMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."CaptainVideo" ADD CONSTRAINT "CaptainVideo_charterMediaId_fkey" FOREIGN KEY ("charterMediaId") REFERENCES "public"."CharterMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
