# MFA Setup - Understanding the Two-Step Process

## 🤔 Why Two Steps?

MFA setup requires **two API calls** for security reasons:

### Step 1: `/api/auth/mfa/setup` - Generate Credentials

- Creates TOTP secret
- Generates QR code
- Creates backup codes
- **Does NOT enable MFA yet!**
- Returns temporary encrypted tokens

### Step 2: `/api/auth/mfa/verify-setup` - Enable MFA

- Verifies you can generate valid TOTP codes
- Confirms authenticator app is configured correctly
- **Actually enables MFA in database**
- Sets `mfaEnabled = true`, saves encrypted secrets

## 🔒 Security Rationale

This two-step process prevents:

1. **Lockout scenarios** - If setup fails midway, user can still sign in normally
2. **Misconfigured authenticators** - Ensures user can generate valid codes before enabling
3. **Lost backup codes** - User must successfully complete setup before codes are saved

## 📊 Database State by Step

| Column           | After Setup | After Verify  | Notes        |
| ---------------- | ----------- | ------------- | ------------ |
| `mfaEnabled`     | `false`     | `true`        | Main flag    |
| `mfaMethod`      | `null`      | `'TOTP'`      | Method type  |
| `mfaSecret`      | `null`      | `encrypted`   | TOTP secret  |
| `mfaBackupCodes` | `null`      | `[encrypted]` | Backup codes |

## 🧪 Testing with Scripts

### Quick Interactive Test (Recommended)

```bash
./scripts/mfa-quick-test.sh YOUR_SESSION_TOKEN
```

**What it does:**

1. Calls `/api/auth/mfa/setup`
2. Shows manual entry code
3. Waits for you to add code to authenticator
4. Prompts for verification code
5. Calls `/api/auth/mfa/verify-setup`
6. Confirms MFA is enabled in database

### Manual Two-Step Test

```bash
# Step 1: Setup
./scripts/test-mfa-setup.sh YOUR_SESSION_TOKEN

# Add code to authenticator app

# Step 2: Verify
./scripts/complete-mfa-setup.sh YOUR_SESSION_TOKEN 123456 /tmp/setup.json
```

## ✅ Verification Checklist

After running verify-setup, confirm in database:

```sql
SELECT
  id,
  email,
  "mfaEnabled",
  "mfaMethod",
  CASE WHEN "mfaSecret" IS NOT NULL THEN 'SET' ELSE 'NULL' END as secret_status,
  array_length("mfaBackupCodes", 1) as backup_codes_count
FROM "User"
WHERE email = 'your-test-email@example.com';
```

**Expected result:**

- `mfaEnabled`: `true`
- `mfaMethod`: `TOTP`
- `secret_status`: `SET`
- `backup_codes_count`: `8`

## 🐛 Common Issues

### Issue: Database still shows `mfaEnabled: false`

**Cause:** Only ran `/api/auth/mfa/setup`, didn't call `/api/auth/mfa/verify-setup`

**Solution:** Complete step 2 with verification code from authenticator

### Issue: "Invalid code" error on verify-setup

**Causes:**

- TOTP code expired (30-second window)
- Wrong code entered
- Authenticator app not synced
- Time drift on server

**Solutions:**

- Wait for new code and try immediately
- Check server time: `date`
- Sync authenticator app time

### Issue: "MFA already enabled" error

**Cause:** Setup already completed for this user

**Solution:**

- Disable MFA first: `POST /api/auth/mfa/disable`
- Or test with different user

## 📱 Authenticator App Setup

1. Open authenticator app (Google Authenticator, Authy, etc.)
2. Add new account
3. Choose "Enter setup key" (not scan QR)
4. Enter the `manualEntry` code from setup response
5. Name it (e.g., "FishOn Captain")
6. Save
7. Use the 6-digit code for verification

## 🎯 Next Steps After Setup

1. **Test login flow:**

   - Sign out
   - Sign in with credentials
   - Should redirect to `/auth/mfa-challenge`
   - Enter TOTP code
   - Should complete authentication

2. **Test backup codes:**

   - Repeat login flow
   - Click "Use backup code"
   - Enter one of your backup codes
   - Should work once, then be consumed

3. **Verify database state:**
   - Check `mfaEnabled = true`
   - Verify backup code count decreases after use
   - Confirm audit logs created

## 📚 Related Documentation

- **API Reference**: `docs/api/API_MFA_ROUTES.md`
- **Quick Start**: `docs/api/MFA_QUICKSTART.md`
- **Architecture**: `docs/guides/MFA_IMPLEMENTATION.md`
- **NextAuth Integration**: `docs/api/MFA_NEXTAUTH_INTEGRATION.md`
