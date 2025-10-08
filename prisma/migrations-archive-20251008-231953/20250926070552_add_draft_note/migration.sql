-- CreateTable
CREATE TABLE "public"."DraftNote" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftNote_draftId_idx" ON "public"."DraftNote"("draftId");

-- CreateIndex
CREATE INDEX "DraftNote_authorId_idx" ON "public"."DraftNote"("authorId");

-- AddForeignKey
ALTER TABLE "public"."DraftNote" ADD CONSTRAINT "DraftNote_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."CharterDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftNote" ADD CONSTRAINT "DraftNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
