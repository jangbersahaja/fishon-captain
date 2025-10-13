-- AlterTable: Rename MFA fields to be password-specific
-- This preserves existing data by using RENAME instead of DROP/ADD

-- Rename columns
ALTER TABLE "User" RENAME COLUMN "mfaEnabled" TO "passwordMfaEnabled";
ALTER TABLE "User" RENAME COLUMN "mfaMethod" TO "passwordMfaMethod";
ALTER TABLE "User" RENAME COLUMN "mfaSecret" TO "passwordMfaSecret";
ALTER TABLE "User" RENAME COLUMN "mfaBackupCodes" TO "passwordMfaBackupCodes";
ALTER TABLE "User" RENAME COLUMN "mfaVerifiedAt" TO "passwordMfaVerifiedAt";

-- Update comments/descriptions (PostgreSQL COMMENT ON syntax)
COMMENT ON COLUMN "User"."passwordMfaEnabled" IS 'MFA enabled for password-based authentication (OAuth users rely on provider 2FA)';
COMMENT ON COLUMN "User"."passwordMfaMethod" IS 'MFA method for password auth: TOTP, WHATSAPP, or SMS';
COMMENT ON COLUMN "User"."passwordMfaSecret" IS 'Encrypted TOTP secret or provider-specific data for password MFA';
COMMENT ON COLUMN "User"."passwordMfaBackupCodes" IS 'Encrypted backup codes for password MFA';
COMMENT ON COLUMN "User"."passwordMfaVerifiedAt" IS 'Timestamp when user completed password MFA setup';
