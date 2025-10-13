/**
 * MFA Encryption Utilities
 * Handles encryption/decryption of MFA secrets and backup codes using AES-256-CBC
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * @throws {Error} If MFA_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("MFA_ENCRYPTION_KEY environment variable is required");
  }

  // Ensure key is exactly 32 bytes for AES-256
  if (Buffer.from(key, "utf8").length === 32) {
    return Buffer.from(key, "utf8");
  }

  // Derive 32-byte key using SHA-256
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string using AES-256-CBC
 * @param text - Plain text to encrypt
 * @returns Encrypted text in format: iv:encryptedData (both hex encoded)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encrypt()
 * @param encryptedText - Encrypted text in format: iv:encryptedData
 * @returns Decrypted plain text
 * @throws {Error} If decryption fails
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const [ivHex, encryptedData] = encryptedText.split(":");

    if (!ivHex || !encryptedData) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Encrypt an array of strings (e.g., backup codes)
 * @param items - Array of strings to encrypt
 * @returns JSON string of encrypted array
 */
export function encryptArray(items: string[]): string {
  const encrypted = items.map((item) => encrypt(item));
  return JSON.stringify(encrypted);
}

/**
 * Decrypt an array of strings encrypted with encryptArray()
 * @param encryptedJson - JSON string of encrypted array
 * @returns Array of decrypted strings
 * @throws {Error} If decryption fails
 */
export function decryptArray(encryptedJson: string): string[] {
  try {
    const encrypted = JSON.parse(encryptedJson) as string[];
    return encrypted.map((item) => decrypt(item));
  } catch (error) {
    throw new Error(
      `Array decryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate that encryption/decryption is working correctly
 * @returns true if encryption works, false otherwise
 */
export function validateEncryption(): boolean {
  try {
    const testString = "test-encryption-validation";
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    return decrypted === testString;
  } catch {
    return false;
  }
}
