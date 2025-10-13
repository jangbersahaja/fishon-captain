/**
 * MFA TOTP Utilities
 * Handles TOTP generation and verification using @otplib/preset-default
 */

import { authenticator } from "@otplib/preset-default";
import crypto from "crypto";
import * as QRCode from "qrcode";
import { decryptArray, encryptArray } from "./mfa-encryption";

// TOTP configuration
authenticator.options = {
  digits: 6,
  step: 30, // 30 seconds
  window: 1, // Allow 1 step before/after for clock drift
};

const APP_NAME = "FishOn Captain";

/**
 * Generate a new TOTP secret
 * @returns Base32-encoded secret
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate TOTP setup data (secret + QR code)
 * @param userEmail - User's email for QR code label
 * @returns Setup data with secret, QR code URL, and manual entry key
 */
export async function generateTOTPSetup(userEmail: string): Promise<{
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}> {
  const secret = generateTOTPSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    secret,
    qrCodeDataUrl,
    manualEntryKey: secret.match(/.{1,4}/g)?.join(" ") || secret, // Format: ABCD EFGH IJKL
  };
}

/**
 * Verify a TOTP code against a secret
 * @param code - 6-digit code from authenticator app
 * @param secret - Base32-encoded TOTP secret
 * @returns true if code is valid
 */
export function verifyTOTPCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes in format XXXX-XXXX
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buffer = crypto.randomBytes(4);
    const code =
      buffer
        .toString("hex")
        .toUpperCase()
        .match(/.{1,4}/g)
        ?.join("-") || "";
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a backup code against encrypted backup codes
 * @param code - Backup code entered by user
 * @param encryptedBackupCodesJson - JSON string of encrypted backup codes
 * @returns { valid: boolean, remainingCodes: string } - Validation result and updated codes
 */
export function verifyBackupCode(
  code: string,
  encryptedBackupCodesJson: string
): { valid: boolean; remainingCodes: string } {
  try {
    const backupCodes = decryptArray(encryptedBackupCodesJson);
    const normalizedInput = code.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();

    const matchIndex = backupCodes.findIndex(
      (bc) => bc.replace(/[^A-Fa-f0-9]/g, "").toUpperCase() === normalizedInput
    );

    if (matchIndex === -1) {
      return { valid: false, remainingCodes: encryptedBackupCodesJson };
    }

    // Remove used code
    const remainingCodes = [
      ...backupCodes.slice(0, matchIndex),
      ...backupCodes.slice(matchIndex + 1),
    ];

    return {
      valid: true,
      remainingCodes: encryptArray(remainingCodes),
    };
  } catch {
    return { valid: false, remainingCodes: encryptedBackupCodesJson };
  }
}
