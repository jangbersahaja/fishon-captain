# Authentication Testing Plan - Solution A

**Project:** FishOn Captain Register  
**Phase:** 9 - Complete Testing  
**Date:** October 13, 2025  
**Status:** Ready for Execution

---

## 📋 Overview

This document provides a comprehensive testing plan for all authentication flows in Solution A (Split MFA by Method). The implementation separates password-based MFA from OAuth authentication, with OAuth users seeing informational notices instead of being blocked from features.

### Key Principles

1. **Password users** can enable MFA for their password-based login
2. **OAuth users** rely on provider-level 2FA (Google, Facebook, Apple)
3. **Hybrid users** (OAuth + password set) can use either method; MFA only applies to password login
4. **Notices, not blocks**: OAuth users see informational messages, not error screens

---

## 🧪 Test Environment Setup

### Prerequisites

- [ ] Development database with clean state
- [ ] Zoho SMTP credentials configured (`GOOGLE_PLACES_API_KEY` for email)
- [ ] Google OAuth credentials configured
- [ ] Facebook OAuth credentials configured (optional)
- [ ] Apple OAuth credentials configured (optional)
- [ ] Authenticator app installed (Google Authenticator, Authy, or 1Password)
- [ ] Email inbox accessible for OTP verification
- [ ] Browser with DevTools access
- [ ] Incognito/Private browsing windows for testing

### Environment Variables Checklist

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...

# Email (Zoho SMTP)
ZOHO_SMTP_HOST=smtppro.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=...
ZOHO_SMTP_PASSWORD=...
ZOHO_SMTP_FROM=...

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
GOOGLE_PLACES_API_KEY=...
```

### Test User Accounts

Create these test accounts before starting:

1. **Password-Only User**

   - Email: `password-test@example.com`
   - Password: `Test123!Password`
   - Purpose: Test password auth flows

2. **OAuth-Only User (Google)**

   - Email: Use real Google account
   - Purpose: Test OAuth flows without password

3. **Hybrid User** (to be created during testing)

   - Start as OAuth user, then set password
   - Purpose: Test hybrid authentication flows

4. **Admin User**
   - Email: Your admin account
   - Role: ADMIN
   - Purpose: Test admin dashboard features

### Database Reset Script

```bash
# Clear test data between test runs
npm run migrate:reset
npm run db:seed  # If you have seed data
```

---

## 📝 Testing Checklist

### ✅ Passing Criteria

Each test case must meet these criteria:

- Functionality works as described
- No console errors (TypeScript or runtime)
- Proper error messages displayed to users
- Loading states work correctly
- Success/error notifications appear
- Redirects work as expected
- Audit logs written for admin actions
- Email notifications sent when expected

---

## 🔐 Test Suite 1: Password User Flows

### 1.1 Registration with Password

**Objective:** Verify new users can register with email and password

**Steps:**

1. Go to registration page
2. Enter email: `newuser-password@example.com`
3. Enter password: `SecurePass123!`
4. Submit form
5. Verify email sent (check inbox)
6. Click verification link
7. Verify redirect to dashboard

**Expected Results:**

- ✅ User created in database with `passwordHash`
- ✅ `passwordMfaEnabled` = `false` (default)
- ✅ Email verification OTP sent
- ✅ Email verified successfully
- ✅ Session created after verification
- ✅ Redirect to `/captain` dashboard

**Database Verification:**

```sql
SELECT
  email,
  "passwordHash" IS NOT NULL as has_password,
  "passwordMfaEnabled",
  "emailVerified"
FROM "User"
WHERE email = 'newuser-password@example.com';
```

---

### 1.2 Enable MFA (TOTP Setup)

**Objective:** Verify password users can enable MFA with authenticator app

**Prerequisites:** Logged in as password user

**Steps:**

1. Go to Settings > Security
2. Find "Two-Factor Authentication" section
3. Click "Enable MFA" or "Setup MFA"
4. Verify redirect to `/api/auth/mfa/setup`
5. API returns QR code + secret
6. Scan QR code with authenticator app (Google Authenticator, Authy)
7. App shows 6-digit TOTP code
8. Enter code in verification form
9. Submit verification
10. Verify 10 backup codes displayed
11. Download or copy backup codes
12. Confirm setup completion

**Expected Results:**

- ✅ QR code displayed correctly
- ✅ Secret displayed in text form (manual entry option)
- ✅ TOTP code accepted by `/api/auth/mfa/verify-setup`
- ✅ `passwordMfaEnabled` = `true` in database
- ✅ `passwordMfaMethod` = `"TOTP"` in database
- ✅ `passwordMfaSecret` encrypted in database
- ✅ 10 backup codes generated (format: `XXXX-XXXX`)
- ✅ `passwordMfaBackupCodes` encrypted in database
- ✅ `passwordMfaVerifiedAt` timestamp set
- ✅ Success message displayed
- ✅ Redirect to `/auth/mfa-complete`

**Database Verification:**

```sql
SELECT
  "passwordMfaEnabled",
  "passwordMfaMethod",
  "passwordMfaSecret" IS NOT NULL as has_secret,
  array_length("passwordMfaBackupCodes", 1) as backup_codes_count,
  "passwordMfaVerifiedAt"
FROM "User"
WHERE email = 'password-test@example.com';
```

**API Verification:**

```bash
# Get MFA status
curl http://localhost:3000/api/auth/mfa/status \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected response:
{
  "enabled": true,
  "method": "TOTP",
  "verifiedAt": "2025-10-13T10:30:00.000Z",
  "backupCodesRemaining": 10
}
```

---

### 1.3 Login with MFA Challenge (TOTP)

**Objective:** Verify MFA-enabled users complete TOTP challenge during login

**Prerequisites:**

- User has MFA enabled
- Authenticator app configured

**Steps:**

1. Sign out completely
2. Go to login page
3. Enter email: `password-test@example.com`
4. Enter password: `Test123!Password`
5. Click "Sign In"
6. Verify redirect to `/auth/mfa-challenge?userId={id}&callbackUrl={url}`
7. Open authenticator app
8. Get current 6-digit TOTP code
9. Enter code in MFA challenge form
10. Submit form
11. Verify session created
12. Verify redirect to callback URL (default: `/captain`)

**Expected Results:**

- ✅ Password verified successfully
- ✅ API detects `passwordMfaEnabled = true`
- ✅ Redirect to MFA challenge page
- ✅ MFA challenge form displays
- ✅ TOTP code verified by `/api/auth/mfa/verify-login`
- ✅ Temporary MFA session created (10 min expiry)
- ✅ Full session created after verification
- ✅ Redirect to `/captain` dashboard
- ✅ No console errors

**Error Cases to Test:**

- ❌ Wrong TOTP code → Error message: "Invalid authentication code"
- ❌ Expired TOTP code → Error message: "Code has expired, try the current one"
- ❌ Empty code → Error message: "Please enter the 6-digit code"

---

### 1.4 Login with Backup Code

**Objective:** Verify backup codes work for emergency access

**Prerequisites:**

- User has MFA enabled
- User has backup codes saved

**Steps:**

1. Sign out completely
2. Go to login page
3. Enter email and password
4. Arrive at MFA challenge page
5. Click "Use backup code instead" toggle
6. Enter one backup code (format: `XXXX-XXXX`)
7. Submit form
8. Verify session created
9. Verify redirect to dashboard

**Expected Results:**

- ✅ Backup code toggle works
- ✅ Input accepts 8-character code (with hyphen)
- ✅ Backup code verified by `/api/auth/mfa/verify-login`
- ✅ Used backup code removed from database
- ✅ Session created successfully
- ✅ If < 3 codes remaining, warning message shown

**Database Verification:**

```sql
-- Check backup codes count decreased
SELECT array_length("passwordMfaBackupCodes", 1) as backup_codes_remaining
FROM "User"
WHERE email = 'password-test@example.com';
```

**Second Use Test:**

- Try using the same backup code again
- Expected: Error message "Invalid or already used backup code"

---

### 1.5 Change Password (MFA User)

**Objective:** Verify password change works for users with MFA enabled

**Prerequisites:** Logged in as MFA-enabled user

**Steps:**

1. Go to Settings > Security
2. Find "Change Password" section
3. Enter current password: `Test123!Password`
4. Enter new password: `NewSecure456!`
5. Confirm new password: `NewSecure456!`
6. Click "Change Password"
7. Verify success message
8. Sign out
9. Sign in with NEW password
10. Complete MFA challenge
11. Verify login successful

**Expected Results:**

- ✅ Current password verified
- ✅ New password meets strength requirements
- ✅ Password strength indicator shows "Strong"
- ✅ Password updated in database (new hash)
- ✅ Old password no longer works
- ✅ MFA settings preserved (not reset)
- ✅ Email notification sent: "Password changed"
- ✅ Password history updated (prevents reuse)

**Password Validation:**

- Test weak password → Error: "Password must be at least 8 characters"
- Test previously used password → Error: "Cannot reuse recent passwords"
- Test mismatched passwords → Error: "Passwords do not match"

---

### 1.6 Password Reset via Email OTP

**Objective:** Verify password reset flow with email OTP verification

**Prerequisites:** User exists in database

**Steps:**

1. Sign out completely
2. Go to login page
3. Click "Forgot Password?"
4. Arrive at `/auth/forgot-password`
5. Enter email: `password-test@example.com`
6. Click "Send Reset Code"
7. Verify success message
8. Check email inbox for OTP (6 digits)
9. Verify auto-redirect to `/auth/reset-password?email={email}`
10. Enter OTP code from email
11. Click "Verify Code"
12. Verify move to password step
13. Enter new password: `ResetPass789!`
14. Confirm password: `ResetPass789!`
15. Click "Reset Password"
16. Verify success message
17. Verify redirect to login page with success banner
18. Sign in with NEW password
19. Complete MFA if enabled

**Expected Results:**

- ✅ Email sent via Zoho SMTP
- ✅ OTP code valid for 5 minutes
- ✅ OTP stored in database with expiry
- ✅ Two-step UI: OTP → Password
- ✅ OTP verified successfully
- ✅ Password strength validation works
- ✅ Password updated in database
- ✅ Old password no longer works
- ✅ OTP marked as used (cannot reuse)
- ✅ Email notification sent: "Password reset successful"
- ✅ Redirect to login with success message
- ✅ MFA settings preserved

**Error Cases:**

- Wrong OTP → Error: "Invalid verification code"
- Expired OTP (after 5 min) → Error: "Code has expired, request a new one"
- Resend OTP → 60 second cooldown enforced
- Weak password → Strength meter shows "Weak" + error message

---

### 1.7 Disable MFA

**Objective:** Verify users can disable MFA and return to password-only auth

**Prerequisites:**

- Logged in as MFA-enabled user

**Steps:**

1. Go to Settings > Security
2. Find "Two-Factor Authentication" section
3. Click "Disable MFA" button
4. Confirm in modal/dialog
5. Enter current password for confirmation
6. Submit form
7. Verify success message
8. Sign out
9. Sign in with email + password only
10. Verify NO MFA challenge appears
11. Verify direct login to dashboard

**Expected Results:**

- ✅ Confirmation dialog appears
- ✅ Password verification required (security)
- ✅ `passwordMfaEnabled` = `false` in database
- ✅ `passwordMfaSecret` cleared (or kept encrypted)
- ✅ `passwordMfaBackupCodes` cleared
- ✅ Login flow bypasses MFA challenge
- ✅ Audit log written: `MFA_DISABLED` action
- ✅ Email notification sent: "MFA disabled on your account"

---

### 1.8 Regenerate Backup Codes

**Objective:** Verify users can generate new backup codes

**Prerequisites:** Logged in with MFA enabled

**Steps:**

1. Go to Settings > Security
2. Find "Backup Codes" section
3. Click "Regenerate Backup Codes"
4. Confirm action in modal
5. Enter current password
6. Verify new 10 backup codes displayed
7. Download or copy codes
8. Sign out
9. Sign in with password
10. Use one of the NEW backup codes
11. Verify login successful

**Expected Results:**

- ✅ Old backup codes invalidated
- ✅ New 10 backup codes generated
- ✅ Codes encrypted in database
- ✅ Download option works
- ✅ Copy to clipboard works
- ✅ New codes work for login
- ✅ Old codes no longer work

---

## 🌐 Test Suite 2: OAuth User Flows

### 2.1 Register with Google OAuth

**Objective:** Verify new users can register via Google OAuth

**Steps:**

1. Go to registration page
2. Click "Continue with Google"
3. Complete Google OAuth flow (select account)
4. Verify redirect back to app
5. Verify session created
6. Verify redirect to `/captain` dashboard
7. Check Settings > Security page

**Expected Results:**

- ✅ User created in database
- ✅ `passwordHash` = `null` (OAuth-only)
- ✅ `passwordMfaEnabled` = `false`
- ✅ Email from Google profile auto-verified
- ✅ Name from Google profile populated
- ✅ Session created successfully
- ✅ NO MFA challenge appears (OAuth users skip MFA)

**Database Verification:**

```sql
SELECT
  email,
  name,
  "passwordHash",
  "passwordMfaEnabled",
  "emailVerified"
FROM "User"
WHERE email = 'YOUR_GOOGLE_EMAIL@gmail.com';

-- Verify Account record
SELECT provider, "providerAccountId"
FROM "Account"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'YOUR_GOOGLE_EMAIL@gmail.com');
```

---

### 2.2 Login with Google OAuth (No Password Set)

**Objective:** Verify OAuth-only users can sign in without MFA challenges

**Prerequisites:** OAuth-only user account exists

**Steps:**

1. Sign out completely
2. Go to login page
3. Click "Continue with Google"
4. Select Google account
5. Verify redirect back to app
6. Verify session created immediately
7. Verify NO MFA challenge page appears
8. Verify redirect to `/captain` dashboard

**Expected Results:**

- ✅ OAuth flow completes successfully
- ✅ NO MFA check performed (user has no `passwordHash`)
- ✅ Session created directly
- ✅ Redirect to dashboard
- ✅ No console errors

**Critical Check:**

- Verify `/api/auth/check-mfa` returns `requiresMfa: false` for OAuth-only users

---

### 2.3 OAuth User Sees Notices (Not Blocks)

**Objective:** Verify OAuth users see informational notices, not error blocks

**Prerequisites:** Logged in as OAuth-only user

**Steps:**

1. Go to Settings > Security
2. Find "Two-Factor Authentication" section
3. Verify notice displayed

**Expected Notice Content:**

```
Your account uses OAuth authentication (Google).
Two-factor authentication is managed by your OAuth provider.
To enable app-level MFA, please set a password first.
```

**Steps Continued:** 4. Find "Change Password" section 5. Verify notice displayed

**Expected Notice Content:**

```
Your account uses OAuth authentication (Google).
You don't have a password yet.
Click "Set Password" to create one.
```

**Expected Results:**

- ✅ Blue informational banner (NOT red error)
- ✅ Friendly, helpful language
- ✅ Explains authentication is via OAuth provider
- ✅ Provides actionable next step ("Set Password")
- ✅ NO buttons hidden or disabled
- ✅ NO error messages or blocks

---

### 2.4 OAuth User Sets Password (Becomes Hybrid)

**Objective:** Verify OAuth users can set a password and become hybrid users

**Prerequisites:** Logged in as OAuth-only user

**Steps:**

1. Go to Settings > Security
2. Find "Set Password" or "Change Password" section
3. Click "Set Password" button
4. Enter new password: `HybridPass123!`
5. Confirm password: `HybridPass123!`
6. Submit form
7. Verify success message
8. Sign out
9. Go to login page
10. Sign in with EMAIL + PASSWORD (not OAuth button)
11. Verify password login works
12. Verify NO MFA challenge (MFA not enabled yet)

**Expected Results:**

- ✅ "Set Password" UI shown (not "Change Password")
- ✅ No "current password" field required (OAuth user has none)
- ✅ Password strength validation works
- ✅ `passwordHash` created in database
- ✅ User is now "hybrid" (can use OAuth OR password)
- ✅ Google OAuth still works
- ✅ Email + password login also works
- ✅ Email notification sent: "Password set for your account"

**Database Verification:**

```sql
SELECT
  email,
  "passwordHash" IS NOT NULL as has_password,
  "passwordMfaEnabled"
FROM "User"
WHERE email = 'YOUR_GOOGLE_EMAIL@gmail.com';

-- Should show: has_password = true, passwordMfaEnabled = false
```

---

### 2.5 OAuth User with Password Enables MFA

**Objective:** Verify hybrid users can enable MFA for password login

**Prerequisites:**

- OAuth user has set a password (hybrid user)

**Steps:**

1. Log in as hybrid user
2. Go to Settings > Security
3. Enable MFA (follow Test 1.2 steps)
4. Sign out
5. **Test A**: Sign in with Google OAuth
   - Verify NO MFA challenge
   - Verify direct login to dashboard
6. Sign out
7. **Test B**: Sign in with email + password
   - Verify MFA challenge appears
   - Enter TOTP code
   - Verify login successful

**Expected Results:**

- ✅ MFA setup works for hybrid users
- ✅ `passwordMfaEnabled` = `true` in database
- ✅ **OAuth login bypasses MFA** (critical!)
- ✅ **Password login requires MFA**
- ✅ Clear separation: MFA only applies to password auth
- ✅ Both login methods work correctly

**Critical Validation:**
This is the most important test for Solution A:

- OAuth users should NEVER see MFA challenge
- MFA only protects password-based authentication
- User can choose which method to use

---

## 🔀 Test Suite 3: Hybrid User Flows

### 3.1 Hybrid User: Both Login Methods Work

**Objective:** Verify users with both OAuth and password can use either method

**Prerequisites:** Hybrid user (OAuth + password set)

**Test A: OAuth Login**

1. Sign out
2. Go to login page
3. Click "Continue with Google"
4. Verify session created
5. Verify redirect to dashboard

**Test B: Password Login**

1. Sign out
2. Go to login page
3. Enter email + password
4. Submit form
5. Verify session created
6. Verify redirect to dashboard

**Expected Results:**

- ✅ Both methods work independently
- ✅ Same user account accessed
- ✅ Same session permissions
- ✅ User can choose preferred method
- ✅ No conflicts or errors

---

### 3.2 Hybrid User: OAuth Bypasses MFA, Password Uses MFA

**Objective:** Verify MFA only applies to password login for hybrid users

**Prerequisites:**

- Hybrid user with MFA enabled

**Test A: OAuth Login (No MFA)**

1. Sign out
2. Click "Continue with Google"
3. Complete OAuth flow
4. Verify NO MFA challenge page
5. Verify direct login to dashboard

**Test B: Password Login (With MFA)**

1. Sign out
2. Enter email + password
3. Submit form
4. Verify MFA challenge page appears
5. Enter TOTP code
6. Verify login after MFA

**Expected Results:**

- ✅ OAuth login: NO MFA challenge
- ✅ Password login: MFA challenge required
- ✅ Correct behavior per Solution A design
- ✅ User understands: MFA protects password, not OAuth

---

## 🔒 Test Suite 4: Security Features

### 4.1 Account Lockout After Failed Attempts

**Objective:** Verify accounts lock after 5 failed password attempts

**Prerequisites:** Password user account

**Steps:**

1. Sign out
2. Go to login page
3. Enter correct email
4. Enter WRONG password (5 times)
5. Observe error messages
6. Verify account locked message after 5th attempt
7. Try correct password
8. Verify still locked
9. Wait 15 minutes (or use admin unlock)
10. Try correct password again
11. Verify login successful

**Expected Results:**

- ✅ Attempt 1-4: Error "Invalid credentials"
- ✅ `loginAttempts` incremented in database
- ✅ Attempt 5: Error "Account locked for 15 minutes"
- ✅ `lockedUntil` timestamp set (now + 15 min)
- ✅ Correct password blocked during lockout
- ✅ After 15 min, `lockedUntil` expires
- ✅ Login works again, `loginAttempts` reset
- ✅ Audit log: `ACCOUNT_LOCKED` action

**Database Verification:**

```sql
SELECT
  email,
  "loginAttempts",
  "lockedUntil"
FROM "User"
WHERE email = 'password-test@example.com';
```

---

### 4.2 Failed MFA Attempts Don't Lock Account

**Objective:** Verify failed MFA codes don't trigger lockout (password already verified)

**Prerequisites:** MFA-enabled user

**Steps:**

1. Sign out
2. Sign in with correct email + password
3. Arrive at MFA challenge page
4. Enter wrong TOTP code (10 times)
5. Verify error messages
6. Verify account NOT locked
7. Enter correct TOTP code
8. Verify login successful

**Expected Results:**

- ✅ Wrong MFA code: Error "Invalid code"
- ✅ `loginAttempts` NOT incremented
- ✅ Account NOT locked
- ✅ User can keep trying MFA codes
- ✅ Eventually correct code works

**Rationale:** Password already verified; MFA failures shouldn't lock account. User may have time-sync issues with authenticator app.

---

### 4.3 Password Reuse Prevention

**Objective:** Verify users cannot reuse recent passwords

**Prerequisites:** User with password history

**Steps:**

1. Log in
2. Go to Settings > Security
3. Change password 5 times:
   - `Password1!` → `Password2!`
   - `Password2!` → `Password3!`
   - `Password3!` → `Password4!`
   - `Password4!` → `Password5!`
   - `Password5!` → `Password6!`
4. Try changing back to `Password1!`
5. Verify error message
6. Try changing to `Password7!` (new)
7. Verify success

**Expected Results:**

- ✅ Last 5 passwords stored in history
- ✅ Reuse of recent password blocked
- ✅ Error: "Cannot reuse recent passwords"
- ✅ New unique password accepted
- ✅ Password history updated (oldest removed)

---

### 4.4 Email Notifications Sent

**Objective:** Verify email notifications sent for security events

**Events to Test:**

1. **Password Changed**

   - Change password
   - Check email inbox
   - Verify notification received

2. **Password Reset**

   - Complete password reset flow
   - Check email inbox
   - Verify notification received

3. **MFA Enabled**

   - Enable MFA
   - Check email inbox
   - Verify notification received

4. **MFA Disabled**

   - Disable MFA
   - Check email inbox
   - Verify notification received

5. **Account Locked**
   - Trigger account lockout
   - Check email inbox
   - Verify notification received

**Expected Results:**

- ✅ All emails sent via Zoho SMTP
- ✅ Emails contain correct information
- ✅ Professional formatting
- ✅ Clear call-to-action if needed
- ✅ Sent to correct user email
- ✅ No HTML rendering issues

---

## 👥 Test Suite 5: Admin Dashboard Features

### 5.1 List Users with Security Status

**Objective:** Verify admin can view all users with security information

**Prerequisites:** Logged in as STAFF or ADMIN user

**Steps:**

1. Navigate to `/staff/security`
2. Verify user table loads
3. Observe user list with security details
4. Check pagination controls
5. Test search functionality
6. Test role filter
7. Test status filter

**Expected Results:**

- ✅ All users displayed in table
- ✅ Columns: Email, Name, Role, MFA Status, Account Status
- ✅ OAuth badge shown for OAuth-only users
- ✅ MFA enabled/disabled status visible
- ✅ Lock status displayed (Active/Locked)
- ✅ Failed login attempts count
- ✅ Force password reset flag visible
- ✅ Search by email/name works
- ✅ Filter by role works (CAPTAIN, STAFF, ADMIN)
- ✅ Filter by status works (active, locked, mfa_enabled)
- ✅ Pagination works (prev, next buttons)
- ✅ Page info displayed (showing X of Y users)

---

### 5.2 Unlock Locked Account

**Objective:** Verify admin can unlock user accounts

**Prerequisites:**

- Logged in as STAFF or ADMIN
- Test user account locked

**Steps:**

1. Lock test user account (via failed login attempts)
2. Go to `/staff/security`
3. Find locked user in table
4. Verify "Locked" status displayed
5. Click "Unlock Account" button
6. Confirm in dialog
7. Verify success message
8. Verify table refreshes
9. Verify user shows "Active" status
10. Sign in as test user
11. Verify login works

**Expected Results:**

- ✅ Unlock button only shown for locked users
- ✅ Confirmation dialog appears
- ✅ API call to `/api/admin/users/[id]/unlock`
- ✅ Success toast notification
- ✅ `lockedUntil` = `null` in database
- ✅ `loginAttempts` = `0` in database
- ✅ Audit log written: `UNLOCK_ACCOUNT` action
- ✅ Table auto-refreshes
- ✅ User can log in immediately

---

### 5.3 Force Password Reset

**Objective:** Verify admin can force users to reset password on next login

**Prerequisites:**

- Logged in as STAFF or ADMIN
- Test password user

**Steps:**

1. Go to `/staff/security`
2. Find password user in table
3. Click "Force Password Reset" button
4. Confirm in dialog
5. Verify success message
6. Verify "Password reset required" badge shown
7. Sign out as admin
8. Sign in as test user (email + password)
9. Verify redirect to forced password reset page
10. Complete password reset
11. Verify can log in with new password

**Expected Results:**

- ✅ Force reset button only shown for password users
- ✅ Hidden for OAuth-only users
- ✅ Hidden if already forced
- ✅ Confirmation dialog appears
- ✅ API call to `/api/admin/users/[id]/force-reset`
- ✅ Success toast notification
- ✅ `forcePasswordReset` = `true` in database
- ✅ Audit log written: `FORCE_PASSWORD_RESET` action
- ✅ Table auto-refreshes
- ✅ User forced to reset on next login
- ✅ Flag cleared after reset

---

### 5.4 View Security Events Audit Log

**Objective:** Verify admin can view security events history

**Prerequisites:** Logged in as STAFF or ADMIN

**Steps:**

1. Go to `/staff/security`
2. Scroll to "Recent Security Events" section
3. Verify events displayed
4. Observe event details
5. Test pagination
6. Perform admin action (unlock account)
7. Refresh events table
8. Verify new event appears

**Expected Results:**

- ✅ Security events table loads
- ✅ Columns: Action, Actor, Timestamp
- ✅ Events sorted by newest first
- ✅ Action names formatted (e.g., "UNLOCK ACCOUNT")
- ✅ Actor details shown (admin name, email)
- ✅ System actions marked as "System"
- ✅ Timestamps in Malaysia timezone
- ✅ Pagination works
- ✅ New events appear after actions
- ✅ Refresh button works

**Tracked Actions:**

- UNLOCK_ACCOUNT
- FORCE_PASSWORD_RESET
- MFA_ENABLED
- MFA_DISABLED
- PASSWORD_CHANGED
- PASSWORD_RESET
- LOGIN_FAILED
- ACCOUNT_LOCKED

---

### 5.5 Admin Rate Limiting

**Objective:** Verify rate limits enforced on admin routes

**Test Routes:**

1. **List Users** (20/min)

   - Refresh page 21 times quickly
   - Verify 429 error on 21st request

2. **Unlock Account** (10/min)

   - Unlock same account 11 times quickly
   - Verify 429 error on 11th request

3. **Force Reset** (5/min)

   - Force reset 6 times quickly
   - Verify 429 error on 6th request

4. **Security Events** (20/min)
   - Refresh events 21 times quickly
   - Verify 429 error on 21st request

**Expected Results:**

- ✅ Rate limits enforced per route
- ✅ 429 status code returned
- ✅ Error message: "Too many requests"
- ✅ `retryAfter` seconds provided
- ✅ Limits reset after window expires

---

### 5.6 Admin Authorization Checks

**Objective:** Verify only STAFF and ADMIN can access security features

**Test Cases:**

1. **CAPTAIN Role**

   - Log in as CAPTAIN user
   - Try accessing `/staff/security`
   - Verify 403 Forbidden or redirect

2. **Unauthenticated**

   - Sign out
   - Try accessing `/staff/security`
   - Verify redirect to login

3. **Direct API Access**
   - Try calling admin API without session
   - Verify 401 Unauthorized

**Expected Results:**

- ✅ CAPTAIN users blocked from `/staff/security`
- ✅ Unauthenticated users redirected to login
- ✅ API routes return 401 without session
- ✅ API routes return 403 without STAFF/ADMIN role
- ✅ Middleware protects routes

---

## 📊 Test Suite 6: Edge Cases & Error Handling

### 6.1 Network Errors

**Test Scenarios:**

1. **Offline During MFA Setup**

   - Start MFA setup
   - Disconnect network
   - Submit verification
   - Verify error message

2. **Timeout During Password Reset**
   - Request password reset
   - Wait for timeout
   - Verify error handling

**Expected Results:**

- ✅ Graceful error messages
- ✅ Retry buttons available
- ✅ No data corruption
- ✅ User can complete action after reconnect

---

### 6.2 Browser Back/Forward Navigation

**Test Scenarios:**

1. **Back Button During MFA Challenge**

   - Complete password login
   - Arrive at MFA challenge
   - Press browser back button
   - Verify behavior

2. **Forward After Error**
   - Encounter error page
   - Fix issue
   - Press browser forward
   - Verify doesn't show stale error

**Expected Results:**

- ✅ MFA challenge doesn't break
- ✅ Session state preserved
- ✅ No stale data displayed
- ✅ Proper redirects

---

### 6.3 Multiple Tabs/Windows

**Test Scenarios:**

1. **Sign Out in One Tab**

   - Open dashboard in 2 tabs
   - Sign out in tab 1
   - Try action in tab 2
   - Verify redirect to login

2. **Complete MFA in Different Tab**
   - Start login in tab 1
   - Arrive at MFA challenge
   - Open MFA challenge in tab 2
   - Complete MFA in tab 2
   - Check tab 1 behavior

**Expected Results:**

- ✅ Session sync across tabs
- ✅ Proper redirects
- ✅ No broken states

---

### 6.4 Expired Sessions

**Test Scenarios:**

1. **MFA Session Expiry (10 min)**

   - Complete password login
   - Wait 11 minutes at MFA challenge
   - Submit MFA code
   - Verify error: "Session expired"

2. **OTP Expiry (5 min)**
   - Request password reset OTP
   - Wait 6 minutes
   - Submit OTP code
   - Verify error: "Code expired"

**Expected Results:**

- ✅ Clear expiry messages
- ✅ Option to restart flow
- ✅ No security bypass

---

### 6.5 Malformed Input

**Test Scenarios:**

1. **SQL Injection Attempts**

   - Try SQL in email field
   - Try SQL in search field (admin dashboard)
   - Verify proper escaping

2. **XSS Attempts**

   - Try script tags in name field
   - Try script in search field
   - Verify sanitization

3. **Malformed MFA Codes**
   - Enter letters in TOTP field
   - Enter special characters
   - Enter too long code
   - Verify validation

**Expected Results:**

- ✅ Prisma ORM prevents SQL injection
- ✅ React sanitizes XSS attempts
- ✅ Input validation works
- ✅ Clear error messages

---

## 🔄 Test Suite 7: Integration Tests

### 7.1 Complete New User Journey

**Objective:** Test entire flow from registration to MFA-protected login

**Steps:**

1. Register new user with email + password
2. Verify email with OTP
3. Log in to dashboard
4. Enable MFA (TOTP setup)
5. Download backup codes
6. Sign out
7. Sign in with password
8. Complete MFA challenge
9. Access protected resources
10. Change password
11. Sign out
12. Sign in with new password + MFA

**Expected Results:**

- ✅ All steps complete successfully
- ✅ No console errors throughout
- ✅ Proper redirects at each step
- ✅ Data persisted correctly
- ✅ Email notifications sent

---

### 7.2 OAuth to Hybrid User Journey

**Objective:** Test OAuth user becoming hybrid and enabling MFA

**Steps:**

1. Register with Google OAuth
2. Log in to dashboard (OAuth)
3. Set password in settings
4. Sign out
5. Sign in with email + password (not OAuth)
6. Enable MFA
7. Sign out
8. Test OAuth login (no MFA)
9. Sign out
10. Test password login (with MFA)

**Expected Results:**

- ✅ OAuth user becomes hybrid seamlessly
- ✅ Both login methods work
- ✅ MFA only applies to password login
- ✅ User can choose login method

---

### 7.3 Account Lockout Recovery Journey

**Objective:** Test complete lockout and recovery flow

**Steps:**

1. Trigger account lockout (5 failed attempts)
2. Verify locked message
3. Admin unlocks account
4. User receives unlock notification
5. User logs in successfully

**Expected Results:**

- ✅ Lockout triggered correctly
- ✅ Admin can unlock
- ✅ Audit log written
- ✅ Email notifications sent
- ✅ User can log in after unlock

---

## 📈 Performance & Scalability Tests

### 8.1 Database Query Performance

**Test Scenarios:**

1. **List Users with 1000+ records**

   - Seed database with 1000 users
   - Load admin dashboard
   - Verify page load < 2 seconds

2. **Search Performance**
   - Search with common term
   - Verify results < 500ms

**Expected Results:**

- ✅ Pagination prevents N+1 queries
- ✅ Indexes used on email, role
- ✅ Acceptable load times

---

### 8.2 Concurrent Login Tests

**Test Scenarios:**

1. **Multiple Users Logging In**

   - Simulate 10 concurrent logins
   - Verify all succeed
   - Verify no race conditions

2. **MFA Challenge Load**
   - Simulate 10 users at MFA challenge
   - Verify all can verify codes
   - Verify no session conflicts

**Expected Results:**

- ✅ Concurrent requests handled
- ✅ No session leaks
- ✅ Proper isolation

---

## 🎯 Acceptance Criteria

### Phase 9 Complete When:

- [ ] All 8 test suites executed
- [ ] All critical tests passing (marked ✅)
- [ ] No console errors during flows
- [ ] All edge cases handled gracefully
- [ ] Email notifications working via Zoho
- [ ] Admin dashboard fully functional
- [ ] Documentation updated with test results
- [ ] Known issues documented (if any)
- [ ] Performance acceptable (<2s page loads)
- [ ] Security audit passed (no critical vulnerabilities)

---

## 📝 Test Execution Template

Use this template when executing tests:

```markdown
## Test: [Test Name]

**Date:** [YYYY-MM-DD]
**Tester:** [Your Name]
**Environment:** Development/Staging/Production

### Steps Executed:

1. [Step 1] - ✅ Pass / ❌ Fail
2. [Step 2] - ✅ Pass / ❌ Fail
   ...

### Results:

- Expected: [Description]
- Actual: [Description]
- Status: ✅ Pass / ❌ Fail

### Screenshots:

[Attach screenshots if applicable]

### Issues Found:

- [Issue 1]
- [Issue 2]

### Notes:

[Additional observations]
```

---

## 🐛 Bug Report Template

If issues found during testing:

```markdown
## Bug: [Short Description]

**Severity:** Critical / High / Medium / Low
**Test:** [Test number/name where found]
**Date:** [YYYY-MM-DD]

### Steps to Reproduce:

1. [Step 1]
2. [Step 2]
   ...

### Expected Behavior:

[What should happen]

### Actual Behavior:

[What actually happens]

### Environment:

- Browser: [Chrome/Firefox/Safari]
- OS: [macOS/Windows/Linux]
- Node Version: [X.X.X]
- Next.js Version: [X.X.X]

### Console Output:
```

[Paste console errors]

```

### Screenshots:
[Attach screenshots]

### Suggested Fix:
[If known]
```

---

## 📊 Test Results Summary

After completing all tests, fill this out:

```markdown
# Auth Testing Results - Solution A

**Completion Date:** [YYYY-MM-DD]
**Total Tests:** [X]
**Tests Passed:** [X]
**Tests Failed:** [X]
**Pass Rate:** [X]%

## Test Suites Summary

| Suite                  | Tests | Pass | Fail | Notes |
| ---------------------- | ----- | ---- | ---- | ----- |
| 1. Password User Flows | 8     | X    | X    |       |
| 2. OAuth User Flows    | 5     | X    | X    |       |
| 3. Hybrid User Flows   | 2     | X    | X    |       |
| 4. Security Features   | 4     | X    | X    |       |
| 5. Admin Dashboard     | 6     | X    | X    |       |
| 6. Edge Cases          | 5     | X    | X    |       |
| 7. Integration Tests   | 3     | X    | X    |       |
| 8. Performance         | 2     | X    | X    |       |

## Critical Issues Found:

1. [Issue 1]
2. [Issue 2]

## Known Limitations:

1. [Limitation 1]
2. [Limitation 2]

## Recommendations:

1. [Recommendation 1]
2. [Recommendation 2]

## Sign-Off:

- [ ] Testing complete
- [ ] Documentation updated
- [ ] Issues logged in tracker
- [ ] Ready for production
```

---

## 🚀 Next Steps After Testing

1. **Address Critical Issues**

   - Fix any bugs found
   - Re-test failed scenarios

2. **Update Documentation**

   - Document test results
   - Update user guides

3. **Deploy to Staging**

   - Run smoke tests
   - Get user feedback

4. **Production Deployment**
   - Final security audit
   - Gradual rollout
   - Monitor metrics

---

## 📚 Reference Links

- [Solution A Architecture](./AUTH_ARCHITECTURE_REDESIGN.md)
- [Phase 1-5 Backend](./SOLUTION_A_PHASE_1-5_COMPLETE.md)
- [Phase 6 Components](./SOLUTION_A_PHASE_6_COMPLETE.md)
- [Phase 7 Pages](./SOLUTION_A_PHASE_7_COMPLETE.md)
- [Phase 8 Admin Features](./SOLUTION_A_PHASE_8_COMPLETE.md)
- [MFA API Routes](../api/API_VIDEO_ROUTES.md)

---

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Status:** Ready for Execution
