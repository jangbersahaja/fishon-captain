# Authentication System Analysis & Improvement Proposals

**Date**: October 12, 2025  
**Current Status**: Functional with NextAuth.js + JWT strategy  
**Security Level**: Good foundation, needs hardening

---

## 📋 Current System Overview

### Architecture

- **Auth Library**: NextAuth.js v4 with JWT strategy
- **Session Storage**: JWT tokens (not database sessions)
- **Providers**: Google OAuth, Facebook, Apple, Credentials (email/password)
- **Password Hashing**: bcrypt.js (10 rounds)
- **Role-Based Access**: CAPTAIN, STAFF, ADMIN roles
- **Middleware Protection**: Edge middleware for `/captain` and `/staff` routes

### Key Components

1. **`src/lib/auth.ts`** - NextAuth configuration
2. **`src/middleware.ts`** - Route protection
3. **`src/app/api/auth/signup/route.ts`** - User registration
4. **`src/components/auth/SignInForm.tsx`** - Login UI with OAuth
5. **`src/app/api/auth/account-type/route.ts`** - OAuth account detection

---

## 🔍 Current Strengths

### ✅ What's Working Well

1. **Multi-Provider Support**

   - Google, Facebook, Apple OAuth configured
   - Graceful fallback when providers not configured
   - Email/password as backup option

2. **Security Headers**

   - CSP headers configured (`src/lib/headers.ts`)
   - Rate limiting on critical endpoints
   - Request ID tracking for audit trails

3. **Role-Based Access Control**

   - Clear role hierarchy (CAPTAIN → STAFF → ADMIN)
   - Middleware-level enforcement
   - Admin impersonation support for testing

4. **User Experience**

   - OAuth-only account detection (prevents password entry for OAuth users)
   - Account existence check before sign-in
   - Clear error messages

5. **Environment Validation**
   - `src/lib/env.ts` validates secrets at startup
   - Entropy check for `NEXTAUTH_SECRET`
   - Prevents secret leakage via `NEXT_PUBLIC_` prefix

---

## 🚨 Security Vulnerabilities & Issues

### ⚠️ CRITICAL Issues

#### 1. **No Email Verification**

**Current**: Users can register with any email without verification
**Risk**:

- Account takeover if user registers with someone else's email
- Spam/bot registrations
- No way to recover forgotten passwords

**Evidence**:

```typescript
// src/app/api/auth/signup/route.ts - No email verification sent
const user = await prisma.user.create({
  data: createData,
  select: { id: true },
});
return NextResponse.json({ ok: true, id: user.id });
```

#### 2. **`allowDangerousEmailAccountLinking: true`**

**Current**: OAuth providers configured with dangerous auto-linking
**Risk**:

- If attacker knows victim's email, they can create OAuth account with that email
- Auto-links to existing account without verification
- **Account takeover vector**

**Evidence**:

```typescript
// src/lib/auth.ts
GoogleProvider({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true, // ⚠️ DANGEROUS
});
```

#### 3. **Weak Password Requirements**

**Current**: Only 8+ characters required, no complexity rules
**Risk**:

- Users choose weak passwords like "password123"
- Vulnerable to brute force even with rate limiting

**Evidence**:

```typescript
// src/components/auth/SignUpForm.tsx
if (password.length < 8) {
  setError("Password must be at least 8 characters long");
}
```

#### 4. **No Account Lockout**

**Current**: Rate limiting only (5 attempts/min), no permanent lockout
**Risk**:

- Attackers can continue attempting with slow brute force
- No protection against distributed attacks

#### 5. **JWT Strategy Without Refresh Tokens**

**Current**: Single JWT with no refresh mechanism
**Risk**:

- Cannot invalidate sessions server-side
- Role changes don't take effect until token expires
- Long session lifetime = longer attack window

**Evidence**:

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" }, // No database sessions
};
```

### ⚠️ MEDIUM Issues

#### 6. **No Password Reset Functionality**

**Current**: "Forgot password" button shows alert
**Impact**: Users locked out of accounts permanently

**Evidence**:

```typescript
// src/components/auth/SignInForm.tsx
onClick={() => {
  // TODO: Implement forgot password functionality
  alert("Forgot password functionality coming soon!");
}}
```

#### 7. **No Multi-Factor Authentication (MFA)**

**Impact**: Single point of failure if credentials compromised

#### 8. **No Session Device Tracking**

**Current**: No way to see where user is logged in
**Impact**: Cannot detect suspicious logins or revoke specific devices

#### 9. **Incomplete Audit Logging**

**Current**: Basic auth events logged, but not comprehensive
**Missing**:

- Failed login attempts with IP tracking
- Password changes
- Email changes
- Role escalations

#### 10. **No CSRF Protection on Custom Routes**

**Current**: NextAuth handles its own, but custom auth routes don't have explicit CSRF tokens
**Risk**: Form submission attacks on signup/account endpoints

### ⚠️ LOW Issues

#### 11. **Password Hash Rounds**

**Current**: bcrypt with 10 rounds
**Recommendation**: Increase to 12-14 rounds for better security

#### 12. **No Rate Limiting on Signup**

**Current**: Only on sign-in and API endpoints
**Impact**: Spam registrations possible

#### 13. **OAuth Callback URL Not Validated**

**Current**: Using NextAuth defaults
**Recommendation**: Explicitly whitelist callback URLs

---

## 🛠️ Proposed Improvements

### Priority 1: Critical Security (Implement Immediately)

#### 1.1 Email Verification System

**Implementation Plan**:

```typescript
// prisma/schema.prisma - Add verification fields
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  emailVerified       DateTime?
  emailVerificationToken String?   @unique
  emailVerificationExpires DateTime?
  // ... existing fields
}

// New API route: /api/auth/send-verification
export async function POST(req: Request) {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerified) {
    // Don't reveal if email exists
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
  });

  // Send email with verification link
  await sendVerificationEmail(email, token);

  return NextResponse.json({ ok: true });
}

// New API route: /api/auth/verify-email
export async function POST(req: Request) {
  const { token } = await req.json();

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return NextResponse.json({ ok: true });
}
```

**Changes to Signup Flow**:

```typescript
// src/app/api/auth/signup/route.ts
const user = await prisma.user.create({
  data: {
    ...createData,
    emailVerified: null, // Not verified yet
  },
});

// Send verification email
await sendVerificationEmail(email, verificationToken);

return NextResponse.json({
  ok: true,
  id: user.id,
  message: "Check your email to verify your account",
});
```

**Changes to Middleware**:

```typescript
// src/middleware.ts
const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
const user = await prisma.user.findUnique({
  where: { id: token.id },
  select: { emailVerified: true },
});

if (!user?.emailVerified) {
  return NextResponse.redirect(new URL("/auth/verify-email", req.url));
}
```

#### 1.2 Remove `allowDangerousEmailAccountLinking`

**Implementation**:

```typescript
// src/lib/auth.ts
GoogleProvider({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: false, // ✅ SAFE
})

// Add callback to handle linking safely
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.type === "oauth") {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        // Check if this OAuth provider is already linked
        const linkedAccount = await prisma.account.findFirst({
          where: {
            userId: existingUser.id,
            provider: account.provider,
          },
        });

        if (!linkedAccount) {
          // Email exists but OAuth not linked - block and notify
          logger.warn("oauth_link_attempt_blocked", {
            email: user.email,
            provider: account.provider,
          });
          return "/auth/link-account?error=AccountExists";
        }
      }
    }
    return true;
  }
}
```

#### 1.3 Strong Password Requirements

**Implementation**:

```typescript
// src/lib/password.ts
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain special character");
  }

  // Check against common passwords
  const commonPasswords = [
    "password",
    "password123",
    "12345678",
    "qwerty",
    "abc123",
    "monkey",
    "letmein",
    "welcome",
  ];

  if (commonPasswords.some((p) => password.toLowerCase().includes(p))) {
    errors.push("Password is too common");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Increase bcrypt rounds
const passwordHash = await hash(password, 12); // Was 10, now 12
```

**UI Updates**:

```typescript
// src/components/auth/PasswordStrengthIndicator.tsx
export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { valid, errors } = validatePassword(password);
  const score = calculateScore(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              score >= i ? strengthColor(score) : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <ul className="text-xs space-y-1">
        {errors.map((err) => (
          <li key={err} className="text-red-600">
            ❌ {err}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### 1.4 Account Lockout System

**Implementation**:

```typescript
// prisma/schema.prisma
model User {
  // ... existing fields
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  lastFailedLogin      DateTime?
}

// src/lib/accountLockout.ts
export async function checkAccountLockout(userId: string): Promise<{
  locked: boolean;
  remainingTime?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return {
      locked: true,
      remainingTime: user.lockedUntil.getTime() - Date.now(),
    };
  }

  // Clear lockout if expired
  if (user?.lockedUntil) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  }

  return { locked: false };
}

export async function recordFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lastFailedLogin: true },
  });

  const attempts = (user?.failedLoginAttempts || 0) + 1;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  // Reset counter if last attempt was > 1 hour ago
  const shouldReset = user?.lastFailedLogin &&
    Date.now() - user.lastFailedLogin.getTime() > 60 * 60 * 1000;

  if (shouldReset) {
    attempts = 1;
  }

  const updateData: any = {
    failedLoginAttempts: attempts,
    lastFailedLogin: new Date(),
  };

  if (attempts >= MAX_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    logger.warn("account_locked", { userId, attempts });
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return { locked: attempts >= MAX_ATTEMPTS, attempts };
}

export async function clearFailedLogins(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lastFailedLogin: null,
    },
  });
}
```

**Integration with Auth**:

```typescript
// src/lib/auth.ts - Update credentials provider
async authorize(credentials) {
  if (!credentials?.email || !credentials.password) return null;

  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user) return null;

  // Check if account is locked
  const lockStatus = await checkAccountLockout(user.id);
  if (lockStatus.locked) {
    throw new Error(`Account locked. Try again in ${Math.ceil(lockStatus.remainingTime! / 60000)} minutes.`);
  }

  if (!user.passwordHash) return null;

  const valid = await bcrypt.compare(credentials.password, user.passwordHash);

  if (!valid) {
    await recordFailedLogin(user.id);
    return null;
  }

  // Success - clear failed attempts
  await clearFailedLogins(user.id);

  return { id: user.id, email: user.email, name: user.name };
}
```

#### 1.5 Database Sessions with Refresh Tokens

**Why**: Current JWT-only approach cannot be revoked server-side

**Implementation**:

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database", // Changed from "jwt"
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },
  // ... rest of config
};
```

**Add session management API**:

```typescript
// src/app/api/auth/sessions/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      expires: true,
      sessionToken: true, // Last 8 chars only
    },
    orderBy: { expires: "desc" },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      expires: s.expires,
      current:
        s.sessionToken === req.cookies.get("next-auth.session-token")?.value,
    })),
  });
}

// Revoke specific session
export async function DELETE(req: Request) {
  const { sessionId } = await req.json();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session belongs to user
  await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
```

### Priority 2: Important Features (Implement Soon)

#### 2.1 Password Reset Flow

**Implementation**:

```typescript
// prisma/schema.prisma
model User {
  // ... existing fields
  resetPasswordToken   String?   @unique
  resetPasswordExpires DateTime?
}

// src/app/api/auth/forgot-password/route.ts
export async function POST(req: Request) {
  const { email } = await req.json();

  // Rate limit to prevent abuse
  const rl = await rateLimit({
    key: `forgot-password:${email}`,
    windowMs: 60_000,
    max: 3,
  });

  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal if user exists
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    },
  });

  await sendPasswordResetEmail(email, token);

  logger.info("password_reset_requested", { userId: user.id });

  return NextResponse.json({ ok: true });
}

// src/app/api/auth/reset-password/route.ts
export async function POST(req: Request) {
  const { token, password } = await req.json();

  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.valid) {
    return NextResponse.json({
      error: "Weak password",
      details: validation.errors
    }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({
      error: "Invalid or expired reset token"
    }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      failedLoginAttempts: 0, // Clear lockout
      lockedUntil: null,
    },
  });

  // Invalidate all sessions for security
  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  logger.info("password_reset_completed", { userId: user.id });

  return NextResponse.json({ ok: true });
}
```

#### 2.2 Multi-Factor Authentication (MFA/2FA)

**Implementation**:

```typescript
// prisma/schema.prisma
model User {
  // ... existing fields
  mfaEnabled           Boolean   @default(false)
  mfaSecret            String?   // Encrypted TOTP secret
  mfaBackupCodes       String[]  // Encrypted backup codes
  mfaVerified          Boolean   @default(false)
}

// Use library: @otplib/preset-default
import { authenticator } from "@otplib/preset-default";

// src/app/api/auth/mfa/setup/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate secret
  const secret = authenticator.generateSecret();
  const qrCode = await authenticator.keyuri(
    session.user.email,
    "FishOn Captain",
    secret
  );

  // Generate 10 backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomUUID().slice(0, 8).toUpperCase()
  );

  // Store encrypted
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaSecret: encrypt(secret),
      mfaBackupCodes: backupCodes.map(encrypt),
      mfaEnabled: false, // Not enabled until verified
    },
  });

  return NextResponse.json({
    secret,
    qrCode,
    backupCodes,
  });
}

// src/app/api/auth/mfa/verify/route.ts
export async function POST(req: Request) {
  const { code } = await req.json();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true },
  });

  if (!user?.mfaSecret) {
    return NextResponse.json({ error: "MFA not set up" }, { status: 400 });
  }

  const secret = decrypt(user.mfaSecret);
  const valid = authenticator.verify({ token: code, secret });

  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Enable MFA
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      mfaVerified: true,
    },
  });

  logger.info("mfa_enabled", { userId: session.user.id });

  return NextResponse.json({ ok: true });
}
```

**Integration with Sign-In**:

```typescript
// src/lib/auth.ts - Add MFA check to callbacks
callbacks: {
  async signIn({ user }) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    });

    if (dbUser?.mfaEnabled) {
      // Redirect to MFA verification page
      return "/auth/mfa-challenge?userId=" + user.id;
    }

    return true;
  }
}
```

#### 2.3 Comprehensive Audit Logging

**Implementation**:

```typescript
// prisma/schema.prisma
model SecurityEvent {
  id        String   @id @default(cuid())
  userId    String?
  eventType String   // login_success, login_failed, password_changed, etc.
  ipAddress String?
  userAgent String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([eventType, createdAt])
}

// src/lib/securityLogger.ts
export async function logSecurityEvent(params: {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  req?: Request;
}) {
  const ipAddress = params.ipAddress ||
    params.req?.headers.get("x-forwarded-for") ||
    params.req?.headers.get("x-real-ip");

  const userAgent = params.userAgent ||
    params.req?.headers.get("user-agent");

  await prisma.securityEvent.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      ipAddress,
      userAgent,
      metadata: params.metadata || {},
    },
  });

  logger.info("security_event", {
    userId: params.userId,
    eventType: params.eventType,
    ipAddress,
  });
}

// Usage in auth flows
await logSecurityEvent({
  userId: user.id,
  eventType: "login_success",
  req,
  metadata: { provider: "credentials" },
});

await logSecurityEvent({
  userId: user.id,
  eventType: "password_changed",
  req,
  metadata: { method: "reset_token" },
});
```

#### 2.4 Rate Limiting on Signup

**Implementation**:

```typescript
// src/app/api/auth/signup/route.ts
export async function POST(req: Request) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = await rateLimit({
    key: `signup:${ip}`,
    windowMs: 60_000,
    max: 3, // 3 signups per minute per IP
  });

  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many signups" }, { status: 429 });
  }

  // ... rest of signup logic
}
```

### Priority 3: Nice to Have (Future Enhancements)

#### 3.1 Social Account Linking UI

Allow users to link multiple OAuth providers to one account safely.

#### 3.2 Login History Dashboard

Show users where they've logged in from (device, location, time).

#### 3.3 Suspicious Activity Alerts

Email users when login from new device/location detected.

#### 3.4 Passkey/WebAuthn Support

Modern passwordless authentication using biometrics or security keys.

#### 3.5 Session Management UI

Allow users to view and revoke active sessions from different devices.

---

## 📦 Required Dependencies

```bash
# For MFA
npm install @otplib/preset-default qrcode

# For encryption
npm install @node-rs/argon2
# or
npm install crypto-js

# For email
npm install nodemailer
# or use service like Resend, SendGrid
npm install resend
```

---

## 🗓️ Implementation Roadmap

### Week 1: Critical Security

- [ ] Remove `allowDangerousEmailAccountLinking`
- [ ] Implement email verification
- [ ] Add strong password requirements
- [ ] Implement account lockout

### Week 2: Infrastructure

- [ ] Switch to database sessions
- [ ] Implement password reset flow
- [ ] Add comprehensive audit logging
- [ ] Add rate limiting to signup

### Week 3: Advanced Features

- [ ] Implement MFA/2FA
- [ ] Build session management UI
- [ ] Add login history
- [ ] Create security settings page

### Week 4: Testing & Documentation

- [ ] Write security tests
- [ ] Penetration testing
- [ ] Update documentation
- [ ] Security audit

---

## 🧪 Testing Checklist

### Security Tests to Add

```typescript
// __tests__/auth/security.test.ts

describe("Authentication Security", () => {
  test("should reject weak passwords", async () => {
    const result = validatePassword("password");
    expect(result.valid).toBe(false);
  });

  test("should lock account after 5 failed attempts", async () => {
    // Attempt login 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      await attemptLogin(email, "wrongpassword");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user.lockedUntil).toBeTruthy();
  });

  test("should require email verification before login", async () => {
    const user = await createUser({ emailVerified: null });
    const result = await attemptLogin(user.email, user.password);
    expect(result.error).toBe("Email not verified");
  });

  test("should invalidate all sessions on password reset", async () => {
    const token = await createResetToken(user.id);
    await resetPassword(token, "NewPassword123!");

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(0);
  });

  test("MFA should be required when enabled", async () => {
    await enableMFA(user.id);
    const result = await attemptLogin(user.email, user.password);
    expect(result.requiresMFA).toBe(true);
  });
});
```

---

## 📝 Configuration Updates

### Environment Variables to Add

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@fishon.my

# Or use Resend
RESEND_API_KEY=re_xxx

# Session Configuration
SESSION_MAX_AGE=2592000  # 30 days in seconds

# MFA Configuration
MFA_ISSUER=FishOn Captain

# Security
LOCKOUT_DURATION_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=12
```

---

## 🚨 Breaking Changes

### For Users

1. **Email Verification Required**: Existing users will need to verify emails
2. **Password Reset**: Users with weak passwords should update them
3. **Session Invalidation**: Switching to database sessions will log everyone out once

### Migration Plan

```typescript
// Migration script: verify-existing-users.ts
async function migrateExistingUsers() {
  // Auto-verify OAuth users
  await prisma.user.updateMany({
    where: {
      passwordHash: null,
      emailVerified: null,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  // Send verification emails to credential users
  const unverifiedUsers = await prisma.user.findMany({
    where: {
      passwordHash: { not: null },
      emailVerified: null,
    },
  });

  for (const user of unverifiedUsers) {
    await sendVerificationEmail(user.email, generateToken());
  }
}
```

---

## 📊 Success Metrics

Track these metrics after implementation:

1. **Security**

   - Number of failed login attempts per day
   - Number of accounts locked per day
   - Password reset requests per day
   - MFA adoption rate

2. **User Experience**

   - Time to complete verification
   - Password reset completion rate
   - Login success rate
   - OAuth vs credentials usage

3. **System**
   - Average auth endpoint response time
   - Rate limit hits per endpoint
   - Session database size growth

---

## 🔗 References

- [NextAuth.js Best Practices](https://next-auth.js.org/configuration/options)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Status**: ✅ Analysis Complete - Ready for Implementation  
**Priority**: 🔴 HIGH - Security vulnerabilities identified  
**Estimated Effort**: 3-4 weeks for full implementation  
**Next Step**: Review with team and prioritize implementation order
