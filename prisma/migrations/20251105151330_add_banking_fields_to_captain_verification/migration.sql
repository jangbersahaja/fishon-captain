-- AlterTable
ALTER TABLE "CaptainVerification" ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankStatement" JSONB,
ADD COLUMN     "bankSwiftCode" TEXT;
