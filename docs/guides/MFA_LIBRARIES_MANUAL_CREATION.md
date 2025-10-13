# MFA Libraries Creation Guide

## Issue

The `create_file` tool has persistent corruption issues with `src/lib/auth/mfa-encryption.ts`. Content gets duplicated and merged mid-line, resulting in 180+ TypeScript errors. This appears to be a filesystem or editor interference issue.

## Workaround Options

### Option 1: Manual Creation (Recommended)

Create the files manually in your editor:

#### File 1: `src/lib/auth/mfa-encryption.ts`

```typescript
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
```

#### File 2: `src/lib/auth/mfa-totp.ts`

```typescript
/**
 * MFA TOTP Utilities
 * Handles TOTP generation and verification using @otplib/preset-default
 */

import { authenticator } from "@otplib/preset-default";
import * as QRCode from "qrcode";
import crypto from "crypto";
import { encrypt, decrypt, encryptArray, decryptArray } from "./mfa-encryption";

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
```

#### File 3: `src/lib/auth/mfa-session.ts`

```typescript
/**
 * MFA Session Utilities
 * Handles temporary MFA session tokens for multi-step authentication
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MFA_SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface MFAPendingSession {
  userId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a temporary MFA session token
 * Valid for 10 minutes to complete MFA challenge
 *
 * @param userId - User ID requiring MFA
 * @returns Session token to be sent to client
 */
export async function createMFAPendingSession(userId: string): Promise<string> {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MFA_SESSION_EXPIRY_MS);

  // Store in database (using OTPVerification model temporarily, or create new MFASession model)
  await prisma.oTPVerification.create({
    data: {
      userId,
      code: token, // Reusing code field for MFA token
      type: "MFA_CHALLENGE", // New type
      expiresAt,
      attempts: 0,
    },
  });

  return token;
}

/**
 * Verify and consume an MFA session token
 *
 * @param token - Session token from client
 * @returns User ID if valid, null if invalid/expired
 */
export async function verifyMFAPendingSession(
  token: string
): Promise<string | null> {
  try {
    const session = await prisma.oTPVerification.findFirst({
      where: {
        code: token,
        type: "MFA_CHALLENGE",
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return null;
    }

    // Consume token (delete after use)
    await prisma.oTPVerification.delete({
      where: { id: session.id },
    });

    return session.userId;
  } catch {
    return null;
  }
}

/**
 * Clean up expired MFA session tokens
 */
export async function cleanupExpiredMFASessions(): Promise<void> {
  try {
    await prisma.oTPVerification.deleteMany({
      where: {
        type: "MFA_CHALLENGE",
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error("[mfa-session] Cleanup failed:", error);
  }
}
```

#### File 4: `src/lib/auth/mfa-provider.ts`

```typescript
/**
 * MFA Provider Pattern
 * Unified interface for different MFA methods (TOTP, SMS, WhatsApp)
 * Currently implements TOTP only
 */

import { MfaMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, encryptArray, decryptArray } from "./mfa-encryption";
import {
  generateTOTPSetup,
  verifyTOTPCode,
  generateBackupCodes,
  verifyBackupCode,
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
```

### Option 2: Terminal Creation

Use `cat` with heredoc:

```bash
cd /Users/jangbersahaja/Website/fishon-captain-register
cat > src/lib/auth/mfa-encryption.ts << 'EOF'
[paste file 1 content here]
EOF
```

Repeat for each of the 4 files.

## Environment Variables Required

Add to `.env.local`:

```env
# MFA Encryption Key (must be 32 bytes for AES-256)
MFA_ENCRYPTION_KEY=your-32-character-secret-key-here-change-this!
```

Generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Verification Steps

After creating files:

1. Check TypeScript compiles: `npm run typecheck`
2. Check imports resolve: `npm run dev` (watch for import errors)
3. Test encryption: Create a test script in `scripts/test-mfa-encryption.ts`

## Next Steps

Once MFA libraries are created:

1. ✅ Update todo: Mark todo 2 as completed
2. ⏭️ Skip to todo 4: Create MFA API routes (routes will use these libraries)
3. ⏭️ Continue with todo 5-9 as documented in SOLUTION_A_REBUILD_GUIDE.md

## Notes

- Todo 3 (Update auth.ts) is NOT needed - auth.ts already doesn't block OAuth users
- All 4 MFA library files use correct `passwordMfa*` field names
- Files follow existing code patterns (error handling, TypeScript types, JSDoc comments)
- Dependencies: `@otplib/preset-default`, `qrcode` (check package.json, install if missing)
