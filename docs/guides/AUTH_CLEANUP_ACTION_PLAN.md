# Auth System Cleanup Action Plan

**Date**: October 13, 2025  
**Issue**: Major auth rebuild caused breaking changes, deployment failures, and lost MFA work  
**Status**: 🚨 CRITICAL - Production deployment blocked

---

## 🔍 Problem Summary

After commit `563d7e9` ("adding major auth improvement"), the application has multiple critical issues:

1. **❌ Non-working verify OTP method** - Parameter order mismatch in email functions
2. **❌ Non-working forgot password process** - Same parameter issue + flow breaks
3. **❌ Non-sync password hash** - Needs verification
4. **❌ Rebuilt components don't use current app style** - Inconsistent UI
5. **❌ Poor wording in rebuilt components** - UX issues
6. **❌ Wrong redirect links** - Broken user flows
7. **❌ Wrong paths on most new links** - Navigation failures
8. **❌ Type errors blocking Vercel deployment** - Build fails

---

## 🎯 Critical Issues Found

### 1. Email Function Parameter Order Mismatch 🔥

**Problem**: Email functions have signature mismatch across codebase

**Expected Signature** (from `src/lib/email.ts`):

```typescript
sendVerificationOTP(email: string, firstName: string, code: string)
sendPasswordResetOTP(email: string, firstName: string, code: string)
```

**Wrong Usage Found**:

❌ **`src/app/api/auth/resend-otp/route.ts:93`**

```typescript
await sendVerificationOTP(
  user.email!,
  otpResult.code, // ❌ WRONG - code in position 2
  user.name || "User" // ❌ WRONG - name in position 3
);
```

❌ **`src/app/api/auth/resend-otp/route.ts:99`**

```typescript
await sendPasswordResetOTP(
  user.email!,
  otpResult.code, // ❌ WRONG - code in position 2
  user.name || "User" // ❌ WRONG - name in position 3
);
```

❌ **`src/app/api/auth/forgot-password/route.ts:104`**

```typescript
await sendPasswordResetOTP(
  user.email!,
  user.name || "User", // ✅ Correct position
  otpResult.code // ✅ Correct position
);
```

✅ **`src/app/api/auth/signup/route.ts:113`** (CORRECT)

```typescript
const emailSent = await sendVerificationOTP(
  user.email,
  user.firstName || "there",
  otpResult.code
);
```

**Impact**:

- OTP codes being sent as names
- Names being sent as OTP codes
- Users cannot verify email
- Password reset completely broken

**Fix Priority**: 🔥 CRITICAL - Must fix immediately

---

### 2. Missing MFA Complete Route 🔥

**Problem**: Documented in `MFA_NEXTAUTH_INTEGRATION.md` but NOT implemented

**Expected File**: `src/app/api/auth/mfa/complete/route.ts`  
**Status**: ❌ DOES NOT EXIST

**Documentation Reference**: `docs/api/MFA_NEXTAUTH_INTEGRATION.md:122`

```typescript
// Created `/api/auth/mfa/complete`
// File: `src/app/api/auth/mfa/complete/route.ts`
// Features:
// - Accepts `mfaToken` in POST body
// - Verifies token via `verifyMFAPendingSession()`
// - Checks user still exists and has MFA enabled
// - Returns user email for sign-in completion
```

**Impact**:

- MFA login flow completely broken
- Users with MFA enabled cannot sign in
- `/auth/mfa-complete` page references non-existent API

**Fix Priority**: 🔥 CRITICAL - MFA feature non-functional

---

### 3. Incomplete NextAuth MFA Integration

**Problem**: `src/lib/auth.ts` missing MFA checks documented in rebuild

**Expected Changes** (from `MFA_NEXTAUTH_INTEGRATION.md`):

❌ **Missing: MFA Detection in Credentials Provider**

```typescript
// Should throw "MFA_REQUIRED:{token}" when mfaEnabled
// Should create temporary MFA session token
// Should accept pre-verified MFA sessions
```

❌ **Missing: JWT Callback Updates**

```typescript
// Should add `mfaEnabled`, `mfaMethod` to JWT token
```

❌ **Missing: Session Callback Updates**

```typescript
// Should expose `mfaEnabled`, `mfaMethod` in session object
```

**Current State**: `src/lib/auth.ts` has NO MFA logic whatsoever

**Impact**:

- MFA never triggers during login
- Users with MFA can bypass it with regular password
- Security vulnerability

**Fix Priority**: 🔥 CRITICAL - Security issue

---

### 4. Verify OTP Flow Issues

**Problem**: Component expects `/api/auth/resend-otp` but implementation has bugs

**File**: `src/app/(auth)/verify-otp/page.tsx`

**Issues**:

1. ✅ Calls `/api/auth/verify-otp` correctly
2. ✅ Calls `/api/auth/resend-otp` correctly
3. ❌ Resend API has wrong parameter order (Issue #1)
4. ⚠️ Redirect logic may have wrong paths

**Redirect Analysis**:

```typescript
// Line 76: Password reset redirect
if (purpose === "password_reset" && callbackUrl.includes("reset-password")) {
  const resetUrl = `${callbackUrl}?email=${encodeURIComponent(email)}`;
  router.push(resetUrl);
} else {
  router.push(callbackUrl);
}
```

**Expected Flow**:

```
/forgot-password
  → /verify-otp?email=X&purpose=password_reset&callbackUrl=/reset-password
  → /reset-password?email=X
```

**Status**: ⚠️ Redirect logic looks OK, but test after fixing email params

---

### 5. Forgot Password Link Path Issues

**Problem**: Components may have wrong paths to forgot password page

**Expected Path**: `/forgot-password` (from `src/app/(auth)/forgot-password/page.tsx`)

**Need to Check**:

- `src/components/auth/SignInForm.tsx` - forgot password link
- Any other forms referencing password reset

**File Review Required**: `src/components/auth/SignInForm.tsx`

---

### 6. UI/UX Inconsistencies

**Problem**: Rebuilt auth pages may not match app style

**Need to Review**:

1. `src/app/(auth)/forgot-password/page.tsx`
2. `src/app/(auth)/reset-password/page.tsx`
3. `src/app/(auth)/verify-otp/page.tsx`
4. `src/app/(auth)/mfa-challenge/page.tsx`
5. `src/app/(auth)/mfa-complete/page.tsx`

**Expected Style Patterns** (from copilot instructions):

- Brand color: `#ec2227` (red)
- Consistent card design with rounded borders
- "Fishon captain portal" header styling
- Proper error/success states
- Mobile responsive

**Quick Check**:

```bash
grep -n "fishon" -i src/app/\(auth\)/**/*.tsx
grep -n "#ec2227" src/app/\(auth\)/**/*.tsx
```

**Status**: ⚠️ Manual review needed

---

### 7. Type Errors (If Any)

**Current Status**: TypeScript check PASSES ✅

```bash
$ npm run typecheck
# No errors reported
```

**Note**: User reported type errors blocking Vercel deployment, but local check passes. This suggests:

- Environment-specific issues
- Strict mode differences
- Missing dependencies in production build

**Action Required**: Get specific error messages from Vercel deployment logs

---

## 📋 Cleanup Task List

### Phase 1: Critical Fixes (MUST DO NOW)

- [ ] **Fix email parameter order in resend-otp route**

  - File: `src/app/api/auth/resend-otp/route.ts`
  - Lines: 93, 99
  - Change: Swap `code` and `firstName` parameters

- [ ] **Create missing MFA complete API route**

  - File: `src/app/api/auth/mfa/complete/route.ts`
  - Reference: `docs/api/MFA_NEXTAUTH_INTEGRATION.md:122-157`
  - Implement token verification and user lookup

- [ ] **Add MFA integration to NextAuth**
  - File: `src/lib/auth.ts`
  - Add MFA detection in credentials provider
  - Add MFA fields to JWT callback
  - Add MFA fields to session callback
  - Reference: `docs/api/MFA_NEXTAUTH_INTEGRATION.md:15-91`

### Phase 2: Verification & Testing

- [ ] **Test OTP verification flow**

  - Signup → Verify email → Success
  - Resend OTP → Verify → Success

- [ ] **Test password reset flow**

  - Forgot password → Verify OTP → Reset → Success
  - Test with wrong code
  - Test with expired code

- [ ] **Test MFA flow** (if enabled for user)
  - Login with password → MFA challenge → Complete → Success
  - Test backup codes
  - Test wrong code

### Phase 3: UI/UX Improvements

- [ ] **Review auth page styling**

  - Check brand colors (`#ec2227`)
  - Check responsive design
  - Check error states
  - Check success states

- [ ] **Review wording/copy**

  - Error messages
  - Success messages
  - Help text
  - Button labels

- [ ] **Fix any redirect issues**
  - Test all navigation paths
  - Check callback URLs
  - Verify query parameters

### Phase 4: Deployment Preparation

- [ ] **Get Vercel deployment logs**

  - Identify specific type errors
  - Check for environment variable issues

- [ ] **Run production build locally**

  ```bash
  npm run build
  ```

- [ ] **Test production mode locally**

  ```bash
  npm run start
  ```

---

## 🔧 Detailed Fix Instructions

### Fix 1: Email Parameter Order

**File**: `src/app/api/auth/resend-otp/route.ts`

**Change 1** (Lines 93-96):

```typescript
// BEFORE (WRONG)
await sendVerificationOTP(user.email!, otpResult.code, user.name || "User");

// AFTER (CORRECT)
await sendVerificationOTP(user.email!, user.name || "User", otpResult.code);
```

**Change 2** (Lines 99-102):

```typescript
// BEFORE (WRONG)
await sendPasswordResetOTP(user.email!, otpResult.code, user.name || "User");

// AFTER (CORRECT)
await sendPasswordResetOTP(user.email!, user.name || "User", otpResult.code);
```

---

### Fix 2: Create MFA Complete Route

**Create File**: `src/app/api/auth/mfa/complete/route.ts`

**Reference**: See full implementation in `docs/api/MFA_NEXTAUTH_INTEGRATION.md` lines 122-157

**Key Features Needed**:

1. Accept `mfaToken` in POST body
2. Verify token with `verifyMFAPendingSession(mfaToken)`
3. Check user exists and has MFA enabled
4. Return user email for sign-in
5. Apply rate limiting (5 requests/5 minutes)
6. Security headers on all responses
7. Comprehensive error handling

**Dependencies**:

```typescript
import { verifyMFAPendingSession } from "@/lib/auth/mfa-session";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { NextResponse } from "next/server";
```

---

### Fix 3: Add MFA to NextAuth

**File**: `src/lib/auth.ts`

**Change 1: Update credentials provider authorize function**

Add after password verification:

```typescript
// Check if MFA is enabled
const dbUser = await prisma.user.findUnique({
  where: { email: credentials.email },
  select: { mfaEnabled: true },
});

if (dbUser?.mfaEnabled) {
  // Create MFA pending session
  const { createMFAPendingSession } = await import("@/lib/auth/mfa-session");
  const token = await createMFAPendingSession(user.id, user.email);

  // Throw error to trigger client redirect
  throw new Error(`MFA_REQUIRED:${token}`);
}
```

**Change 2: Update JWT callback**

Add after role assignment:

```typescript
// Add MFA status to token
if (user) {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, mfaMethod: true },
  });
  if (dbUser) {
    token.mfaEnabled = dbUser.mfaEnabled || false;
    token.mfaMethod = dbUser.mfaMethod;
  }
}
```

**Change 3: Update session callback**

Add after role assignment:

```typescript
// Add MFA status to session
if (token.mfaEnabled !== undefined) {
  session.user.mfaEnabled = token.mfaEnabled;
}
if (token.mfaMethod) {
  session.user.mfaMethod = token.mfaMethod;
}
```

**Change 4: Update type definitions**

**File**: `src/types/next-auth.d.ts`

Ensure this exists:

```typescript
declare module "next-auth" {
  interface User {
    id: string;
    mfaEnabled?: boolean;
    mfaMethod?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      mfaEnabled?: boolean;
      mfaMethod?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    mfaEnabled?: boolean;
    mfaMethod?: string;
  }
}
```

---

## 🧪 Testing Checklist

### Manual Testing

**1. Email Verification Flow**

```
1. Go to /auth?mode=signup
2. Fill form with new email
3. Submit
4. Check email for 6-digit code
5. Enter code in /verify-otp page
6. Should redirect to /captain
7. Check database: emailVerified should be set
```

**2. Resend OTP Flow**

```
1. On /verify-otp page, wait 60 seconds
2. Click "Resend Code"
3. Check email for new 6-digit code
4. Enter new code
5. Should succeed
```

**3. Password Reset Flow**

```
1. Go to /auth?mode=signin
2. Click "Forgot password?"
3. Enter email
4. Check email for reset code
5. Enter code in /verify-otp
6. Should redirect to /reset-password?email=X
7. Enter new password
8. Should redirect to /auth with success message
9. Login with new password
```

**4. MFA Flow** (if user has MFA enabled)

```
1. Enable MFA for test user (via database or API)
2. Go to /auth?mode=signin
3. Enter email + password
4. Should redirect to /auth/mfa-challenge
5. Enter 6-digit TOTP code
6. Should redirect to /auth/mfa-complete
7. Should complete sign-in
8. Check session has mfaEnabled flag
```

**5. Change Password Flow**

```
1. Sign in
2. Go to security settings
3. Enter current password + new password
4. Submit
5. Check email for notification
6. Sign out and sign in with new password
```

---

## 📊 Files Changed Summary

### Must Create (1 file)

```
src/app/api/auth/mfa/complete/route.ts
```

### Must Fix (2 files)

```
src/app/api/auth/resend-otp/route.ts
src/lib/auth.ts
```

### Should Review (5+ files)

```
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/verify-otp/page.tsx
src/app/(auth)/mfa-challenge/page.tsx
src/app/(auth)/mfa-complete/page.tsx
src/components/auth/SignInForm.tsx
src/types/next-auth.d.ts
```

---

## 🚀 Deployment Strategy

### Pre-Deployment Checklist

- [ ] All Phase 1 fixes complete
- [ ] All Phase 2 tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (if tests exist)
- [ ] Manual testing complete
- [ ] No console errors in browser
- [ ] Database migrations applied

### Deployment Steps

1. **Commit fixes to a branch**

   ```bash
   git checkout -b fix/auth-cleanup
   git add .
   git commit -m "fix: critical auth issues - parameter order, MFA integration"
   ```

2. **Push and create preview deployment**

   ```bash
   git push origin fix/auth-cleanup
   ```

3. **Test preview deployment thoroughly**

   - Test all auth flows
   - Check Vercel logs for errors
   - Verify environment variables

4. **Merge to main only after preview tests pass**

---

## 📝 Documentation Updates Needed

After fixes are complete:

- [ ] Update `docs/api/MFA_QUICKSTART.md` with correct testing steps
- [ ] Update `.github/copilot-instructions.md` with lessons learned
- [ ] Create `docs/guides/AUTH_REBUILD_POSTMORTEM.md` for future reference
- [ ] Document proper email function signatures in code comments

---

## 🎓 Lessons Learned

### For Future Copilot Sessions

1. **Always verify function signatures** before changing call sites
2. **Test email sending** immediately after changing email functions
3. **Don't skip documented implementations** - MFA complete route was documented but not created
4. **Maintain type safety** - ensure NextAuth type definitions match implementation
5. **Test before committing** - manual testing should catch parameter mismatches
6. **Keep git history clean** - major rewrites should be in feature branches with testing
7. **Document breaking changes** - commit message should warn about breaking changes

---

## ⚠️ Risk Assessment

**Current Risk Level**: 🔴 HIGH

**Blocked Features**:

- ❌ User registration (email verification broken)
- ❌ Password reset (email sending broken)
- ❌ MFA login (missing API route + auth integration)
- ⚠️ Existing users can login (if no MFA)

**Production Impact**:

- Cannot deploy to Vercel (if type errors exist)
- New users cannot register
- Users cannot reset passwords
- MFA users locked out

**Estimated Fix Time**:

- Phase 1 (Critical): 2-3 hours
- Phase 2 (Testing): 1-2 hours
- Phase 3 (UI/UX): 2-4 hours (optional, can defer)
- **Total**: 5-9 hours for full fix

---

## 🆘 Emergency Rollback Plan

If fixes don't work, rollback to last known good state:

```bash
# Find last working commit before 563d7e9
git log --oneline | head -20

# Rollback (example)
git revert 563d7e9
git push origin main
```

**Note**: User mentioned "need to reload old git version" - identify which commit was stable.

---

**Next Step**: Start with Phase 1 Critical Fixes immediately.

**Priority Order**:

1. Fix email parameters (15 min)
2. Create MFA complete route (45 min)
3. Add MFA to NextAuth (60 min)
4. Test everything (60 min)

---

**Status**: 🚧 READY TO EXECUTE  
**Owner**: Development Team  
**Review Required**: After Phase 1 & 2 complete
