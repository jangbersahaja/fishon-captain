# Zoho Email Configuration Guide

**Updated**: October 12, 2025  
**Email Provider**: Zoho Mail (SMTP)

## Overview

The authentication system now uses **Zoho Mail SMTP** via nodemailer for sending transactional emails (verification, password reset, security alerts).

## Environment Variables

Add these to your `.env` file:

```bash
# Zoho SMTP Configuration (Required for production)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-zoho-app-password
SMTP_SECURE=false

# Email Sender Configuration
EMAIL_FROM=noreply@fishon.my

# Application URL (for email links)
NEXTAUTH_URL=https://captain.fishon.my
```

## Zoho SMTP Settings

### Standard Configuration (Port 587 - Recommended)

```
Host: smtp.zoho.com
Port: 587
Secure: false (STARTTLS)
Auth: Required
```

### SSL Configuration (Port 465 - Alternative)

```
Host: smtp.zoho.com
Port: 465
Secure: true (SSL/TLS)
Auth: Required
```

## Getting Zoho App Password

1. **Log in to Zoho Mail Account**

   - Go to https://mail.zoho.com

2. **Navigate to Security Settings**

   - Click your profile icon (top right)
   - Go to "Account Settings"
   - Select "Security" from left menu

3. **Enable Two-Factor Authentication** (if not already enabled)

   - Required before creating app passwords

4. **Generate Application-Specific Password**
   - Find "App Passwords" or "Application-Specific Passwords"
   - Click "Generate New Password"
   - Name it: "FishOn Captain Register"
   - Copy the generated password
   - Use this password in `SMTP_PASSWORD` (NOT your regular Zoho password)

## Email Sending Limits

### Zoho Free Plan

- **500 emails per day**
- 50 MB attachment limit per email
- Rate limit: ~25 emails per hour

### Zoho Mail Lite / Premium

- **1,000+ emails per day** (varies by plan)
- Better delivery rates
- Priority support

**Recommendation**: For production with high volume, consider upgrading to paid plan.

## Testing Email Configuration

### 1. Development Mode (No SMTP configured)

If `SMTP_USER` and `SMTP_PASSWORD` are not set, emails will be logged to console:

```bash
[email] SMTP not configured - email would be sent: { to: 'user@example.com', subject: '...' }
[email] Email content: <html>...</html>
```

### 2. Production Mode (SMTP configured)

Successful email:

```bash
[email] Zoho SMTP transporter initialized { host: 'smtp.zoho.com', port: 587, ... }
[email] Email sent successfully via Zoho SMTP { to: '...', messageId: '...', accepted: [...] }
```

Failed email:

```bash
[email] Failed to send email via Zoho SMTP { error: '...' }
```

### 3. Manual Test

Create a test route to verify email sending:

```typescript
// app/api/test-email/route.ts
import { sendVerificationEmail } from "@/lib/email";

export async function GET() {
  const result = await sendVerificationEmail(
    "test@example.com",
    "Test User",
    "test-token-123"
  );

  return Response.json({
    success: result,
    message: result ? "Email sent" : "Failed to send email",
  });
}
```

Access: `https://your-domain.com/api/test-email`

## Password Requirements

### Current Requirements (Enforced)

✅ **Minimum 12 characters** (increased from 8)  
✅ **At least 1 uppercase letter** (A-Z)  
✅ **At least 1 lowercase letter** (a-z)  
✅ **At least 1 number** (0-9)  
✅ **At least 1 special character** (!@#$%^&\*()\_+-=[]{}...) - **REQUIRED**

### Additional Validation

❌ Cannot contain the word "password"  
❌ Cannot be a repeated character (e.g., "aaaaaaaaaaaa")  
❌ Cannot contain sequential numbers (e.g., "123", "789")  
❌ Cannot contain sequential letters (e.g., "abc", "xyz")  
❌ Blocks common passwords (password123, qwerty, etc.)  
❌ Minimum entropy check (randomness requirement)

### Examples

**❌ Invalid Passwords:**

```
Password123      - No special character, contains "password"
Abcdefgh123      - No special character
Test@123         - Too short (only 8 characters)
AAAA@1234567     - Repeated characters
Test@1234567     - Sequential numbers
```

**✅ Valid Passwords:**

```
MyP@ssw0rd2024!  - 15 chars, mixed case, number, special
Tr0pic@lFish!99  - 15 chars, mixed case, numbers, special
Capt@inF1sh#2025 - 16 chars, mixed case, numbers, special
S3cur3P@ss!Code  - 15 chars, mixed case, numbers, special
```

## Email Templates

The system includes three professional email templates:

### 1. Email Verification

- Sent on signup
- 24-hour expiry
- Gradient design (purple theme)
- Call-to-action button + fallback link

### 2. Password Reset

- Sent on forgot password request
- 1-hour expiry
- Security warnings
- Reset password button + fallback link

### 3. Account Lockout Alert

- Sent after 5 failed login attempts
- Red/warning theme
- Shows lockout duration (15 minutes)
- Reset password option

All templates include:

- Responsive HTML design
- Plain text fallback
- Security notices
- Company branding

## Troubleshooting

### Issue: "Authentication failed"

**Solution**:

- Verify you're using an **app-specific password**, not your regular password
- Ensure 2FA is enabled on your Zoho account
- Check username format: use full email address

### Issue: "Connection timeout"

**Solution**:

- Check firewall/network allows outbound SMTP (port 587)
- Try alternative port 465 with `SMTP_SECURE=true`
- Verify `SMTP_HOST` is correct

### Issue: "Sender address rejected"

**Solution**:

- Ensure `EMAIL_FROM` matches your Zoho email domain
- Add sender email in Zoho Mail settings
- Verify domain ownership in Zoho console

### Issue: "Rate limit exceeded"

**Solution**:

- Check Zoho daily/hourly limits
- Implement email queuing for bulk operations
- Consider upgrading Zoho plan

### Issue: Emails go to spam

**Solution**:

- Set up SPF record: `v=spf1 include:zoho.com ~all`
- Set up DKIM in Zoho admin console
- Set up DMARC policy
- Verify domain with Zoho

## DNS Records (Production)

Add these DNS records to improve deliverability:

### SPF Record

```
Type: TXT
Host: @
Value: v=spf1 include:zoho.com ~all
```

### DKIM Record

Get from Zoho Mail admin console → Email Configuration → DKIM

### DMARC Record

```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## Migration from Resend

The email service was updated from Resend to Zoho SMTP. Key changes:

**Before (Resend)**:

```bash
RESEND_API_KEY=re_xxxxxxxxxx
```

**After (Zoho)**:

```bash
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=false
```

No code changes needed - email functions work identically:

- `sendVerificationEmail()`
- `sendPasswordResetEmail()`
- `sendAccountLockedEmail()`

## Security Best Practices

1. **Never commit credentials** - Use environment variables only
2. **Use app-specific passwords** - Don't use your main Zoho password
3. **Enable 2FA** - Required for app passwords
4. **Rotate passwords regularly** - Change app passwords every 90 days
5. **Monitor email logs** - Check for suspicious activity
6. **Rate limit email sending** - Prevent abuse
7. **Validate recipient addresses** - Avoid bounces

## Support

**Zoho Mail Support**: https://www.zoho.com/mail/help/  
**SMTP Documentation**: https://www.zoho.com/mail/help/zoho-smtp.html  
**App Passwords Guide**: https://www.zoho.com/mail/help/adminconsole/two-factor-authentication.html

---

**Last Updated**: October 12, 2025  
**Maintained By**: FishOn Development Team
