# Setting Up MFA for OAuth Users

**Problem**: You signed up with Google/Facebook/Apple and want to enable MFA, but MFA only works with email/password login.

**Solution**: Set a password for your account, then use email/password login with MFA.

---

## Step-by-Step Guide

### 1. Set a Password (If You Don't Have One)

OAuth users (Google/Facebook/Apple) don't have a password by default. You need to set one first.

#### Option A: Via Settings Page (Recommended)

1. Sign in with your OAuth provider (Google/Facebook/Apple)
2. Go to **Settings > Security**
3. Look for "Set Password" or "Change Password" section
4. Enter a new strong password
5. Save changes

#### Option B: Via "Forgot Password" Flow

1. Go to `/auth/forgot-password`
2. Enter your email address
3. Check your email for reset link
4. Set a new password
5. Verify via OTP

### 2. Enable MFA

Now that you have a password, you can enable MFA:

```bash
# Sign in with your NEW PASSWORD (not OAuth)
# Get session token from browser DevTools

# Run MFA setup
./scripts/mfa-quick-test.sh YOUR_SESSION_TOKEN
```

Or use the manual curl commands from the quickstart guide.

### 3. Test MFA Login

1. **Sign out completely**
2. Go to `/auth?mode=signin`
3. **DO NOT click Google/Facebook/Apple buttons** (they will be blocked)
4. **Enter your email and password**
5. You'll be redirected to `/auth/mfa-challenge`
6. Enter TOTP code from authenticator app
7. Success! 🎉

---

## What Happens If You Try OAuth with MFA Enabled?

When you click "Continue with Google" (or Facebook/Apple) after enabling MFA:

1. OAuth flow starts normally
2. You authenticate with Google
3. **OAuth is blocked** by our signIn callback
4. You're redirected to `/auth/error`
5. Error page explains you must use email/password

Error message shows:

> "Your account has Multi-Factor Authentication (MFA) enabled. For security reasons, you must sign in using your email and password, not social login."

---

## Why This Limitation Exists

### Technical Explanation

**OAuth flow is uninterruptible:**

```
User clicks "Google"
  → Redirect to Google
  → User signs in at Google
  → Google redirects back
  → NextAuth creates session immediately
```

There's **no step** where we can insert an MFA challenge. The session is created as soon as Google confirms the user's identity.

**Email/password flow is controllable:**

```
User enters credentials
  → We verify password
  → We check if MFA is enabled
  → If yes: create temporary token
  → Redirect to MFA challenge
  → User enters TOTP code
  → We verify code
  → Create full session
```

We control every step, so we can insert the MFA challenge.

### Security Implications

Allowing OAuth without MFA would:

- Bypass MFA entirely (defeats the purpose)
- Create inconsistent security (some logins secure, others not)
- Confuse users about their security posture

By **blocking OAuth when MFA is enabled**, we ensure:

- ✅ MFA is always enforced
- ✅ No security bypass routes
- ✅ Clear user expectations

---

## Database Queries for Testing

### Check if user has a password:

```sql
SELECT
  id,
  email,
  name,
  CASE
    WHEN "passwordHash" IS NOT NULL THEN 'HAS_PASSWORD'
    ELSE 'OAUTH_ONLY'
  END as auth_type,
  "mfaEnabled",
  "mfaMethod"
FROM "User"
WHERE email = 'your-email@example.com';
```

### Set a password manually (for testing):

```sql
-- Generate bcrypt hash for password "Test123!"
-- Use online tool or: node -e "console.log(require('bcryptjs').hashSync('Test123!', 10))"

UPDATE "User"
SET "passwordHash" = '$2a$10$...' -- Your bcrypt hash here
WHERE email = 'your-email@example.com';
```

---

## API Endpoint to Set Password (Future Enhancement)

Currently, password setting must be done via:

1. Settings page UI (if implemented)
2. Forgot password flow
3. Direct database update (dev only)

**Future TODO**: Create dedicated endpoint:

```
POST /api/auth/set-password
Body: { currentPassword?: string, newPassword: string }
```

This would allow:

- OAuth users to set initial password
- Password users to change password
- Integration with MFA setup flow

---

## Testing Checklist

- [ ] OAuth user can set a password
- [ ] User can sign in with new password
- [ ] User can enable MFA via API/scripts
- [ ] Database shows `mfaEnabled: true`
- [ ] Signing in with password triggers MFA challenge
- [ ] MFA challenge accepts TOTP codes
- [ ] Successful MFA creates full session
- [ ] Attempting OAuth with MFA enabled shows error page
- [ ] Error page explains situation clearly
- [ ] "Sign In with Email" button works from error page

---

## Related Files

- Auth error page: `src/app/(auth)/auth/error/page.tsx`
- OAuth blocking logic: `src/lib/auth.ts` (signIn callback)
- MFA challenge page: `src/app/(auth)/auth/mfa-challenge/page.tsx`
- Check MFA endpoint: `src/app/api/auth/check-mfa/route.ts`

---

## Support Cases

### "I can't sign in anymore!"

**Symptom**: User enabled MFA, but can't access their account

**Cause**: OAuth user doesn't have a password

**Solution**:

1. Use "Forgot Password" to set password
2. Sign in with email/password
3. Complete MFA challenge

### "Why is Google login not working?"

**Symptom**: Google button shows error or redirects to error page

**Cause**: MFA is enabled, OAuth is blocked

**Solution**:

1. Use email/password login instead
2. Or disable MFA if you want to use OAuth

### "Can I use Google Authenticator with Google Login?"

**Answer**: No. Google OAuth login is separate from Google Authenticator app.

- **Google OAuth**: Third-party sign-in (replaces password)
- **Google Authenticator**: TOTP app (generates MFA codes)

You can use Google Authenticator app for MFA, but you must sign in with email/password (not Google OAuth button).

---

**Status**: OAuth blocking implemented ✅  
**Next Steps**: Build password setting UI for OAuth users
