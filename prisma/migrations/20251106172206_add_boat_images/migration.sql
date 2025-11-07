-- CreateTable
CREATE TABLE "BoatImage" (
    "id" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoatImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BoatImage" ADD CONSTRAINT "BoatImage_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
