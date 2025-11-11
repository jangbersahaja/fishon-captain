-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_ownerId_fkey";

-- DropTable
DROP TABLE "Payout";

-- DropEnum
DROP TYPE "PayoutStatus";

