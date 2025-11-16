# OAuth Account Linking Implementation

## Overview

This document describes the secure manual account linking implementation that allows users with email/password accounts to link their Google OAuth account for flexible sign-in options.

## Key Features

- **Secure Linking**: Email verification ensures only the account owner can link OAuth
- **Flexible Sign-In**: Users can sign in with either email/password or Google OAuth
- **Account Protection**: Cannot unlink OAuth if no password is set
- **Single Data Account**: Both auth methods access the same user account and data

## Architecture

### Components

#### 1. API Endpoints

**POST `/api/account/link-oauth/initiate`**

- Initiates OAuth account linking flow
- Generates secure linking token (10-minute expiry)
- Returns Google OAuth authorization URL with state parameter
- Security: Must be authenticated with email/password account

**GET `/api/account/link-oauth/callback`**

- Handles OAuth provider redirect after authorization
- Validates state parameter and linking token
- Exchanges authorization code for OAuth tokens
- Verifies email matches between accounts
- Creates Account record linking OAuth to user
- Security: Prevents linking if Google account already used by another user

**DELETE `/api/account/link-oauth/unlink`**

- Unlinks OAuth account from user
- Deletes Account record for specified provider
- Security: Requires password to be set (prevents account lockout)

**GET `/api/account/linked-accounts`**

- Fetches user's linked OAuth accounts
- Returns list of providers and hasPassword status

#### 2. UI Components

**`OAuthAccountLinking.tsx`**

- Client component for account linking interface
- Displays linked account status
- Link/unlink buttons with loading states
- Confirmation dialog for unlinking
- URL parameter handling for callback messages
- Toast notifications for success/error states

#### 3. Settings Page

**`/captain/settings`**

- Account Security section with OAuth linking interface
- Positioned before Notifications and PWA settings

## Security Measures

### 1. Email Verification

```typescript
// Verify email matches between accounts
if (googleUser.email !== user.email) {
  return error("Google email does not match your account email");
}
```

### 2. Duplicate Account Prevention

```typescript
// Check if Google account already linked to another user
const existingAccount = await prisma.account.findUnique({
  where: {
    provider_providerAccountId: {
      provider: "google",
      providerAccountId: googleUser.id,
    },
  },
});
```

### 3. Linking Token Security

- Generated with crypto.randomBytes(32) - 256 bits of entropy
- 10-minute expiration window
- Single-use (cleared after successful linking)
- Stored temporarily in user record

### 4. Password Protection

- Cannot unlink OAuth if no password is set
- Prevents account lockout scenarios
- UI clearly indicates password requirement

### 5. Session Validation

- All endpoints require valid session
- NextAuth session management
- JWT-based authentication

## User Flow

### Linking Flow

1. **User initiates linking**
   - Navigate to Settings → Account Security
   - Click "Link Account" on Google row
   - POST `/api/account/link-oauth/initiate`

2. **Server generates linking token**
   - Creates secure token with 10-minute expiry
   - Stores token in database
   - Generates OAuth URL with state parameter

3. **User authorizes with Google**
   - Redirects to Google OAuth consent screen
   - User grants permissions
   - Google redirects to callback endpoint

4. **Server completes linking**
   - Validates state and token
   - Exchanges code for tokens
   - Verifies email matches
   - Creates Account record
   - Redirects to settings with success message

### Unlinking Flow

1. **User initiates unlinking**
   - Click "Unlink" button
   - Confirmation dialog appears

2. **User confirms**
   - Server verifies password exists
   - Deletes Account record
   - Success message displayed

## Database Schema

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String?   // NULL for OAuth-only, set for email/password
  accounts     Account[] // OAuth provider accounts
  // ... other fields
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth"
  provider          String  // "google"
  providerAccountId String  // Google user ID
  access_token      String?
  refresh_token     String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  user              User    @relation(fields: [userId], references: [id])

  @@unique([provider, providerAccountId])
}
```

## Environment Variables

Required:

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - Application URL for OAuth redirects

Removed (no longer needed):

- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `APPLE_CLIENT_ID`
- `APPLE_CLIENT_SECRET`

## Auth Configuration

`allowDangerousEmailAccountLinking: false` remains set on all providers. Account linking is done manually through the secure flow, not automatically by NextAuth.

## Testing Checklist

### Linking Tests

- [ ] Link Google account to email/password account
- [ ] Verify email must match between accounts
- [ ] Cannot link Google account already used by another user
- [ ] Cannot link if already linked
- [ ] Linking token expires after 10 minutes
- [ ] User can sign in with both methods after linking

### Unlinking Tests

- [ ] Unlink Google account (with password set)
- [ ] Cannot unlink if no password set
- [ ] User can still sign in with email/password after unlinking
- [ ] Can re-link same Google account after unlinking

### Security Tests

- [ ] Linking requires valid session
- [ ] Cannot link without matching email
- [ ] State parameter prevents CSRF attacks
- [ ] Token single-use enforcement
- [ ] Password protection for unlinking

## Future Enhancements

1. **Database Table for Linking Tokens**
   - Currently using `resetPasswordToken` field
   - Dedicated `LinkingToken` table would be cleaner
   - Allows multiple concurrent linking attempts

2. **Additional OAuth Providers**
   - Framework supports adding more providers
   - Same security pattern applies
   - Update UI to show all providers

3. **Account Linking History**
   - Audit log of linking/unlinking events
   - Track when accounts were linked
   - Security monitoring

4. **Two-Factor Authentication**
   - Require 2FA for account linking
   - Additional security layer
   - Prevents unauthorized linking

## Migration Notes

### Removed Providers

Apple and Facebook OAuth providers have been removed:

- Updated `src/lib/auth.ts` - removed imports and provider configs
- Updated `src/lib/env.ts` - removed environment variables
- Updated `oauthProviders` array - only Google remains

### Existing Users

Users with existing Facebook or Apple accounts:

- Will lose access via those providers
- Can set a password to regain access
- Can link Google account if desired

### Environment Variables

Remove from `.env` and hosting platform:

```
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_CLIENT_SECRET
```

## Support

For issues or questions:

1. Check TypeScript compilation: `npm run typecheck`
2. Review console logs for detailed error messages
3. Verify environment variables are set correctly
4. Check database Account records for linked providers
