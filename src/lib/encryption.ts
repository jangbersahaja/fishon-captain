/**
 * Encryption utility for sensitive data using AES-256-GCM
 *
 * IMPORTANT: Set ENCRYPTION_KEY in your .env file
 * Generate a key with: openssl rand -base64 32
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const _TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment
 * Falls back to a development-only key if not set (NOT FOR PRODUCTION)
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production environment");
    }
    console.warn(
      "⚠️  ENCRYPTION_KEY not set, using development key. DO NOT USE IN PRODUCTION!"
    );
    return "dev-only-key-change-this-in-production-32-chars";
  }

  return key;
}

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: salt:iv:encrypted:tag (all base64)
 */
export function encrypt(text: string): string {
  if (!text) return "";

  try {
    const masterKey = getEncryptionKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const key = deriveKey(masterKey, salt);

    // Create cipher and encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Return format: salt:iv:encrypted:tag
    return [
      salt.toString("base64"),
      iv.toString("base64"),
      encrypted,
      tag.toString("base64"),
    ].join(":");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted string in format: salt:iv:encrypted:tag
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";

  try {
    const masterKey = getEncryptionKey();

    // Parse encrypted data
    const parts = encryptedData.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const [saltB64, ivB64, encrypted, tagB64] = parts;
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");

    // Derive key from master key and salt
    const key = deriveKey(masterKey, salt);

    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // Only log in development to reduce noise (safeDecrypt handles gracefully)
    if (process.env.NODE_ENV === "development") {
      console.error("Decryption error:", error);
    }
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data (one-way, for comparison only)
 * Useful for checking if data has changed without storing plain text
 */
export function hash(text: string): string {
  if (!text) return "";

  try {
    return crypto.createHash("sha256").update(text).digest("base64");
  } catch (error) {
    console.error("Hashing error:", error);
    throw new Error("Failed to hash data");
  }
}

/**
 * Mask sensitive data for display (e.g., account numbers)
 * @param value - Value to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string like "********1234"
 */
export function maskSensitiveData(
  value: string,
  visibleChars: number = 4
): string {
  if (!value) return "";
  if (value.length <= visibleChars) return value;

  const visible = value.slice(-visibleChars);
  const masked = "*".repeat(Math.max(0, value.length - visibleChars));
  return masked + visible;
}
