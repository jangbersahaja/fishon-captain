# Solution A Rebuild Guide - Password-Based MFA Only

**Status**: Database ✅ Migrated | Prisma ✅ Synced | Code ❌ Need Rebuild

## ✅ What's Already Done

1. **Database Migration Applied**: Fields renamed from `mfaEnabled` → `passwordMfaEnabled` (and 4 others)
2. **Prisma Schema Synced**: `npx prisma db pull` completed, types generated
3. **Core Libraries Created**:
   - ✅ `src/lib/password.ts` - Password validation with history check
   - ✅ `src/lib/datetime.ts` - Malaysia timezone formatting
   - ✅ `src/lib/email.ts` - Zoho SMTP email sending
   - ✅ `src/lib/auth/otp.ts` - OTP generation/validation
   - ✅ `src/lib/auth/lockout.ts` - Account lockout protection

## 🔨 Files to Build Next

### Phase 1: MFA Core Libraries (with passwordMfa\* fields)

1. **`src/lib/auth/mfa-encryption.ts`**

   ```typescript
   // AES-256-CBC encryption for TOTP secrets
   export function encrypt(text: string): string;
   export function decrypt(encryptedText: string): string;
   export function encryptArray(values: string[]): string[];
   export function decryptArray(encryptedValues: string[]): string[];
   ```

2. **`src/lib/auth/mfa-totp.ts`**

   ```typescript
   // TOTP generation using @otplib/preset-default
   export function generateTOTPSecret(): string;
   export async function generateTOTPSetup(
     email: string,
     secret: string
   ): Promise<TOTPSetupData>;
   export function verifyTOTPCode(code: string, secret: string): boolean;
   export function generateBackupCodes(count: number = 10): string[];
   export function verifyBackupCode(
     code: string,
     validCodes: string[]
   ): string | null;
   ```

3. **`src/lib/auth/mfa-session.ts`**

   ```typescript
   // Temporary MFA session tokens (10 min expiry)
   export async function createMFAPendingSession(
     userId: string,
     email: string
   ): Promise<string>;
   export async function verifyMFAPendingSession(
     sessionToken: string
   ): Promise<{ userId: string; email: string } | null>;
   ```

4. **`src/lib/auth/mfa-provider.ts`**
   ```typescript
   // Provider pattern for TOTP (extensible to SMS/WhatsApp later)
   export async function setupMFA(
     method: MfaMethod,
     userId: string,
     email: string
   ): Promise<MFASetupResult>;
   export async function verifyMFA(
     method: MfaMethod,
     userId: string,
     code: string,
     encryptedSecret: string
   ): Promise<boolean>;
   ```

### Phase 2: Update NextAuth Config

**`src/lib/auth.ts`** - CRITICAL CHANGES:

```typescript
// REMOVE THIS BLOCK (OAuth blocking):
if (account?.provider !== "credentials") {
  const userWithMfa = await prisma.user.findUnique({
    where: { id: existingUser.id },
    select: { mfaEnabled: true }, // OLD FIELD NAME
  });

  if (userWithMfa?.mfaEnabled) {
    return false; // BLOCKING OAUTH USERS
  }
}

// KEEP: Credentials provider MFA check (update field name):
if (account?.provider === "credentials") {
  const userWithMfa = await prisma.user.findUnique({
    where: { id: existingUser.id },
    select: { passwordMfaEnabled: true, passwordMfaMethod: true }, // NEW NAMES
  });

  if (userWithMfa?.passwordMfaEnabled) {
    // Create MFA session token, redirect to challenge
  }
}
```

### Phase 3: MFA API Routes

**All routes check `passwordMfaEnabled` instead of `mfaEnabled`**

1. `/api/auth/check-mfa` - Pre-login MFA check
2. `/api/auth/mfa/setup` - Generate TOTP secret & QR code
3. `/api/auth/mfa/verify-setup` - Complete MFA setup
4. `/api/auth/mfa/verify-login` - Verify code during login
5. `/api/auth/mfa/complete` - Complete MFA login flow
6. `/api/auth/mfa/disable` - Turn off MFA
7. `/api/auth/mfa/status` - Get MFA status

### Phase 4: OTP/Password API Routes

8. `/api/auth/forgot-password` - Request password reset OTP
9. `/api/auth/resend-otp` - Resend OTP code
10. `/api/auth/verify-otp` - Verify OTP for email/password reset
11. `/api/auth/reset-password` - Reset password with OTP
12. `/api/auth/change-password` - Change password (authenticated)
13. `/api/auth/set-password` - Set initial password (OAuth users)

### Phase 5: UI Components

1. **`src/components/auth/MFAChallengeForm.tsx`**

   - 6-digit TOTP input
   - Backup code toggle
   - 30s countdown timer
   - Auto-submit on 6 digits

2. **`src/components/auth/VerificationCodeInput.tsx`**

   - Individual digit boxes
   - Auto-focus & auto-advance
   - Paste support
   - Error state styling

3. **`src/components/captain/ChangePasswordForm.tsx`**
   - Current password input
   - New password with real-time validation
   - Confirm password matching
   - History check integration

### Phase 6: Auth Pages

1. `/auth/mfa-challenge` - TOTP/backup code entry
2. `/auth/mfa-complete` - Session completion redirect
3. `/auth/forgot-password` - Request OTP
4. `/auth/verify-otp` - Enter OTP code
5. `/auth/reset-password` - Set new password
6. `/auth/error` - Auth error display

### Phase 7: Settings Pages (OAuth User Notices)

**MFA Section** - Check `session.user.passwordHash`:

```typescript
if (!passwordHash) {
  // OAuth user - show notice
  return (
    <div className="notice">
      <p>Your authentication is managed by Google.</p>
      <p>Enable 2FA in your Google Account settings.</p>
      <a href="https://myaccount.google.com/security">Google Security →</a>
    </div>
  );
}

// Password user - show MFA setup
```

**Change Password Section** - Show notice (DON'T HIDE):

```typescript
if (!passwordHash) {
  return (
    <div className="notice">
      <p>You signed in with Google.</p>
      <p>To set a password, use the 'Set Password' option below.</p>
      <button onClick={() => router.push("/auth/set-password")}>
        Set Password
      </button>
    </div>
  );
}

// Show change password form
```

### Phase 8: Admin Routes

1. `/api/admin/users` - List users with security info
2. `/api/admin/users/[id]/unlock` - Unlock locked account
3. `/api/admin/users/[id]/force-reset` - Force password reset
4. `/api/admin/security-events` - Audit log

5. `/staff/security` - Admin security dashboard page

## 🔑 Key Field Mappings

| Old Field Name   | New Field Name           | Type         |
| ---------------- | ------------------------ | ------------ |
| `mfaEnabled`     | `passwordMfaEnabled`     | `Boolean`    |
| `mfaMethod`      | `passwordMfaMethod`      | `MfaMethod?` |
| `mfaSecret`      | `passwordMfaSecret`      | `String?`    |
| `mfaBackupCodes` | `passwordMfaBackupCodes` | `String[]`   |
| `mfaVerifiedAt`  | `passwordMfaVerifiedAt`  | `DateTime?`  |

## 🚨 Critical Points

1. **OAuth Users**: Remove OAuth blocking, rely on provider's 2FA
2. **Password Users**: MFA is optional but works normally
3. **Settings UI**: Show NOTICES for OAuth users (user's preference)
4. **Field Names**: Use `passwordMfa*` everywhere in new code
5. **Database**: Already migrated correctly ✅

## 📋 Validation Checklist

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Password user can enable MFA
- [ ] Password user can log in with MFA
- [ ] OAuth user can sign in (no blocking)
- [ ] OAuth user sees notices in settings
- [ ] Password change works for password users
- [ ] Set password works for OAuth users
- [ ] Admin can unlock accounts
- [ ] Email notifications send correctly

## 🎯 Implementation Priority

1. **Immediate**: MFA libraries + auth.ts fix (unblock OAuth)
2. **High**: MFA API routes + core UI components
3. **Medium**: Auth pages + OTP routes
4. **Low**: Admin routes + security dashboard

---

**Next Step**: Continue building from Phase 1, file by file, with correct field names throughout.
