/**
 * MFA Provider Pattern
 * Unified interface for different MFA methods (TOTP, SMS, WhatsApp)
 * Currently implements TOTP only
 */

import { prisma } from "@/lib/prisma";
import { MfaMethod } from "@prisma/client";
import { decrypt } from "./mfa-encryption";
import {
  generateBackupCodes,
  generateTOTPSetup,
  verifyBackupCode,
  verifyTOTPCode,
} from "./mfa-totp";

export interface MFASetupResult {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  valid: boolean;
  method: "totp" | "backup";
}

/**
 * Setup MFA for a user
 * Generates TOTP secret and backup codes
 * Does NOT persist to database - caller must verify and save
 *
 * @param userId - User ID
 * @param userEmail - User email for QR code
 * @param method - MFA method (currently only TOTP supported)
 * @returns Setup data with secret, QR code, and backup codes
 */
export async function setupMFA(
  userId: string,
  userEmail: string,
  method: MfaMethod
): Promise<MFASetupResult> {
  if (method !== "TOTP") {
    throw new Error(`MFA method ${method} not yet implemented`);
  }

  // Generate TOTP secret and QR code
  const totpSetup = await generateTOTPSetup(userEmail);

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  return {
    secret: totpSetup.secret,
    qrCodeDataUrl: totpSetup.qrCodeDataUrl,
    manualEntryKey: totpSetup.manualEntryKey,
    backupCodes,
  };
}

/**
 * Verify MFA code during login
 * Checks against TOTP or backup codes
 *
 * @param userId - User ID
 * @param code - 6-digit TOTP code or 8-char backup code
 * @returns Verification result
 */
export async function verifyMFA(
  userId: string,
  code: string
): Promise<MFAVerificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordMfaEnabled: true,
      passwordMfaMethod: true,
      passwordMfaSecret: true,
      passwordMfaBackupCodes: true,
    },
  });

  if (!user?.passwordMfaEnabled || !user.passwordMfaMethod) {
    throw new Error("MFA not enabled for user");
  }

  // Try TOTP first (6 digits)
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    if (user.passwordMfaMethod === "TOTP" && user.passwordMfaSecret) {
      const secret = decrypt(user.passwordMfaSecret);
      const valid = verifyTOTPCode(code, secret);
      if (valid) {
        return { valid: true, method: "totp" };
      }
    }
  }

  // Try backup code (format: XXXX-XXXX)
  if (user.passwordMfaBackupCodes && user.passwordMfaBackupCodes.length > 0) {
    const encryptedCodes = JSON.stringify(user.passwordMfaBackupCodes);
    const result = verifyBackupCode(code, encryptedCodes);

    if (result.valid) {
      // Update remaining backup codes in database
      const remainingCodes = JSON.parse(result.remainingCodes) as string[];
      await prisma.user.update({
        where: { id: userId },
        data: { passwordMfaBackupCodes: remainingCodes },
      });

      return { valid: true, method: "backup" };
    }
  }

  return { valid: false, method: "totp" };
}

/**
 * Verify MFA backup code only (for emergency access)
 *
 * @param userId - User ID
 * @param code - 8-character backup code
 * @returns true if valid
 */
export async function verifyMFABackup(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordMfaBackupCodes: true },
  });

  if (
    !user?.passwordMfaBackupCodes ||
    user.passwordMfaBackupCodes.length === 0
  ) {
    return false;
  }

  const encryptedCodes = JSON.stringify(user.passwordMfaBackupCodes);
  const result = verifyBackupCode(code, encryptedCodes);

  if (result.valid) {
    // Update remaining backup codes
    const remainingCodes = JSON.parse(result.remainingCodes) as string[];
    await prisma.user.update({
      where: { id: userId },
      data: { passwordMfaBackupCodes: remainingCodes },
    });
    return true;
  }

  return false;
}
