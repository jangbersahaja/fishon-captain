# MFA NextAuth Integration - Quick Start Guide

**For**: Developers continuing MFA implementation  
**Status**: Login flow complete, UI components pending  
**Date**: October 13, 2025

---

## 🎯 What's Done

### ✅ Complete & Functional

1. **API Layer** (5 routes):

   - POST `/api/auth/mfa/setup` - Initiate MFA setup
   - POST `/api/auth/mfa/verify-setup` - Complete setup
   - GET `/api/auth/mfa/status` - Get MFA status
   - POST `/api/auth/mfa/verify-login` - Verify MFA code during login
   - POST `/api/auth/mfa/disable` - Disable MFA
   - POST `/api/auth/mfa/complete` - Finalize authentication after MFA

2. **Login Flow** (fully integrated with NextAuth):

   - Password → MFA Challenge → Session Creation
   - Supports TOTP codes (6 digits, 30-second window)
   - Supports backup codes (single-use, format: XXXX-XXXX)
   - MFA token-based temporary sessions (10-minute expiry)
   - Zero breaking changes for users without MFA

3. **Pages**:

   - `/auth/mfa-challenge` - MFA code input page
   - `/auth/mfa-complete` - Finalization page

4. **Components**:

   - `MFAChallengeForm` - Code input with auto-submit, countdown timer
   - Sign-in form updated with MFA redirect logic

5. **Security**:
   - Rate limiting on all MFA endpoints
   - Audit logging for all MFA events
   - Encrypted secrets (AES-256-CBC)
   - Time-limited MFA tokens
   - Backup code removal after use

---

## 🚧 What's Pending

### High Priority (Week 2)

1. **MFA Setup UI** - Modal component for security settings
2. **Backup Codes Display** - Component with copy/print/download
3. **Security Settings Integration** - Enable/disable toggle

### Medium Priority (Week 3)

4. **Email Notifications** - MFA enabled/disabled/backup code used
5. **Middleware Enhancement** - Force MFA for certain routes
6. **Unit Tests** - Coverage for MFA session management

### Future

7. **WhatsApp OTP** - Implement WhatsAppProvider (framework ready)
8. **Production Hardening** - Signed JWT tokens, Redis storage

---

## 🧪 How to Test

### Option A: Quick Setup (Interactive Script - RECOMMENDED)

```bash
# 1. Start dev server
npm run dev

# 2. Sign in at http://localhost:3000/auth and get session token
#    (Browser DevTools > Application > Cookies > next-auth.session-token)

# 3. Run interactive setup script (walks you through the process)
./scripts/mfa-quick-test.sh YOUR_SESSION_TOKEN

# The script will:
# - Generate QR code and backup codes
# - Wait for you to add the code to your authenticator app
# - Prompt you for the 6-digit verification code
# - Complete MFA setup in the database
# - Show you test instructions
```

### Option B: Manual Setup (Using curl)

```bash
# 1. Start dev server
npm run dev

# 2. Sign in and get session cookie
# (Use browser dev tools to grab next-auth.session-token from Application > Cookies)

# 3. STEP 1: Initiate MFA Setup (generates QR code + backup codes)
curl -X POST http://localhost:3000/api/auth/mfa/setup \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Response example:
# {
#   "success": true,
#   "method": "TOTP",
#   "qrCodeUrl": "data:image/png;base64,...",
#   "manualEntry": "JBSWY3DPEHPK3PXP",
#   "backupCodes": ["1234-5678", "9876-5432", ...],
#   "_setupToken": {
#     "encryptedSecret": "...",
#     "encryptedBackupCodes": ["...", "...", ...]
#   }
# }

# IMPORTANT: Save the full response! You'll need it for step 2.

# 4. Scan qrCodeUrl with authenticator app (Google Authenticator, Authy, etc.)
#    OR manually enter the 'manualEntry' code

# 5. Get 6-digit code from authenticator app (refreshes every 30 seconds)

# 6. STEP 2: Complete Setup (enables MFA in database)
#    Replace values with those from step 3 response!
curl -X POST http://localhost:3000/api/auth/mfa/verify-setup \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "method": "TOTP",
    "encryptedSecret": "PASTE_FROM_SETUP_RESPONSE",
    "encryptedBackupCodes": ["PASTE_ARRAY_FROM_SETUP_RESPONSE"]
  }'

# Success response:
# {
#   "success": true,
#   "mfaEnabled": true,
#   "backupCodes": ["1234-5678", "9876-5432", ...]
# }

# ⚠️ CRITICAL: MFA is NOT enabled until step 2 succeeds!
# ⚠️ Database columns (mfaEnabled, mfaSecret, etc.) remain NULL until verify-setup completes
```

### Test MFA Login Flow

```
1. Sign out completely
2. Go to http://localhost:3000/auth
3. Enter email + password for MFA-enabled user
4. Should redirect to /auth/mfa-challenge
5. Enter code from authenticator app (or wait for auto-submit)
6. Should complete authentication and redirect to destination
```

### Test Backup Codes

```
1. Follow steps 1-4 above
2. Click "Lost your device? Use a backup code"
3. Enter one of your backup codes
4. Should complete authentication
5. If < 3 codes remaining, should see warning
```

---

## 📁 Key Files

### Core Logic

```
src/lib/auth/mfa-encryption.ts          - AES-256 encryption utilities
src/lib/auth/mfa-totp.ts                - TOTP generation/verification
src/lib/auth/mfa-provider.ts            - Strategy pattern for multiple methods
src/lib/auth/mfa-session.ts             - Temporary session management
```

### Authentication

```
src/lib/auth.ts                         - NextAuth config (JWT callbacks, credentials provider)
src/components/auth/SignInForm.tsx      - MFA redirect logic
src/app/(auth)/auth/mfa-challenge/page.tsx    - MFA challenge page
src/components/auth/MFAChallengeForm.tsx      - Code input component
src/app/(auth)/auth/mfa-complete/page.tsx     - Finalization page
```

### API Routes

```
src/app/api/auth/mfa/setup/route.ts           - Initiate MFA setup
src/app/api/auth/mfa/verify-setup/route.ts    - Complete setup
src/app/api/auth/mfa/status/route.ts          - Get status
src/app/api/auth/mfa/verify-login/route.ts    - Verify MFA code
src/app/api/auth/mfa/disable/route.ts         - Disable MFA
src/app/api/auth/mfa/complete/route.ts        - Finalize auth
```

### Documentation

```
docs/api/API_MFA_ROUTES.md                    - API reference
docs/guides/MFA_IMPLEMENTATION.md             - Architecture guide
docs/api/MFA_NEXTAUTH_INTEGRATION.md          - NextAuth integration details
docs/api/MFA_API_COMPLETION.md                - API phase completion
docs/api/MFA_QUICKSTART.md                    - This file
```

---

## 🔑 Environment Variables

### Required

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
```

### Optional (for MFA)

```env
# Encryption key for MFA secrets (auto-generated if missing)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MFA_ENCRYPTION_KEY="your-64-char-hex-string"
```

---

## ⚠️ Important: MFA and Social Logins

**MFA ONLY works with email/password sign-in**, not OAuth providers (Google, Facebook, Apple).

### Why?

OAuth providers (Google, Facebook, Apple) handle authentication on their own servers. We cannot interrupt their flow to add an MFA challenge step. This is a limitation of how OAuth works with NextAuth.

### Solution for OAuth Users

If you signed up with Google/Facebook/Apple and want to enable MFA:

1. **Set a password first:**

   **Option A: Via API (Quick)**

   ```bash
   # While signed in with Google/Facebook/Apple, get session token
   # Then set a password:
   ./scripts/set-password.sh YOUR_SESSION_TOKEN 'YourSecure123!'
   ```

   **Option B: Via Settings Page** (when implemented)

   - Go to Settings > Security
   - Set a password for your account

2. **Enable MFA:**
   - Follow the MFA setup process
3. **Sign in with email/password:**
   - Use your email and the password you set
   - Complete MFA challenge with TOTP code
4. **OAuth will be blocked:**
   - If MFA is enabled, social login buttons will show an error
   - You must use email/password login
   - This is for security - MFA requires two-factor verification

### Technical Details

When MFA is enabled:

- ✅ Email/password login → MFA challenge → Success
- ❌ Google/Facebook/Apple → Blocked with error message
- The `signIn` callback checks `mfaEnabled` and returns `false` for OAuth
- User is redirected to `/auth/error` with explanation

## 🐛 Known Issues

1. **Pre-existing TypeScript Error**:

   - File: `src/app/api/admin/users/[id]/force-reset/route.ts`
   - Issue: Next.js 15 params type mismatch
   - Impact: None on MFA functionality
   - Fix: Update params type to `Promise<{ id: string }>`

2. **MFA Challenge Import Error** (VSCode TypeScript cache):
   - File: `src/app/(auth)/auth/mfa-challenge/page.tsx`
   - Error: "Cannot find module '@/components/auth/MFAChallengeForm'"
   - Fix: Restart TypeScript server or reload VS Code
   - Status: File exists, builds correctly

---

## 🚀 Next Action Items

### For UI Developer

1. Create `MFASetupModal.tsx` component

   - QR code display (use `qrcode` library)
   - Manual entry code (formatted)
   - Verification code input
   - Backup codes display with copy/save options

2. Add MFA section to security settings:

   - `/captain/settings` page
   - `/staff/settings` page (if exists)
   - Enable/disable toggle
   - Current method display
   - Backup codes management button

3. Create `BackupCodesDisplay.tsx` component:
   - Grid layout (2 columns)
   - "Copy All" button
   - "Print" button
   - "Download as Text" button
   - Security warning message

### For Backend Developer

1. Add email notification templates:

   - MFA enabled
   - MFA disabled
   - Backup code used (when < 3 remaining)

2. Enhance middleware:

   - Check MFA status for sensitive routes
   - Force MFA setup for admin users
   - Implement grace period for MFA adoption

3. Production hardening:
   - Replace base64url tokens with signed JWT
   - Add Redis for distributed sessions
   - Implement token rotation

---

## 📚 Additional Resources

- **TOTP Standard**: RFC 6238 (<https://tools.ietf.org/html/rfc6238>)
- **Library Used**: @otplib/preset-default v12.0.1
- **QR Code Library**: qrcode v1.5.3
- **Authenticator Apps**: Google Authenticator, Authy, Microsoft Authenticator, 1Password

---

## ✅ Verification Checklist

Before moving to UI phase, ensure:

- [ ] All 6 API routes return 200 for valid requests
- [ ] MFA token generation/verification works
- [ ] TOTP codes verify correctly (test with authenticator app)
- [ ] Backup codes verify and remove after use
- [ ] MFA challenge page loads without errors
- [ ] MFA complete page redirects correctly
- [ ] Sign-in form redirects to MFA challenge when needed
- [ ] Rate limiting works (test with rapid requests)
- [ ] Audit logs capture all MFA events

---

**Status**: 🎉 **MFA Login Flow Complete & Functional**  
**Next Phase**: UI Components for MFA Management

**Questions?** Check the comprehensive docs in `docs/api/` and `docs/guides/`
