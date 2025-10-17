---
type: feature
status: in-production
feature: authentication
updated: 2025-10-17
tags:
  [nextauth, oauth, mfa, otp, password-management, email-verification, security]
---

# Authentication System

## Overview

Multi-layered authentication system supporting OAuth providers (Google, Facebook, Apple), credential-based login, multi-factor authentication (MFA/TOTP), email verification via OTP, password reset flows, and role-based access control.

**Tech Stack:** NextAuth.js v4 + Prisma Adapter + JWT sessions + bcryptjs + TOTP (speakeasy) + nodemailer

**Security Features:**

- OAuth account linking disabled (`allowDangerousEmailAccountLinking: false`)
- Email verification required for credentials login
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Bcrypt password hashing (10 rounds, consider upgrading to 12)
- MFA with TOTP (Google Authenticator compatible) and backup codes
- Audit logging for security events

---

## Architecture

### NextAuth Configuration

**File:** `src/lib/auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({ allowDangerousEmailAccountLinking: false }),
    FacebookProvider({ allowDangerousEmailAccountLinking: false }),
    AppleProvider({ allowDangerousEmailAccountLinking: false }),
    CredentialsProvider({
      /* email + password */
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // Attach userId and role to JWT
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser?.role) token.role = dbUser.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Attach userId and role to session.user
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
};
```

### Database Schema (Prisma)

**Core User Model:**

```prisma
model User {
  id                       String    @id @default(cuid())
  email                    String    @unique
  name                     String?
  firstName                String?
  lastName                 String?
  passwordHash             String?
  emailVerified            DateTime?
  role                     Role      @default(CAPTAIN)

  // Account Security
  lockedUntil              DateTime?
  loginAttempts            Int       @default(0)
  forcePasswordReset       Boolean   @default(false)

  // Email Verification & OTP
  emailVerificationToken   String?   @unique
  emailVerificationExpires DateTime?
  otpCode                  String?
  otpExpires               DateTime?
  otpPurpose               String?   // 'email_verification' | 'password_reset'
  otpAttempts              Int       @default(0)
  lastOtpSentAt            DateTime?

  // Password Reset
  resetPasswordToken       String?   @unique
  resetPasswordExpires     DateTime?

  // Multi-Factor Authentication
  passwordMfaEnabled       Boolean   @default(false)
  passwordMfaMethod        MfaMethod?
  passwordMfaSecret        String?   // TOTP secret (base32)
  passwordMfaVerifiedAt    DateTime?
  passwordMfaBackupCodes   String[]  @default([])

  // Relations
  accounts                 Account[]
  sessions                 Session[]
  PasswordHistory          PasswordHistory[]
  captainProfile           CaptainProfile?
  verification             CaptainVerification?

  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}

enum Role {
  CAPTAIN
  STAFF
  ADMIN
}

enum MfaMethod {
  TOTP
}

model PasswordHistory {
  id           String   @id @default(cuid())
  userId       String
  passwordHash String
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}
```

---

## Authentication Flows

### 1. OAuth Sign-In (Google/Facebook/Apple)

**Routes:**

- NextAuth handler: `/api/auth/[...nextauth]`

**Flow:**

1. User clicks "Sign in with Google" → redirects to OAuth provider
2. Provider returns with authorization code
3. NextAuth exchanges code for tokens, fetches profile
4. `signIn` callback checks if email verified (OAuth emails auto-verified)
5. Creates/updates User record via Prisma adapter
6. JWT token generated with `userId` and `role`
7. Session created, redirects to `/captain` dashboard

**Configuration Check:**

```typescript
// src/lib/auth.ts
export const oauthProviders: OAuthProviderInfo[] = [
  { id: "google", name: "Google", configured: Boolean(env.GOOGLE_CLIENT_ID) },
  {
    id: "facebook",
    name: "Facebook",
    configured: Boolean(env.FACEBOOK_CLIENT_ID),
  },
  { id: "apple", name: "Apple", configured: Boolean(env.APPLE_CLIENT_ID) },
];
```

### 2. Credentials Sign-In (Email + Password)

**API Route:** `/api/auth/[...nextauth]` (CredentialsProvider)

**Flow:**

1. User submits email + password
2. Provider fetches user from database:
   ```typescript
   const user = await prisma.user.findUnique({
     where: { email },
     select: { id, email, name, passwordHash, emailVerified },
   });
   ```
3. **Verification gates:**
   - If `!user.emailVerified`: Throw error "Email not verified"
   - If `!user.passwordHash`: Return null (OAuth-only account)
4. Compare password: `bcrypt.compare(password, user.passwordHash)`
5. If valid → check if MFA enabled:
   - If `user.passwordMfaEnabled`: Store temporary session, redirect to `/mfa-challenge`
   - Else: Complete sign-in, create session
6. If invalid → increment `loginAttempts`, lock account if >= 5 attempts

**Account Lockout Logic:**

```typescript
// After 5 failed attempts:
await prisma.user.update({
  where: { id: user.id },
  data: {
    loginAttempts: { increment: 1 },
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  },
});
```

### 3. Sign-Up Flow

**API Route:** `/api/auth/signup` (POST)

**Request Body:**

```typescript
{
  email: string;
  password: string;
  name: string;
  accountType: "captain" | "staff";
  firstName?: string;
  lastName?: string;
}
```

**Flow:**

1. Validate password strength (min 8 chars, consider upgrading to 12+)
2. Check if email already exists
3. Hash password: `bcrypt.hash(password, 10)`
4. Create user record:
   ```typescript
   const user = await prisma.user.create({
     data: {
       email,
       passwordHash,
       name,
       firstName,
       lastName,
       role: accountType === "captain" ? "CAPTAIN" : "STAFF",
       emailVerified: null, // Must verify email
     },
   });
   ```
5. Generate 6-digit OTP:
   ```typescript
   const otp = generateOTP(); // Crypto-secure random
   await prisma.user.update({
     where: { id: user.id },
     data: {
       otpCode: otp,
       otpExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
       otpPurpose: "email_verification",
       lastOtpSentAt: new Date(),
     },
   });
   ```
6. Send verification email with OTP
7. Return success, client redirects to `/verify-otp?email={email}`

**Rate Limiting:**

- Max 3 signups per IP per minute
- Max 1 OTP request per user per 60 seconds

### 4. Email Verification (OTP)

**API Routes:**

- Send OTP: `/api/auth/resend-otp` (POST)
- Verify OTP: `/api/auth/verify-otp` (POST)

**OTP Generation:** `src/lib/auth/otp.ts`

```typescript
export function generateOTP(): string {
  const buffer = crypto.randomBytes(3);
  const code = (buffer.readUIntBE(0, 3) % 1000000).toString().padStart(6, "0");
  return code;
}

export async function createOTP(userId: string, purpose: string) {
  const cooldown = 60; // seconds
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user.lastOtpSentAt) {
    const elapsed = Date.now() - user.lastOtpSentAt.getTime();
    if (elapsed < cooldown * 1000) {
      throw new Error(`Please wait ${cooldown - Math.floor(elapsed / 1000)}s`);
    }
  }

  const otp = generateOTP();
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpCode: otp,
      otpExpires: new Date(Date.now() + 5 * 60 * 1000),
      otpPurpose: purpose,
      lastOtpSentAt: new Date(),
      otpAttempts: 0,
    },
  });

  return otp;
}
```

**Verification Flow:**

1. User receives 6-digit OTP via email
2. Submits OTP to `/api/auth/verify-otp`
3. Server validates:
   ```typescript
   if (user.otpExpires < new Date()) throw new Error("OTP expired");
   if (user.otpAttempts >= 3) throw new Error("Too many attempts");
   if (user.otpCode !== code) {
     await prisma.user.update({
       where: { id: user.id },
       data: { otpAttempts: { increment: 1 } },
     });
     throw new Error("Invalid OTP");
   }
   ```
4. If valid:
   ```typescript
   await prisma.user.update({
     where: { id: user.id },
     data: {
       emailVerified: new Date(),
       otpCode: null,
       otpExpires: null,
       otpAttempts: 0,
     },
   });
   ```
5. Client redirects to sign-in page

### 5. Password Reset Flow

**API Routes:**

- Request reset: `/api/auth/forgot-password` (POST)
- Verify OTP: `/api/auth/verify-otp` (POST)
- Reset password: `/api/auth/reset-password` (POST)

**Flow:**

1. User submits email to `/api/auth/forgot-password`
2. Server generates OTP with `otpPurpose: "password_reset"`
3. Send email with OTP
4. User submits OTP to `/api/auth/verify-otp`
5. If valid, server generates reset token:
   ```typescript
   const resetToken = crypto.randomBytes(32).toString("hex");
   await prisma.user.update({
     where: { id: user.id },
     data: {
       resetPasswordToken: resetToken,
       resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
     },
   });
   ```
6. Return reset token to client
7. User submits new password + token to `/api/auth/reset-password`
8. Server validates token, checks password history (prevent reuse of last 3 passwords)
9. Hash new password, update user:
   ```typescript
   await prisma.user.update({
     where: { id: user.id },
     data: {
       passwordHash: await bcrypt.hash(newPassword, 10),
       resetPasswordToken: null,
       resetPasswordExpires: null,
       forcePasswordReset: false,
     },
   });
   await prisma.passwordHistory.create({
     data: { userId: user.id, passwordHash: newPasswordHash },
   });
   ```

**Password History Check:**

```typescript
const history = await prisma.passwordHistory.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" },
  take: 3,
});

for (const entry of history) {
  if (await bcrypt.compare(newPassword, entry.passwordHash)) {
    throw new Error("Cannot reuse recent passwords");
  }
}
```

### 6. Multi-Factor Authentication (MFA/TOTP)

**API Routes:**

- Setup MFA: `/api/auth/mfa/setup` (POST)
- Verify setup: `/api/auth/mfa/verify-setup` (POST)
- Check MFA status: `/api/auth/check-mfa` (GET)
- Verify login: `/api/auth/mfa/verify-login` (POST)
- Disable MFA: `/api/auth/mfa/disable` (POST)

**Setup Flow:**

1. User navigates to `/captain/settings/security`
2. Click "Enable MFA" → POST `/api/auth/mfa/setup`
3. Server generates TOTP secret:

   ```typescript
   const secret = speakeasy.generateSecret({
     name: `FishOn Captain (${user.email})`,
     issuer: "FishOn",
   });

   const qrCode = await QRCode.toDataURL(secret.otpauth_url);

   // Store temporarily (not yet verified)
   await prisma.user.update({
     where: { id: userId },
     data: {
       passwordMfaSecret: secret.base32,
       passwordMfaMethod: "TOTP",
       passwordMfaEnabled: false, // Not enabled until verified
     },
   });

   return { qrCode, secret: secret.base32 };
   ```

4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. App generates 6-digit TOTP code
6. User submits code to `/api/auth/mfa/verify-setup`
7. Server verifies:
   ```typescript
   const verified = speakeasy.totp.verify({
     secret: user.passwordMfaSecret,
     encoding: "base32",
     token: code,
     window: 2, // Allow ±2 time steps (60s window)
   });
   ```
8. If valid, generate 10 backup codes:

   ```typescript
   const backupCodes = Array.from({ length: 10 }, () =>
     crypto.randomBytes(4).toString("hex").toUpperCase()
   );
   const hashedCodes = await Promise.all(
     backupCodes.map((code) => bcrypt.hash(code, 10))
   );

   await prisma.user.update({
     where: { id: userId },
     data: {
       passwordMfaEnabled: true,
       passwordMfaVerifiedAt: new Date(),
       passwordMfaBackupCodes: hashedCodes,
     },
   });

   return { backupCodes }; // Show once, user must save
   ```

**Login with MFA:**

1. User completes email+password step
2. Server checks `user.passwordMfaEnabled`
3. If true, store temporary session in-memory (or Redis):
   ```typescript
   pendingMfaSessions.set(sessionId, {
     userId: user.id,
     expires: Date.now() + 5 * 60 * 1000,
   });
   ```
4. Redirect to `/mfa-challenge?session={sessionId}`
5. User enters TOTP code or backup code
6. Submit to `/api/auth/mfa/verify-login`
7. Server verifies:

   ```typescript
   // TOTP verification
   if (type === "totp") {
     const valid = speakeasy.totp.verify({
       secret: user.passwordMfaSecret,
       encoding: "base32",
       token: code,
       window: 2,
     });
   }

   // Backup code verification
   if (type === "backup") {
     for (const [index, hashedCode] of user.passwordMfaBackupCodes.entries()) {
       if (await bcrypt.compare(code, hashedCode)) {
         // Remove used backup code
         const newCodes = [...user.passwordMfaBackupCodes];
         newCodes.splice(index, 1);
         await prisma.user.update({
           where: { id: user.id },
           data: { passwordMfaBackupCodes: newCodes },
         });
         valid = true;
         break;
       }
     }
   }
   ```

8. If valid, complete sign-in and clear pending session

---

## UI Components

### Authentication Forms

**Location:** `src/components/auth/`

1. **VerificationCodeInput.tsx**

   - 6-digit OTP entry with auto-focus and paste support
   - Used in: email verification, MFA setup, password reset
   - Props: `value`, `onChange`, `onComplete`, `disabled`

2. **MFAChallengeForm.tsx**

   - Toggles between TOTP (6-digit) and backup code (8-char) modes
   - Auto-submit when valid code entered
   - Props: `onSubmit`, `onCancel`, `loading`

3. **PasswordStrengthMeter.tsx**

   - Visual feedback for password strength (weak/fair/good/strong)
   - Checks length, complexity, common patterns
   - Props: `password`, `showRequirements`

4. **EmailVerificationForm.tsx**
   - Displays email address, OTP input, resend button with cooldown
   - Props: `email`, `onVerify`, `onResend`

**Example Usage:**

```typescript
// src/app/(auth)/verify-otp/page.tsx
import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";

export default function VerifyOTPPage() {
  const [code, setCode] = useState("");

  const handleComplete = async (fullCode: string) => {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code: fullCode }),
    });
    // Handle response
  };

  return (
    <VerificationCodeInput
      value={code}
      onChange={setCode}
      onComplete={handleComplete}
    />
  );
}
```

### Protected Routes (Middleware)

**File:** `src/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const session = await getToken({ req: request, secret: env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // Protect captain routes
  if (pathname.startsWith("/captain")) {
    if (!session) return NextResponse.redirect(new URL("/signin", request.url));
    if (session.role !== "CAPTAIN" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Protect staff routes
  if (pathname.startsWith("/staff")) {
    if (!session) return NextResponse.redirect(new URL("/signin", request.url));
    if (session.role !== "STAFF" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/captain/:path*", "/staff/:path*", "/admin/:path*"],
};
```

---

## Security Considerations

### Current Issues & Improvements

**🔴 Critical (Address Immediately):**

1. **Bcrypt Rounds:** Currently 10, industry standard is 12-14

   ```typescript
   // Upgrade in signup/password-reset
   const hash = await bcrypt.hash(password, 12); // ← Change from 10
   ```

2. **Password Requirements:** Only 8+ characters, no complexity rules

   - **Recommendation:** Min 12 chars, require uppercase + lowercase + number + symbol
   - Use library like `zxcvbn` for strength estimation

3. **JWT-Only Sessions:** Cannot revoke compromised tokens
   - **Alternative:** Switch to database sessions (`strategy: "database"`)
   - Enables "sign out all devices" functionality

**🟡 Medium Priority:**

4. **Rate Limiting:** Currently uses in-memory store (not persistent across restarts)

   - **Recommendation:** Use Redis (Upstash) or Vercel KV for distributed rate limiting
   - See: `src/lib/rateLimiter.ts`

5. **Email Verification Bypass:** OAuth accounts auto-verified

   - **Consider:** Require email confirmation even for OAuth if email changes

6. **MFA Backup Codes:** Only 10 codes, no regeneration UI
   - **Add:** Ability to regenerate backup codes from settings page

**🟢 Low Priority:**

7. **Audit Logging:** Foundation exists but not fully utilized

   - Expand to log: failed login attempts, password changes, MFA enable/disable
   - File: `src/server/audit.ts`

8. **Session Timeout:** No automatic timeout for inactive sessions
   - Consider: JWT `maxAge` (default 30 days) → reduce to 7 days for sensitive apps

### Best Practices Implemented

✅ **Password hashing:** bcryptjs with salt rounds  
✅ **OAuth security:** Account linking disabled  
✅ **Rate limiting:** API endpoints protected  
✅ **Account lockout:** After 5 failed attempts (15min)  
✅ **MFA support:** TOTP with backup codes  
✅ **Email verification:** OTP-based, 5min expiry  
✅ **Password history:** Prevents reuse of last 3 passwords  
✅ **Security headers:** CSP, HSTS, X-Frame-Options  
✅ **Environment validation:** `src/lib/env.ts` checks required vars

---

## API Reference

### Authentication Endpoints

| Method | Endpoint                     | Description                               | Auth Required | Rate Limit     |
| ------ | ---------------------------- | ----------------------------------------- | ------------- | -------------- |
| POST   | `/api/auth/signup`           | Create new user account                   | No            | 3/min          |
| POST   | `/api/auth/[...nextauth]`    | NextAuth handlers (signin, signout, etc.) | Varies        | 10/min         |
| GET    | `/api/auth/account-type`     | Get account type info (captain/staff)     | No            | -              |
| POST   | `/api/auth/resend-otp`       | Resend OTP for email verification         | No            | 1/60s per user |
| POST   | `/api/auth/verify-otp`       | Verify OTP code                           | No            | 3 attempts     |
| POST   | `/api/auth/forgot-password`  | Request password reset OTP                | No            | 3/min          |
| POST   | `/api/auth/reset-password`   | Reset password with token                 | No            | 5/min          |
| POST   | `/api/auth/change-password`  | Change password (logged in)               | Yes           | 5/min          |
| GET    | `/api/auth/check-mfa`        | Check if user has MFA enabled             | Yes           | -              |
| POST   | `/api/auth/mfa/setup`        | Generate MFA secret + QR code             | Yes           | 5/min          |
| POST   | `/api/auth/mfa/verify-setup` | Verify TOTP code to enable MFA            | Yes           | 5 attempts     |
| POST   | `/api/auth/mfa/verify-login` | Verify TOTP/backup code during login      | No            | 5 attempts     |
| POST   | `/api/auth/mfa/disable`      | Disable MFA (requires password)           | Yes           | 3/min          |

### Request/Response Schemas

**POST `/api/auth/signup`**

```typescript
// Request
{
  email: string;
  password: string;
  name: string;
  accountType: "captain" | "staff";
  firstName?: string;
  lastName?: string;
}

// Response (201)
{
  success: true;
  userId: string;
  message: "Verification email sent";
}

// Error (400)
{
  error: "Email already exists";
}
```

**POST `/api/auth/verify-otp`**

```typescript
// Request
{
  email: string;
  code: string; // 6-digit OTP
}

// Response (200)
{
  success: true;
  message: "Email verified";
}

// Error (400)
{
  error: "Invalid or expired OTP";
}
```

**POST `/api/auth/mfa/setup`**

```typescript
// Response (200)
{
  qrCode: string; // Data URL for QR code image
  secret: string; // Base32 TOTP secret (backup if QR scan fails)
  backupCodes?: string[]; // Only returned after verify-setup
}
```

**POST `/api/auth/mfa/verify-login`**

```typescript
// Request
{
  sessionId: string; // From MFA challenge redirect
  code: string; // 6-digit TOTP or 8-char backup code
  type: "totp" | "backup";
}

// Response (200)
{
  success: true;
  redirect: "/captain"; // Target URL after successful verification
}
```

---

## Testing

### Manual Testing Checklist

**Sign-Up Flow:**

- [ ] Create account with valid email/password
- [ ] Receive OTP email within 30 seconds
- [ ] Verify email with correct OTP
- [ ] Attempt login before email verification (should fail)
- [ ] Attempt login after email verification (should succeed)
- [ ] Request OTP resend (60s cooldown enforced)

**OAuth Flow:**

- [ ] Sign in with Google (new account)
- [ ] Sign in with Google (existing account)
- [ ] Attempt to link OAuth to existing credentials account (should fail - linking disabled)

**Password Reset:**

- [ ] Request password reset for valid email
- [ ] Receive OTP email
- [ ] Verify OTP and get reset token
- [ ] Reset password with valid token
- [ ] Attempt to reuse previous password (should fail)
- [ ] Attempt reset with expired token (should fail)

**MFA Setup:**

- [ ] Enable MFA from settings
- [ ] Scan QR code with Google Authenticator
- [ ] Verify TOTP code to complete setup
- [ ] Save backup codes
- [ ] Sign out and sign in (should prompt for MFA)
- [ ] Enter valid TOTP code (should succeed)
- [ ] Enter invalid TOTP code (should fail with retry)
- [ ] Use backup code (should succeed and remove code from list)

**Account Lockout:**

- [ ] Enter wrong password 5 times
- [ ] Verify account locked for 15 minutes
- [ ] Wait 15 minutes and retry (should unlock)

**Rate Limiting:**

- [ ] Attempt 10+ signups from same IP (should block after 3)
- [ ] Request OTP 3+ times within 60s (should block after 1)

### Automated Tests

**Test File Locations:**

- `src/lib/auth/__tests__/otp.test.ts` - OTP generation and validation
- `src/app/api/auth/__tests__/signup.test.ts` - Sign-up flow
- `src/app/api/auth/__tests__/mfa.test.ts` - MFA setup and verification

**Example Test:**

```typescript
// src/lib/auth/__tests__/otp.test.ts
import { describe, it, expect, vi } from "vitest";
import { generateOTP, createOTP } from "../otp";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("OTP Generation", () => {
  it("generates 6-digit code", () => {
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("enforces cooldown period", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      lastOtpSentAt: new Date(Date.now() - 30000), // 30s ago
    });

    await expect(createOTP("user-1", "email_verification")).rejects.toThrow(
      /Please wait \d+s/
    );
  });
});
```

---

## Troubleshooting

### Common Issues

**"Email not verified" error on login**

- **Cause:** User created account but didn't verify email
- **Solution:** Resend OTP from `/api/auth/resend-otp`, verify at `/verify-otp`

**"Too many OTP attempts" error**

- **Cause:** User entered wrong OTP 3+ times
- **Solution:** Request new OTP (resets attempt counter)

**MFA codes not working**

- **Cause:** Time sync issue between server and authenticator app
- **Solution:** Check server time is correct, TOTP window allows ±60s drift
- **Workaround:** Use backup code instead

**Account locked after password change**

- **Cause:** `forcePasswordReset` flag not cleared
- **Solution:** Clear flag manually in database or add auto-clear logic

**OAuth sign-in fails silently**

- **Cause:** Missing/invalid OAuth credentials in environment
- **Solution:** Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc. in `.env`
- **Debug:** Check `oauthProviders` array in `src/lib/auth.ts`

**JWT token too large (>4KB cookie limit)**

- **Cause:** Too much data in JWT (rare with current implementation)
- **Solution:** Move large data to database, store only `userId` + `role` in JWT

### Debug Logging

Enable auth debug logs:

```bash
# .env.local
NEXTAUTH_DEBUG=true
```

Check logs for:

- Provider configuration errors
- Callback execution flow
- Token generation details

---

## Migration Path (Future Improvements)

### Phase 1: Security Hardening (Week 1)

- [ ] Increase bcrypt rounds to 12
- [ ] Add password complexity requirements (zxcvbn)
- [ ] Implement persistent rate limiting (Redis/Upstash)
- [ ] Audit log expansion (all auth events)

### Phase 2: Session Management (Week 2-3)

- [ ] Switch from JWT to database sessions
- [ ] Add "active devices" UI in settings
- [ ] Implement "sign out all devices" functionality
- [ ] Add session timeout (7 days inactive)

### Phase 3: Enhanced MFA (Week 4)

- [ ] Add backup code regeneration UI
- [ ] SMS-based MFA option (Twilio)
- [ ] WebAuthn/Passkey support (FIDO2)
- [ ] MFA recovery flow (admin-assisted)

### Phase 4: Advanced Features (Future)

- [ ] Magic link login (passwordless)
- [ ] Social recovery (trusted contacts)
- [ ] Risk-based authentication (IP reputation, device fingerprinting)
- [ ] Delegated access (staff impersonation with audit trail)

---

## Related Documentation

- [API Routes Overview](/docs/api/README.md)
- [Rate Limiting Strategy](/docs/guides/RATE_LIMITING.md)
- [Security Headers Configuration](/docs/guides/SECURITY_HEADERS.md)
- [Audit Logging System](/docs/guides/AUDIT_LOGGING.md)
- [Email Service Integration](/docs/guides/EMAIL_SERVICE.md)

---

## Changelog

**2025-10-17:** Consolidated 25+ auth-related docs into single source  
**2025-10-12:** Added OTP/TAC verification system (Phase 1)  
**2025-10-10:** MFA TOTP implementation complete (Phase 5-6)  
**2025-10-08:** Password reset flow with email OTP  
**2025-09-20:** Initial NextAuth setup with OAuth providers
