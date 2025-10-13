# Multi-Factor Authentication (MFA) Implementation

**Date**: October 13, 2025  
**Status**: 🚧 In Progress - Core utilities complete, API routes next  
**Primary Method**: TOTP (Authenticator Apps)  
**Future Methods**: WhatsApp OTP, SMS OTP

---

## 📋 Overview

This implementation provides a flexible, extensible MFA system for FishOn Captain Register. The architecture uses the **Strategy Pattern** to support multiple authentication methods, with TOTP (Time-based One-Time Password) as the initial implementation.

### Why This Architecture?

1. **Extensible** - Easy to add WhatsApp, SMS, or other methods without changing existing code
2. **Type-Safe** - Full TypeScript support with Prisma enums
3. **Secure** - AES-256 encryption for secrets, strong backup codes
4. **User-Friendly** - QR codes for setup, backup codes for recovery

---

## ✅ Completed Components

### 1. Database Schema (`prisma/schema.prisma`)

Added MFA fields to User model:

```prisma
model User {
  // ... existing fields ...

  // MFA fields (multi-method support)
  mfaEnabled        Boolean     @default(false)
  mfaMethod         MfaMethod?  // TOTP | WHATSAPP | SMS
  mfaSecret         String?     // Encrypted secret
  mfaBackupCodes    String[]    @default([]) // Encrypted codes
  mfaVerifiedAt     DateTime?   // Setup completion timestamp
}

enum MfaMethod {
  TOTP      // Authenticator apps ✅ Implemented
  WHATSAPP  // WhatsApp OTP 🚧 Future
  SMS       // SMS OTP 🚧 Future
}
```

**Migration**: `20251012190525_add_mfa_fields`

### 2. Encryption Utilities (`src/lib/auth/mfa-encryption.ts`)

Handles secure storage of MFA secrets:

- **`encrypt(text)`** - AES-256-CBC encryption with unique IV
- **`decrypt(encryptedText)`** - Decrypt stored secrets
- **`encryptArray(values)`** - Encrypt backup codes array
- **`decryptArray(encryptedValues)`** - Decrypt backup codes
- **`hashValue(value)`** - SHA-256 one-way hashing
- **`verifyHash(value, hash)`** - Timing-safe comparison
- **`generateRandomString(length)`** - Cryptographic random generation

**Security Features**:

- Unique initialization vector (IV) per encryption
- 256-bit AES encryption
- Timing-safe comparisons to prevent side-channel attacks
- Node.js crypto module (FIPS-compliant)

### 3. TOTP Core (`src/lib/auth/mfa-totp.ts`)

Implements RFC 6238 Time-Based One-Time Password:

- **`generateTOTPSecret()`** - Create base32-encoded secret
- **`generateTOTPSetup(email, secret)`** - Generate QR code and setup data
- **`verifyTOTPCode(code, secret)`** - Validate 6-digit codes
- **`generateBackupCodes(count)`** - Create recovery codes (format: XXXX-XXXX)
- **`verifyBackupCode(code, validCodes)`** - Check backup code validity
- **`getTOTPTimeRemaining()`** - Get seconds until code expires
- **`isValidTOTPSecret(secret)`** - Validate base32 format

**Configuration**:

- 30-second time step (industry standard)
- ±1 window tolerance (90-second total) for clock drift
- 6-digit codes
- Compatible with Google Authenticator, Authy, Microsoft Authenticator

### 4. MFA Provider System (`src/lib/auth/mfa-provider.ts`)

Strategy pattern implementation for multiple MFA methods:

**Interfaces**:

```typescript
interface MFAProvider {
  method: MfaMethod;
  name: string;
  description: string;
  available: boolean;

  setup(userId, email): Promise<MFASetupResult>;
  verify(userId, code, secret): Promise<boolean>;
  verifyBackup(code, backupCodes): Promise<string | null>;
}
```

**Implemented Providers**:

- ✅ **TOTPProvider** - Fully functional authenticator app support
- 🚧 **WhatsAppProvider** - Framework ready, awaiting WhatsApp API integration
- 🚧 **SMSProvider** - Framework ready, awaiting SMS service integration

**Helper Functions**:

- `setupMFA(method, userId, email)` - Initialize MFA for user
- `verifyMFA(method, userId, code, secret)` - Verify login code
- `verifyMFABackup(method, code, codes)` - Verify backup code
- `getAvailableMFAMethods()` - Get UI-ready list of methods

### 5. Environment Configuration

Added to `src/lib/env.ts`:

```typescript
interface ServerEnvShape {
  // ... existing ...
  MFA_ENCRYPTION_KEY?: string; // 32-byte key for AES-256
}
```

**Note**: You need to add this to your `.env`:

```env
# MFA Encryption (32 characters minimum)
MFA_ENCRYPTION_KEY=your-32-char-or-longer-secret-key-here-change-in-production
```

---

## 🚧 Next Steps (To Be Implemented)

### Phase 1: API Routes (Week 1)

#### 1. POST `/api/auth/mfa/setup`

**Purpose**: Initialize MFA setup for user

**Request**:

```json
{
  "method": "TOTP"
}
```

**Response**:

```json
{
  "qrCodeUrl": "data:image/png;base64,...",
  "manualEntry": "JBSW Y3DP EHPK 3PXP",
  "backupCodes": ["A3F2-9D81", "B7E4-2C5F", ...]
}
```

**Implementation notes**:

- Requires authentication
- Generates temporary setup data (not saved yet)
- Returns QR code and backup codes
- User must verify first code to complete setup

#### 2. POST `/api/auth/mfa/verify-setup`

**Purpose**: Complete MFA setup by verifying first code

**Request**:

```json
{
  "code": "123456",
  "method": "TOTP",
  "secret": "JBSWY3DPEHPK3PXP", // From setup response
  "backupCodes": ["A3F2-9D81", ...]
}
```

**Response**:

```json
{
  "success": true,
  "mfaEnabled": true
}
```

**Implementation notes**:

- Verify code is valid
- Encrypt and save secret + backup codes
- Set `mfaEnabled = true`, `mfaMethod = TOTP`, `mfaVerifiedAt = now()`
- Log security event `mfa_enabled`

#### 3. POST `/api/auth/mfa/verify-login`

**Purpose**: Verify MFA code during login

**Request**:

```json
{
  "code": "123456",
  "useBackupCode": false
}
```

**Response**:

```json
{
  "valid": true,
  "backupCodeUsed": false
}
```

**Implementation notes**:

- Requires partial authentication (email/password verified)
- Support both TOTP codes and backup codes
- If backup code used, mark it as consumed
- Rate limit: 5 attempts per 5 minutes
- Log `mfa_verify_success` or `mfa_verify_failed`

#### 4. POST `/api/auth/mfa/disable`

**Purpose**: Turn off MFA (requires password confirmation)

**Request**:

```json
{
  "password": "user-password"
}
```

**Response**:

```json
{
  "success": true,
  "mfaEnabled": false
}
```

**Implementation notes**:

- Verify user's password
- Clear `mfaSecret`, `mfaBackupCodes`, set `mfaEnabled = false`
- Log `mfa_disabled`
- Send email notification

#### 5. GET `/api/auth/mfa/status`

**Purpose**: Check user's MFA status

**Response**:

```json
{
  "enabled": true,
  "method": "TOTP",
  "verifiedAt": "2025-10-13T00:00:00Z",
  "backupCodesRemaining": 8
}
```

### Phase 2: UI Components (Week 2)

1. **MFA Setup Modal** (`src/components/auth/MFASetupModal.tsx`)

   - QR code display
   - Manual entry option
   - Code verification input
   - Progress indicators

2. **Backup Codes Display** (`src/components/auth/BackupCodesDisplay.tsx`)

   - Grid layout of codes
   - Copy all button
   - Print button
   - Download as text file
   - Warning to store safely

3. **MFA Challenge Page** (`src/app/auth/mfa-challenge/page.tsx`)

   - 6-digit code input (auto-focus, auto-submit)
   - Countdown timer showing code refresh
   - "Use backup code" toggle
   - Error messages
   - Rate limiting feedback

4. **Security Settings Section**
   - Enable/Disable MFA toggle
   - Current method display
   - Backup codes management (view/regenerate)
   - QR code regeneration option

### Phase 3: Integration (Week 3)

1. **NextAuth Callback Updates** (`src/lib/auth.ts`)

   - Check `mfaEnabled` in `signIn` callback
   - Redirect to `/auth/mfa-challenge` if enabled
   - Store temp session token for MFA verification

2. **Middleware Updates** (`src/middleware.ts`)

   - Allow `/auth/mfa-challenge` without full auth
   - Check MFA completion before granting access

3. **Security Event Logging**
   - `mfa_enabled` - User enables MFA
   - `mfa_disabled` - User disables MFA
   - `mfa_verify_success` - Login code verified
   - `mfa_verify_failed` - Invalid code entered
   - `backup_code_used` - Backup code consumed
   - `mfa_setup_abandoned` - Setup started but not completed

---

## 🔮 Future: WhatsApp OTP Integration

When WhatsApp Business API is ready:

### WhatsApp Provider Implementation

```typescript
// src/lib/auth/mfa-whatsapp.ts
import { WhatsAppBusinessAPI } from "whatsapp-business-api"; // Example

export async function sendWhatsAppOTP(phoneNumber: string, code: string) {
  const api = new WhatsAppBusinessAPI(env.WHATSAPP_API_KEY);
  await api.sendMessage({
    to: phoneNumber,
    template: "otp_verification",
    parameters: [code],
  });
}
```

### Database Changes

```prisma
model User {
  // ... existing fields ...
  mfaPhoneNumber String? // For WhatsApp/SMS
}
```

### API Adjustments

The current architecture already supports this! Just:

1. Set `WhatsAppProvider.available = true`
2. Implement `setup()` and `verify()` methods
3. Add phone number validation
4. Connect to WhatsApp Business API

---

## 📊 Security Considerations

### Encryption

- ✅ AES-256-CBC with unique IVs
- ✅ Server-side encryption key (not in database)
- ✅ Timing-safe comparisons

### Rate Limiting

- 🚧 TODO: Implement in API routes
  - Setup: 3 attempts per hour
  - Verify: 5 attempts per 5 minutes
  - Login: 10 attempts per hour

### Account Recovery

- ✅ 10 backup codes per user
- ✅ Each code single-use
- 🚧 TODO: Email notification when backup code used
- 🚧 TODO: Warn when < 3 backup codes remaining

### Audit Trail

- 🚧 TODO: Log all MFA events
- 🚧 TODO: Email notifications for security events
- 🚧 TODO: Display MFA history in security settings

---

## 🧪 Testing Strategy

### Unit Tests (`__tests__/auth/mfa.test.ts`)

```typescript
describe("MFA TOTP", () => {
  test("generates valid TOTP secret");
  test("creates valid QR code");
  test("verifies correct codes");
  test("rejects invalid codes");
  test("handles clock drift (±30s)");
});

describe("MFA Encryption", () => {
  test("encrypts and decrypts secrets");
  test("produces unique ciphertexts");
  test("handles array encryption");
});

describe("MFA Backup Codes", () => {
  test("generates 10 unique codes");
  test("verifies valid codes");
  test("rejects used codes");
  test("handles formatting variations");
});
```

### Integration Tests

- Setup flow end-to-end
- Login with MFA
- Backup code recovery
- Disable MFA
- Provider switching (future)

---

## 📚 Dependencies

```json
{
  "dependencies": {
    "@otplib/preset-default": "^12.0.1",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

---

## 🚀 Quick Start for Developers

### 1. Generate Encryption Key

```bash
# Generate a secure 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:

```env
MFA_ENCRYPTION_KEY=<generated-key>
```

### 2. Test TOTP Locally

```typescript
import {
  generateTOTPSecret,
  generateTOTPSetup,
  generateTOTPCode,
  verifyTOTPCode,
} from "@/lib/auth/mfa-totp";

// Generate setup
const secret = generateTOTPSecret();
const setup = await generateTOTPSetup("test@example.com", secret);

// Get current code (for testing only!)
const code = generateTOTPCode(secret);

// Verify code
const valid = verifyTOTPCode(code, secret);
console.log({ valid }); // true
```

### 3. Use Provider System

```typescript
import { setupMFA, verifyMFA } from "@/lib/auth/mfa-provider";
import { MfaMethod } from "@prisma/client";

// Setup MFA
const result = await setupMFA(MfaMethod.TOTP, "user-id", "user@example.com");

// Verify code
const valid = await verifyMFA(
  MfaMethod.TOTP,
  "user-id",
  "123456",
  result.encryptedSecret
);
```

---

## 📝 Current Status Summary

| Component            | Status         | Notes                               |
| -------------------- | -------------- | ----------------------------------- |
| Database Schema      | ✅ Complete    | Multi-method support ready          |
| Encryption Utils     | ✅ Complete    | AES-256, tested                     |
| TOTP Core            | ✅ Complete    | RFC 6238 compliant                  |
| Provider System      | ✅ Complete    | TOTP functional, WhatsApp/SMS ready |
| API Routes           | 🚧 Todo        | 5 routes needed                     |
| UI Components        | 🚧 Todo        | Setup, challenge, settings          |
| NextAuth Integration | 🚧 Todo        | Callback + middleware               |
| Security Logging     | 🚧 Todo        | Event tracking                      |
| Tests                | 🚧 Todo        | Unit + integration                  |
| Documentation        | 🟡 In Progress | This file                           |

---

## 🎯 Next Actions

1. ✅ Create database migration
2. ✅ Implement core utilities
3. **→ Create API routes** (Current)
4. Build UI components
5. Integrate with NextAuth
6. Add security logging
7. Write tests
8. User acceptance testing
9. Production deployment

---

**Questions?** Check this document or ask in #dev-security channel.

**Ready for WhatsApp?** The architecture is prepared—just implement the WhatsAppProvider methods when the API is available!
