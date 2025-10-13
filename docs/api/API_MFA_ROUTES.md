# MFA API Routes Reference

**Date**: October 13, 2025  
**Status**: ✅ Complete - All 5 routes implemented  
**Base Path**: `/api/auth/mfa`

---

## Overview

This document describes all MFA-related API endpoints for the FishOn Captain Register application. All routes require authentication (except where noted) and include rate limiting, security headers, and comprehensive logging.

---

## Routes

### 1. POST `/api/auth/mfa/setup`

**Purpose**: Initiate MFA setup for a user

**Authentication**: Required (full session)

**Rate Limit**: 3 requests per hour per user

**Request Body**:

```json
{
  "method": "TOTP" // Optional, defaults to TOTP
}
```

**Success Response** (200):

```json
{
  "success": true,
  "method": "TOTP",
  "qrCodeUrl": "data:image/png;base64,...",
  "manualEntry": "JBSW Y3DP EHPK 3PXP",
  "backupCodes": ["A3F2-9D81", "B7E4-2C5F", "9F1A-6B3D", "..."],
  "_setupToken": {
    "encryptedSecret": "...",
    "encryptedBackupCodes": ["..."]
  }
}
```

**Error Responses**:

- `401` - Not authenticated
- `400` - MFA already enabled
- `429` - Rate limit exceeded
- `500` - Server error

**Notes**:

- Setup data is NOT saved to database yet
- User must complete verification via `/verify-setup`
- QR code can be scanned with Google Authenticator, Authy, etc.
- Backup codes should be displayed to user to save
- `_setupToken` must be passed to `/verify-setup`

**Implementation**: `src/app/api/auth/mfa/setup/route.ts`

---

### 2. POST `/api/auth/mfa/verify-setup`

**Purpose**: Complete MFA setup by verifying first TOTP code

**Authentication**: Required (full session)

**Rate Limit**: 5 requests per 5 minutes per user

**Request Body**:

```json
{
  "code": "123456",
  "method": "TOTP",
  "encryptedSecret": "...", // From setup response
  "encryptedBackupCodes": ["..."] // From setup response
}
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "MFA enabled successfully",
  "mfaEnabled": true,
  "method": "TOTP"
}
```

**Error Responses**:

- `401` - Not authenticated
- `400` - Invalid code, missing fields, or MFA already enabled
- `404` - User not found
- `429` - Rate limit exceeded
- `500` - Server error

**Side Effects**:

- Saves encrypted secret and backup codes to database
- Sets `mfaEnabled = true`, `mfaVerifiedAt = now()`
- Logs `mfa_enabled` security event
- TODO: Sends confirmation email

**Notes**:

- Code must be valid TOTP from authenticator app
- This is the final step to enable MFA
- After this, user will need MFA code on every login

**Implementation**: `src/app/api/auth/mfa/verify-setup/route.ts`

---

### 3. GET `/api/auth/mfa/status`

**Purpose**: Get current MFA status for user

**Authentication**: Required (full session)

**Rate Limit**: None

**Request**: No body

**Success Response** (200):

```json
{
  "enabled": true,
  "method": "TOTP",
  "verifiedAt": "2025-10-13T00:00:00Z",
  "backupCodesRemaining": 8,
  "backupCodesLow": false
}
```

**Error Responses**:

- `401` - Not authenticated
- `404` - User not found
- `500` - Server error

**Notes**:

- `backupCodesLow` is true when < 3 backup codes remain
- Use this to display MFA status in settings UI
- No sensitive data returned (secrets remain encrypted)

**Implementation**: `src/app/api/auth/mfa/status/route.ts`

---

### 4. POST `/api/auth/mfa/verify-login`

**Purpose**: Verify MFA code during login process

**Authentication**: Partial (user ID required, can be from login flow)

**Rate Limit**: 5 requests per 5 minutes per user

**Request Body**:

```json
{
  "code": "123456",
  "useBackupCode": false, // Optional, defaults to false
  "userId": "user-id" // Optional if session exists
}
```

**Success Response** (200):

```json
{
  "success": true,
  "valid": true,
  "backupCodeUsed": false,
  "backupCodesRemaining": 8 // Only if backup code used
}
```

**Error Responses**:

- `401` - No user identification
- `400` - Invalid code, MFA not enabled, or no backup codes
- `404` - User not found
- `429` - Rate limit exceeded
- `500` - Server error

**Side Effects** (when backup code used):

- Removes used backup code from database
- Logs `backup_code_used` event
- Warns if < 3 backup codes remain

**Notes**:

- This is called during the login flow after email/password verified
- For TOTP: code must match current 30-second window (±30s for drift)
- For backup codes: code is removed after use (single-use)
- Integration with NextAuth happens via callback (see below)

**Implementation**: `src/app/api/auth/mfa/verify-login/route.ts`

---

### 5. POST `/api/auth/mfa/disable`

**Purpose**: Disable MFA for user

**Authentication**: Required (full session)

**Rate Limit**: 5 requests per hour per user

**Request Body**:

```json
{
  "password": "user-password"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "MFA disabled successfully",
  "mfaEnabled": false
}
```

**Error Responses**:

- `401` - Not authenticated
- `400` - Wrong password, MFA not enabled, or OAuth-only account
- `404` - User not found
- `429` - Rate limit exceeded
- `500` - Server error

**Side Effects**:

- Clears all MFA settings: `mfaEnabled`, `mfaSecret`, `mfaBackupCodes`, `mfaMethod`, `mfaVerifiedAt`
- Logs `mfa_disabled` security event
- TODO: Sends notification email

**Notes**:

- Requires password for security (prevents unauthorized disable)
- OAuth-only users (no password) must contact support
- Consider requiring MFA code + password for extra security (future)

**Implementation**: `src/app/api/auth/mfa/disable/route.ts`

---

## Security Features

### Rate Limiting

| Route           | Limit | Window    |
| --------------- | ----- | --------- |
| `/setup`        | 3     | 1 hour    |
| `/verify-setup` | 5     | 5 minutes |
| `/verify-login` | 5     | 5 minutes |
| `/disable`      | 5     | 1 hour    |
| `/status`       | None  | -         |

### Logging Events

All routes log security events:

- `mfa_setup_initiated` - Setup started
- `mfa_enabled` - MFA enabled successfully
- `mfa_disabled` - MFA disabled
- `mfa_verify_success` - Login code verified
- `mfa_verify_failed` - Invalid code attempt
- `backup_code_used` - Backup code consumed
- `backup_codes_low` - < 3 backup codes remain

### Headers

All responses include security headers via `applySecurityHeaders()`:

- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security

---

## Integration with NextAuth

To integrate MFA with the login flow, update `src/lib/auth.ts`:

```typescript
// In authOptions callbacks
callbacks: {
  async signIn({ user, account }) {
    // Check if user has MFA enabled
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    });

    if (dbUser?.mfaEnabled) {
      // Redirect to MFA challenge page
      // Store partial session for verification
      return `/auth/mfa-challenge?userId=${user.id}`;
    }

    return true; // Allow sign-in
  },

  async jwt({ token, user }) {
    // Add MFA status to token if needed
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { mfaEnabled: true },
      });
      token.mfaEnabled = dbUser?.mfaEnabled || false;
    }
    return token;
  },
}
```

---

## Testing

### Manual Testing Flow

1. **Setup MFA**:

   ```bash
   curl -X POST http://localhost:3000/api/auth/mfa/setup \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json"
   ```

2. **Scan QR code** with Google Authenticator

3. **Verify setup**:

   ```bash
   curl -X POST http://localhost:3000/api/auth/mfa/verify-setup \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json" \
     -d '{"code":"123456","method":"TOTP","encryptedSecret":"...","encryptedBackupCodes":[...]}'
   ```

4. **Check status**:

   ```bash
   curl http://localhost:3000/api/auth/mfa/status \
     -H "Cookie: next-auth.session-token=..."
   ```

5. **Test login verification**:

   ```bash
   curl -X POST http://localhost:3000/api/auth/mfa/verify-login \
     -H "Content-Type: application/json" \
     -d '{"code":"123456","userId":"user-id"}'
   ```

6. **Disable MFA**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/mfa/disable \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json" \
     -d '{"password":"your-password"}'
   ```

### Unit Tests

See `__tests__/auth/mfa-api.test.ts` (to be created) for:

- Authentication checks
- Rate limiting
- Code verification
- Backup code handling
- Error cases

---

## Future Enhancements

### WhatsApp OTP Support

When WhatsApp Business API is ready:

1. Update `/setup` to handle `method: "WHATSAPP"`
2. Collect phone number during setup
3. Send OTP via WhatsApp instead of TOTP
4. `/verify-login` already supports different methods

### Additional Routes (Future)

- `POST /api/auth/mfa/regenerate-backup-codes` - Generate new backup codes
- `POST /api/auth/mfa/send-test-code` - Test WhatsApp/SMS delivery
- `GET /api/auth/mfa/history` - View MFA usage history

---

## Environment Variables

Required:

```env
MFA_ENCRYPTION_KEY=your-32-byte-encryption-key-here
```

Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Error Handling

All routes follow consistent error format:

```json
{
  "error": "Human-readable error message",
  "details": ["Optional array of specific errors"]
}
```

HTTP status codes:

- `200` - Success
- `400` - Bad request / validation error
- `401` - Authentication required
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error

---

## Related Files

- **Core Utilities**: `src/lib/auth/mfa-*.ts`
- **API Routes**: `src/app/api/auth/mfa/*/route.ts`
- **Documentation**: `docs/guides/MFA_IMPLEMENTATION.md`
- **Schema**: `prisma/schema.prisma` (User model MFA fields)
- **Migration**: `prisma/migrations/20251012190525_add_mfa_fields/`

---

**Last Updated**: October 13, 2025  
**Status**: ✅ All routes implemented and tested for type safety  
**Next Steps**: Build UI components and integrate with NextAuth
