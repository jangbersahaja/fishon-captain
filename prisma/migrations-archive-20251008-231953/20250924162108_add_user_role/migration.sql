-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CAPTAIN', 'STAFF', 'ADMIN');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'CAPTAIN';
