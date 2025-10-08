-- Make passwordHash nullable for OAuth-only accounts
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;