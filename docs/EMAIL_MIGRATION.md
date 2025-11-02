---
type: guide
status: active
updated: 2025-01-28
feature: email-system
author: copilot
---

# Email System Migration Guide

**Migration Date:** October 28, 2025  
**New Package:** `@fishon/email` (git+https://github.com/jangbersahaja/fishon-email)

## Overview

The email system has been refactored from inline HTML string templates to a professional React Email component-based system. This migration provides:

- ✅ Beautiful, responsive email designs
- ✅ Live preview during development
- ✅ Type-safe email templates
- ✅ Shared components across all Fishon applications
- ✅ Easy maintenance and updates

## ⚠️ What Changed

### OLD System (DEPRECATED)

```typescript
// ❌ Don't use these anymore
import {
  sendCaptainRegistrationNotification,
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendPasswordChangedNotification,
} from "@/lib/email";

// Inline HTML string templates - hard to maintain
await sendVerificationOTP(email, firstName, code);
```

### NEW System (Current)

```typescript
// ✅ Use this instead
import {
  sendCaptainRegistration,
  sendVerificationCode,
  sendPasswordChangedEmail,
} from "@/lib/services/email-service";

// React Email components - professional design
await sendVerificationCode({
  to: email,
  userName: firstName,
  code: code,
  purpose: "registration",
  expiryMinutes: 5,
});
```

## Migration Steps

### Step 1: Update Imports

**Before:**

```typescript
import { sendVerificationOTP } from "@/lib/email";
```

**After:**

```typescript
import { sendVerificationCode } from "@/lib/services/email-service";
```

### Step 2: Replace Email Functions

#### Captain Registration Email

**Before:**

```typescript
await sendCaptainRegistrationNotification({
  to: captain.email,
  name: captain.firstName,
});
```

**After:**

```typescript
await sendCaptainRegistration({
  to: captain.email,
  captainName: captain.firstName,
  nextSteps: [
    "Complete your profile",
    "Add your boat details",
    "Set up your first charter",
  ],
  dashboardUrl: `${baseUrl}/captain/dashboard`,
  ccAdmin: "admin@fishon.my", // Optional CC to admin
});
```

#### Verification OTP Email

**Before:**

```typescript
await sendVerificationOTP(user.email, user.firstName, otpCode);
```

**After:**

```typescript
await sendVerificationCode({
  to: user.email,
  userName: user.firstName,
  code: otpCode,
  purpose: "registration", // or "login", "password_reset", "profile_update"
  expiryMinutes: 5,
});
```

#### Password Reset OTP Email

**Before:**

```typescript
await sendPasswordResetOTP(user.email, user.firstName, resetCode);
```

**After:**

```typescript
await sendVerificationCode({
  to: user.email,
  userName: user.firstName,
  code: resetCode,
  purpose: "password_reset",
  expiryMinutes: 5,
});
```

#### Password Changed Notification

**Before:**

```typescript
await sendPasswordChangedNotification(
  user.email,
  user.firstName,
  "reset" // or "change"
);
```

**After:**

```typescript
await sendPasswordChangedEmail({
  to: user.email,
  userName: user.firstName,
  changeType: "reset", // or "changed"
  timestamp: new Date().toLocaleString(),
});
```

#### Welcome Email (New)

```typescript
await sendWelcomeEmail({
  to: captain.email,
  captainName: captain.firstName,
  loginUrl: `${baseUrl}/captain/login`,
});
```

## Available Email Functions

All functions are exported from `@/lib/services/email-service`:

### Captain Onboarding

- `sendCaptainRegistration()` - Registration success with next steps
- `sendWelcomeEmail()` - Welcome new captains

### Auth & Verification

- `sendVerificationCode()` - Universal TAC code email (4 purposes)
- `sendPasswordChangedEmail()` - Password reset/change notifications

## Files Modified

- **New:** `src/lib/services/email-service.ts` - New email service layer
- **Deprecated:** `src/lib/email.ts` - Legacy email functions (kept for compatibility)

## API Routes to Update

The following API routes need to be updated to use the new email system:

### Auth Routes

- [ ] `/api/auth/register` - POST (registration + OTP)
- [ ] `/api/auth/send-otp` - POST (login OTP)
- [ ] `/api/auth/forgot-password` - POST (password reset OTP)
- [ ] `/api/captain/profile` - PATCH (profile update verification)

### Captain Routes

- [ ] Captain signup flow (registration notification)
- [ ] Profile update confirmations

## VerificationCode Purpose Types

The new `sendVerificationCode()` function supports 4 purpose types:

1. **`registration`** - Account registration verification
2. **`login`** - Login authentication code
3. **`password_reset`** - Password reset code
4. **`profile_update`** - Profile change verification

Each purpose type has custom messaging and styling in the email template.

## Testing

After migration:

1. **Test Email Rendering:**

   ```bash
   cd packages/fishon-email
   npm run dev
   ```

   Visit <http://localhost:3000> to preview all email templates

2. **Test Email Sending:**
   - Register new captain account
   - Request login OTP
   - Reset password
   - Update profile
   - Verify emails are sent correctly

3. **Verify SMTP Configuration:**

   ```env
   SMTP_HOST=smtppro.zoho.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=no-reply@fishon.my
   SMTP_PASSWORD=your_zoho_password
   EMAIL_FROM=no-reply@fishon.my
   ```

## Rollback Plan

If issues occur, legacy functions are still available:

```typescript
import { sendVerificationOTP } from "@/lib/email";
// Legacy code still works - just deprecated
```

## Next Steps

1. Update all API routes to use new email service
2. Test thoroughly in development
3. Deploy to staging
4. Monitor email delivery
5. Remove legacy code after 30 days

## Support

- **Package Repo:** <https://github.com/jangbersahaja/fishon-email>
- **Issue Template:** Use `[EMAIL]` prefix for email-related issues
- **Contact:** @fishon-dev-team

---

**Last Updated:** October 28, 2025
