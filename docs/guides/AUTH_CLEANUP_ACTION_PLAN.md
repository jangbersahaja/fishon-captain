# AUTH Cleanup Action Plan

**Date**: October 13, 2025  
**Status**: 🔄 In Progress  
**Context**: Addressing remaining issues with AUTH implementation after rebuild

---

## 🚨 Issues to Address

Based on recent complaints and observations, the following issues need to be resolved:

### 1. ❌ Verify OTP Method - NOT WORKING
**Problem**: OTP verification may not be working correctly in all scenarios
- Need to verify OTP validation logic
- Check if OTP consumption works properly for both email verification and password reset
- Ensure proper error messages are displayed

### 2. ❌ Forgot Password Process - ISSUES
**Problem**: Password reset flow has inconsistencies
- OTP validation before password reset may not be working as expected
- User needs to verify OTP first, then reset password
- Flow should be: forgot-password → verify-otp → reset-password

### 3. ❌ Unsynchronized Password Hash
**Problem**: Password hash might not be properly synchronized
- Bcrypt rounds inconsistency
- Hash storage issues
- Login validation problems

### 4. ❌ Poor Styling
**Problem**: Some auth pages have inconsistent styling
- Need to ensure all pages use Fishon brand colors (#ec2227)
- Consistent layout and typography
- Professional UI/UX

### 5. ❌ Incorrect Wording
**Problem**: Error messages and UI text need improvement
- Generic error messages
- Confusing instructions
- Need clearer user guidance

### 6. ❌ Wrong Redirect Links
**Problem**: Some redirects go to wrong pages
- 404 errors on some paths
- Incorrect callback URLs
- Wrong login redirect paths

### 7. ❌ Incorrect Paths
**Problem**: Path references don't match actual route structure
- Using `/auth/forgot-password` instead of `/forgot-password`
- Using `/auth/verify-otp` instead of `/verify-otp`
- Wrong path references in components

---

## ✅ Action Items

### Phase 1: Verify Current State (Investigation)
- [x] Review AUTH_REBUILD_FIXES_COMPLETE.md
- [x] Check current OTP implementation
- [x] Review password reset flow
- [x] Test path routing
- [ ] Run manual tests on auth flows

### Phase 2: Fix Critical Issues
- [ ] Verify OTP method is working correctly
- [ ] Fix forgot password process
- [ ] Ensure password hash synchronization
- [ ] Update any incorrect paths
- [ ] Fix redirect links

### Phase 3: UI/UX Improvements
- [ ] Ensure consistent Fishon branding across all auth pages
- [ ] Improve error messages and wording
- [ ] Add better user guidance
- [ ] Enhance loading states and feedback

### Phase 4: Testing & Validation
- [ ] Test complete signup flow with OTP verification
- [ ] Test complete forgot password flow
- [ ] Test login with new password after reset
- [ ] Verify all paths and redirects work correctly
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

### Phase 5: Documentation
- [ ] Update AUTH_CLEANUP_COMPLETE.md with changes
- [ ] Document any breaking changes
- [ ] Update testing checklist

---

## 🔧 Technical Details

### OTP Verification Flow (Current)
```
1. User requests OTP (signup or forgot-password)
   └─> POST /api/auth/signup or /api/auth/forgot-password
   └─> createOTP() generates 6-digit code
   └─> Email sent with code

2. User verifies OTP
   └─> POST /api/auth/verify-otp { email, code, purpose }
   └─> validateOTP() checks code
   └─> For email_verification: consumes OTP
   └─> For password_reset: doesn't consume (needed for reset)
   └─> Sets emailVerified = true

3. For password reset:
   └─> POST /api/auth/reset-password { email, password, confirmPassword }
   └─> Validates password strength
   └─> Checks password history
   └─> Hashes password with bcrypt.hash(password, 12)
   └─> Updates user.passwordHash
```

### Path Structure (Next.js Route Groups)
```
Files:                           Routes:
src/app/(auth)/auth/page.tsx     → /auth
src/app/(auth)/forgot-password/  → /forgot-password
src/app/(auth)/verify-otp/       → /verify-otp
src/app/(auth)/reset-password/   → /reset-password
```

### Bcrypt Configuration (Should be consistent)
```typescript
// All password hashing should use 12 rounds
await bcrypt.hash(password, 12);

// Locations to check:
- src/app/api/auth/signup/route.ts
- src/app/api/auth/reset-password/route.ts
- src/app/api/auth/change-password/route.ts
- src/app/api/dev/create-test-user/route.ts
```

---

## 📋 Files to Review/Fix

### API Routes
- [ ] `/api/auth/verify-otp/route.ts` - OTP validation logic
- [ ] `/api/auth/forgot-password/route.ts` - Password reset OTP generation
- [ ] `/api/auth/reset-password/route.ts` - Password reset with validation
- [ ] `/api/auth/resend-otp/route.ts` - Resend OTP logic

### Frontend Pages
- [ ] `src/app/(auth)/forgot-password/page.tsx` - Forgot password UI
- [ ] `src/app/(auth)/verify-otp/page.tsx` - OTP verification UI
- [ ] `src/app/(auth)/reset-password/page.tsx` - Password reset UI

### Auth Components
- [ ] `src/components/auth/SignInForm.tsx` - Login form paths
- [ ] `src/components/auth/SignUpForm.tsx` - Signup form paths
- [ ] `src/components/auth/VerificationCodeInput.tsx` - OTP input

### Lib Files
- [ ] `src/lib/auth/otp.ts` - OTP generation and validation
- [ ] `src/lib/auth.ts` - NextAuth configuration
- [ ] `src/lib/password.ts` - Password validation
- [ ] `src/lib/email.ts` - Email templates

---

## 🧪 Testing Checklist

### Manual Tests to Run
- [ ] **Signup Flow**
  - Create new account
  - Receive OTP email
  - Verify OTP
  - Successfully log in
  
- [ ] **Forgot Password Flow**
  - Request password reset
  - Receive OTP email
  - Verify OTP
  - Reset password
  - Log in with new password

- [ ] **Path Routing**
  - All links work without 404 errors
  - Redirects go to correct pages
  - Callback URLs work properly

- [ ] **Error Handling**
  - Invalid OTP shows proper error
  - Expired OTP shows proper error
  - Rate limiting works
  - Clear error messages

### Automated Tests
- [ ] Create unit tests for OTP validation
- [ ] Create integration tests for password reset flow
- [ ] Create tests for path routing

---

## 🎯 Success Criteria

✅ **Cleanup Complete When:**
- [ ] All OTP verification works correctly (email verification + password reset)
- [ ] Complete forgot password flow works end-to-end
- [ ] Password hashing is consistent (12 rounds everywhere)
- [ ] All auth pages have consistent Fishon branding
- [ ] All error messages are clear and helpful
- [ ] All redirect links work without 404 errors
- [ ] All paths are correct (no /auth/ prefix issues)
- [ ] Manual testing passes all test cases
- [ ] No TypeScript errors
- [ ] Documentation is updated

---

## 📊 Priority Ranking

**Priority 1 (Critical - Must Fix)**
1. Verify OTP method working
2. Forgot password process
3. Password hash synchronization
4. Incorrect paths

**Priority 2 (Important - Should Fix)**
5. Wrong redirect links
6. Error message improvements

**Priority 3 (Nice to Have - Can Fix Later)**
7. Styling consistency polish
8. Additional UX improvements

---

## 🚀 Implementation Plan

### Week 1: Investigation & Critical Fixes
- **Day 1**: Investigate and document current issues
- **Day 2**: Fix OTP verification logic
- **Day 3**: Fix forgot password process
- **Day 4**: Fix path and redirect issues
- **Day 5**: Testing and validation

### Week 2: Polish & Documentation
- **Day 1-2**: UI/UX improvements
- **Day 3**: Error message improvements
- **Day 4**: Comprehensive testing
- **Day 5**: Documentation and deployment

---

**Next Steps**: Begin Phase 1 investigation to understand exact issues before making changes.
