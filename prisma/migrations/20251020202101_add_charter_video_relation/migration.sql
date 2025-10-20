-- CreateIndex
CREATE INDEX "CaptainVideo_charterId_idx" ON "public"."CaptainVideo"("charterId");

-- AddForeignKey
ALTER TABLE "public"."CaptainVideo" ADD CONSTRAINT "CaptainVideo_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "public"."Charter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
