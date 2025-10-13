# Authentication Architecture Redesign

> **Status**: ✅ APPROVED - Implementing Solution A  
> **Created**: 2025-10-13  
> **Decision Date**: 2025-10-13  
> **Context**: User identified fundamental flaws in current MFA-OAuth integration

## 🎯 Implementation Decision

**Chosen Approach**: **Solution A** (Split MFA by Authentication Method)

**User Requirements**:

1. ✅ Implement password-specific MFA (rename fields)
2. ✅ Show **notice/declaration** for OAuth users in MFA setup section (don't hide)
3. ✅ Show **notice/declaration** for OAuth users in change password section (don't hide)
4. ✅ Plan for future Solution C implementation (multi-step flow)

**Rationale**:

- Quick fix for immediate bugs
- Clear separation: Password MFA vs Provider MFA
- Better UX with notices instead of hiding features
- Foundation for future progressive flow (Solution C)

## 🎯 Problem Statement

The current authentication system has **architectural incompatibilities** between MFA and OAuth:

### Current Issues

1. **Blocking OAuth users with MFA enabled**

   - OAuth providers (Google/Facebook/Apple) handle their own authentication
   - Blocking them breaks the user experience
   - Forces users to set passwords for OAuth accounts (security antipattern)

2. **Exposed MFA setup for OAuth-only users**

   - Settings page shows MFA setup to all authenticated users
   - OAuth-only users shouldn't see password-based MFA options
   - No visual indication of account type

3. **Password change accessible to OAuth users**

   - Settings page allows OAuth users to access password change
   - OAuth users have no password to change
   - Should either hide or redirect

4. **Manual database editing required**

   - User has to manually set `mfaEnabled=false` to test OAuth
   - No admin UI or safe way to toggle MFA for testing
   - Error-prone and not production-ready

5. **Inconsistent authentication flow**
   - Credentials provider: email → password → MFA
   - OAuth providers: direct authentication (no MFA step possible mid-flow)
   - No unified multi-step flow like modern auth systems

## 🏆 Industry Best Practices

### Example: Zoho Mail Authentication

**Multi-step progressive authentication:**

```
Step 1: Email Input
  ↓
Step 2: Authentication Method Selection
  ↓ (if email/password selected)
Step 3: Password Input
  ↓ (if MFA enabled)
Step 4: MFA Challenge (e.g., OneAuth)
```

**Key Features:**

- ✅ Email-first approach (check account existence)
- ✅ Show available auth methods after email validation
- ✅ OAuth and MFA can coexist
- ✅ MFA applies to account, not just password login
- ✅ Clear visual flow, no confusion

### How Other Apps Handle OAuth + MFA

#### Option 1: Provider-Level MFA (Recommended)

- User enables MFA at OAuth provider (Google 2FA, Apple 2FA)
- Application trusts provider's authentication
- Application MFA only applies to email/password
- **Pros**: Simple, secure, no conflicts
- **Cons**: Can't enforce MFA across all login methods

#### Option 2: Post-Authentication MFA

- User completes OAuth login
- If account has MFA enabled, challenge with TOTP after OAuth
- Session not created until MFA verified
- **Pros**: Consistent MFA enforcement
- **Cons**: Complex flow, extra step after provider auth

#### Option 3: Account-Linking Only

- OAuth users cannot enable app-level MFA
- Must set password first, then MFA becomes available
- Clear separation: OAuth users vs. Password users
- **Pros**: Simple logic, no conflicts
- **Cons**: Limits security for OAuth users

## 🔍 Current Architecture Analysis

### Database Schema (Relevant Models)

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String?   // NULL for OAuth-only users

  // MFA fields
  mfaEnabled   Boolean   @default(false)
  mfaMethod    MfaMethod? // 'TOTP' | 'WHATSAPP' | 'SMS'
  mfaSecret    String?    // Encrypted TOTP secret
  mfaBackupCodes String[] @default([])

  // Relations
  accounts     Account[] // OAuth provider accounts

  // ... other fields
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth" for social logins
  provider          String  // "google" | "facebook" | "apple"
  providerAccountId String
  access_token      String?
  refresh_token     String?
  // ... OAuth fields

  user              User    @relation(...)
  @@unique([provider, providerAccountId])
}
```

**Key Observations:**

1. `passwordHash` can be NULL → user might be OAuth-only
2. `mfaEnabled` is per User, not per authentication method
3. `Account` table tracks which providers user has connected
4. No field to indicate "primary authentication method"

### Current Authentication Flow

```typescript
// src/lib/auth.ts - Credentials Provider
authorize(credentials) {
  // 1. Check if user exists
  // 2. Verify password
  // 3. Check if mfaEnabled
  // 4. If MFA: throw error with token → client redirects
  // 5. If no MFA: return user → session created
}

// signIn callback (OAuth)
signIn({ user, account }) {
  // 1. Check if OAuth account
  // 2. Check if user has mfaEnabled
  // 3. If mfaEnabled: return false → blocks sign-in
  // 4. Otherwise: allow
}
```

**Problems:**

- MFA check happens **during** OAuth callback (too late)
- Blocking OAuth breaks NextAuth flow (shows error page)
- No way to challenge MFA after OAuth completes
- Credentials flow works but OAuth doesn't

### UI/UX Issues

#### Sign-In Page (`/auth?mode=signin`)

```tsx
// Current structure:
1. OAuth buttons (Google, Facebook, Apple)
2. Divider "Or use email"
3. Email + Password form
4. Sign in button
```

**Problems:**

- No indication if email is OAuth-only before submission
- User might try password when they should use OAuth button
- No progressive disclosure based on account type

#### Settings Page (MFA Setup)

```tsx
// Accessible to all authenticated users
- Enable MFA toggle
- QR code generation
- Backup codes download
```

**Problems:**

- Shown to OAuth users who shouldn't use password-based MFA
- No check for `passwordHash` existence
- No warning that OAuth won't be protected

#### Settings Page (Change Password)

```tsx
// Accessible to all authenticated users
- Current password
- New password
- Confirm password
```

**Problems:**

- Shown to OAuth users with no password
- Should check for `passwordHash` and hide/redirect

## 🎨 Proposed Solutions

### Solution A: Split MFA by Authentication Method (Recommended)

**Concept**: MFA only applies to email/password login. OAuth users rely on provider MFA.

#### Database Changes

```prisma
model User {
  // ... existing fields

  // Make MFA specific to password auth
  passwordMfaEnabled Boolean @default(false) // Rename from mfaEnabled
  passwordMfaMethod  MfaMethod? // Only for password users
  passwordMfaSecret  String?
  passwordMfaBackupCodes String[] @default([])

  // Track primary auth method (optional)
  primaryAuthMethod  String? // "password" | "oauth"
}
```

#### Flow Changes

1. **Sign-In Flow**

   ```
   User enters email → Check account type

   If OAuth-only:
     → Show "Continue with Google" (matched provider)
     → Hide password form

   If has password:
     → Show password input
     → After password: Check passwordMfaEnabled
     → If enabled: Redirect to MFA challenge

   If both (linked accounts):
     → Show all options
   ```

2. **OAuth Flow** (No changes needed)

   ```
   User clicks "Google" → OAuth redirect → Callback → Session created
   (No MFA check, relies on Google's own 2FA)
   ```

3. **Settings Page**

   ```typescript
   // Conditional rendering based on passwordHash

   if (session.user.passwordHash) {
     // Show password-based MFA setup
     // Show change password
   } else {
     // Show message: "You signed in with Google"
     // Show "Set Password" option (to enable MFA later)
   }
   ```

#### Implementation Checklist

- [ ] Database migration: Rename `mfaEnabled` → `passwordMfaEnabled`
- [ ] Update all MFA checks to use new field name
- [ ] Remove OAuth blocking in `signIn` callback
- [ ] Add `passwordHash` check in Settings components
- [ ] Add account type detection in SignInForm
- [ ] Update documentation

#### Pros & Cons

**Pros:**

- ✅ Simple mental model: Password MFA vs. Provider MFA
- ✅ No complex post-OAuth flows
- ✅ OAuth users get seamless experience
- ✅ Backward compatible (just rename field)

**Cons:**

- ❌ Can't enforce MFA for OAuth users
- ❌ Users might be confused about different MFA levels
- ❌ Security-conscious users may want MFA on all methods

---

### Solution B: Post-OAuth MFA Challenge (Advanced)

**Concept**: After successful OAuth, check if account has MFA. If yes, require additional TOTP challenge.

#### Database Changes

```prisma
model User {
  // Keep current structure, mfaEnabled applies to ALL auth methods
  mfaEnabled Boolean @default(false)

  // Add session tracking for two-step auth
  pendingOAuthSessions PendingOAuthSession[]
}

model PendingOAuthSession {
  id        String   @id @default(cuid())
  userId    String
  provider  String   // "google" | "facebook" | "apple"
  token     String   @unique // Temporary token
  expiresAt DateTime
  user      User     @relation(...)

  @@index([token, expiresAt])
}
```

#### Flow Changes

1. **OAuth Flow with MFA**

   ```
   User clicks "Google"
     → OAuth redirect
     → Callback receives user
     → Check if user.mfaEnabled = true

   If mfaEnabled:
     → Create pendingOAuthSession (temp token)
     → Redirect to /auth/mfa-challenge?oauthToken=xxx
     → User enters TOTP/backup code
     → Verify code
     → Complete session creation

   If not mfaEnabled:
     → Create session directly
   ```

2. **MFA Challenge Page** (Enhanced)

   ```tsx
   // Detect if coming from OAuth or password

   const isOAuth = searchParams.has("oauthToken");

   if (isOAuth) {
     // Show: "Complete authentication for your Google account"
     // Verify against pendingOAuthSession
   } else {
     // Show: "Enter your authentication code"
     // Verify against MFA pending session (password flow)
   }
   ```

#### Implementation Checklist

- [ ] Create `PendingOAuthSession` model
- [ ] Modify `signIn` callback to create pending session if MFA enabled
- [ ] Update MFA challenge page to handle OAuth tokens
- [ ] Create `/api/auth/mfa/verify-oauth` endpoint
- [ ] Add cleanup job for expired pending sessions
- [ ] Update documentation

#### Pros & Cons

**Pros:**

- ✅ Consistent MFA enforcement across all methods
- ✅ Highest security (MFA always required)
- ✅ User has one MFA setup for everything

**Cons:**

- ❌ Complex implementation
- ❌ Extra step after OAuth (friction)
- ❌ NextAuth callback modification needed
- ❌ Pending session management overhead

---

### Solution C: Email-First Progressive Flow (Like Zoho)

**Concept**: Multi-step authentication with method selection.

#### UI Flow

```
Step 1: Email Input
  ↓ (Check account on submit)

Step 2: Method Selection
  [Email/Password Button]
  [Continue with Google]  (if account linked)
  [Continue with Facebook] (if account linked)

  ↓ (User selects Email/Password)

Step 3: Password Input
  ↓ (After password verification)

Step 4: MFA Challenge (if enabled)
```

#### Database Changes

```prisma
model User {
  // ... existing fields

  // Track which providers are linked
  // (Already available via Account relation)

  // Track preferred authentication method
  preferredAuthMethod String? // "password" | "google" | "facebook"
}
```

#### Implementation Checklist

- [ ] Create multi-step form component
- [ ] Add `/api/auth/check-account` endpoint (returns linked providers)
- [ ] Design method selection UI
- [ ] Update sign-in flow to use steps
- [ ] Add "Remember my method" preference
- [ ] Handle back navigation between steps

#### Pros & Cons

**Pros:**

- ✅ Best UX - clear, guided flow
- ✅ Reduces confusion about OAuth vs. password
- ✅ Can show only available methods
- ✅ Modern pattern (industry standard)

**Cons:**

- ❌ Significant UI/UX redesign
- ❌ More API endpoints needed
- ❌ State management complexity
- ❌ Doesn't solve OAuth + MFA question

---

## 📊 Comparison Matrix

| Aspect                     | Solution A                  | Solution B          | Solution C                  |
| -------------------------- | --------------------------- | ------------------- | --------------------------- |
| **Complexity**             | Low                         | High                | Medium                      |
| **Security**               | Medium (provider-dependent) | High (enforced MFA) | Medium (provider-dependent) |
| **UX Friction**            | Low                         | Medium (extra step) | Low (guided)                |
| **OAuth Experience**       | Seamless                    | Extra step          | Seamless                    |
| **Implementation Time**    | 2-3 days                    | 1-2 weeks           | 1 week                      |
| **Maintenance**            | Low                         | Medium              | Medium                      |
| **Backward Compatibility** | High (rename only)          | Low (new tables)    | Medium (UI rewrite)         |

## 🎯 Recommendation

### Short Term: **Solution A** (Split MFA by Method)

**Rationale:**

1. Fixes immediate problems (OAuth blocking, settings page)
2. Low complexity, quick implementation
3. Aligns with industry standard (provider MFA vs. app MFA)
4. Doesn't break existing flows

**Action Items:**

1. Rename `mfaEnabled` → `passwordMfaEnabled` (breaking change, needs migration)
2. Add conditional rendering in Settings based on `passwordHash`
3. Remove OAuth blocking logic
4. Update documentation with clear explanation
5. Add user-facing messages about provider MFA

### Long Term: **Solution C** (Email-First Flow)

**Rationale:**

1. Better UX matches modern standards (Zoho, Microsoft, etc.)
2. Reduces user confusion
3. Can be implemented after Solution A stabilizes
4. Doesn't require reworking MFA logic

**Action Items:**

1. Design multi-step form prototype
2. User testing on account type detection
3. Implement progressive disclosure
4. A/B test against current flow

### Optional: **Solution B** (If High Security Required)

**When to consider:**

- If business requirements mandate MFA for all users
- If compliance requires MFA enforcement
- If user base is security-conscious (enterprise)

**Prerequisites:**

- Complete Solution A first
- Test OAuth flow extensively
- Plan session management strategy

## 🚧 Migration Plan (Solution A)

### Phase 1: Database Migration

```sql
-- Rename MFA fields to be password-specific
ALTER TABLE "User"
  RENAME COLUMN "mfaEnabled" TO "passwordMfaEnabled";

ALTER TABLE "User"
  RENAME COLUMN "mfaMethod" TO "passwordMfaMethod";

ALTER TABLE "User"
  RENAME COLUMN "mfaSecret" TO "passwordMfaSecret";

ALTER TABLE "User"
  RENAME COLUMN "mfaBackupCodes" TO "passwordMfaBackupCodes";

-- Add helpful query to find OAuth-only users
-- SELECT id, email FROM "User" WHERE "passwordHash" IS NULL;
```

### Phase 2: Code Updates

1. **Global Find/Replace**

   ```
   mfaEnabled → passwordMfaEnabled
   mfaMethod → passwordMfaMethod
   mfaSecret → passwordMfaSecret
   mfaBackupCodes → passwordMfaBackupCodes
   ```

2. **Remove OAuth Blocking** (`src/lib/auth.ts`)

   ```typescript
   // DELETE THIS BLOCK:
   if (account?.type === "oauth" && user?.id) {
     const userRecord = await prisma.user.findUnique({
       where: { id: user.id },
       select: { mfaEnabled: true, passwordHash: true },
     });

     if (userRecord?.mfaEnabled) {
       return false; // ← Remove blocking
     }
   }
   ```

3. **Add Settings Guards**

   ```typescript
   // src/app/settings/security/page.tsx

   const session = await getServerSession(authOptions);
   const user = await prisma.user.findUnique({
     where: { id: session.user.id },
     select: { passwordHash: true, accounts: true },
   });

   const hasPassword = Boolean(user.passwordHash);
   const oauthProviders = user.accounts.map((a) => a.provider);
   ```

### Phase 3: UI Updates

1. **Settings Page** - Conditional MFA Section
2. **Settings Page** - Conditional Change Password
3. **Sign-In Page** - OAuth-only detection (optional, can be Phase 4)

### Phase 4: Documentation

1. Update `docs/guides/MFA_OAUTH_USERS.md`
2. Create user-facing FAQ about MFA + OAuth
3. Update API documentation
4. Create admin guide for troubleshooting

## 🔒 Security Considerations

### Solution A Risks

1. **OAuth users have no app-level MFA**

   - Mitigation: Encourage users to enable provider 2FA
   - Document: Add help text linking to Google/Facebook/Apple 2FA setup

2. **User might not realize OAuth doesn't use app MFA**

   - Mitigation: Clear messaging in settings
   - Show badge: "Protected by Google 2FA" if provider supports it

3. **Password can be set later, changing security model**
   - Mitigation: Prompt for MFA setup when password is first set
   - Log: Audit log when auth method changes

### Solution B Risks

1. **Session management complexity**

   - Mitigation: Expiry on pending sessions (10 minutes)
   - Cleanup job to remove expired sessions

2. **Race conditions during OAuth callback**
   - Mitigation: Atomic token generation
   - Rate limit MFA verification endpoint

## 📚 Related Documentation

- [Current Auth System Analysis](./AUTH_SYSTEM_ANALYSIS_AND_IMPROVEMENTS.md)
- [MFA OAuth Users Guide](./MFA_OAUTH_USERS.md) (needs update after migration)
- [MFA Setup Guide](./MFA_SETUP_TWO_STEP_PROCESS.md)
- [Password History](./AUTH_IMPROVEMENTS_SUMMARY.md)

## 💬 Discussion Questions

1. **Should OAuth users be allowed to set passwords?**

   - Current: Yes (via `/api/auth/set-password`)
   - Proposed: Keep, but prompt for MFA setup afterward

2. **Should we add "primary authentication method" tracking?**

   - Useful for UX (auto-show preferred method)
   - Adds complexity to account linking

3. **How to handle account linking (multiple providers)?**

   - User has Google + email/password
   - Should MFA apply to both? Only password?
   - Solution A: Only password
   - Solution B: Both

4. **Admin override for MFA (emergency access)?**
   - Staff might need to disable user's MFA
   - Audit log critical for compliance

## ✅ Next Steps

**Immediate (This Session):**

1. ✅ Document current architecture (this file)
2. ✅ Propose solutions with trade-offs
3. 🔄 **Discuss with user** - get decision on approach
4. ⏳ Begin implementation based on choice

**After Decision:**

1. Create detailed implementation checklist
2. Write Prisma migration
3. Create feature branch for changes
4. Implement + test each phase
5. Update documentation
6. Deploy with rollback plan

---

**Last Updated**: 2025-10-13  
**Status**: Awaiting user decision on solution approach  
**Contact**: Review in context of this PR/issue
