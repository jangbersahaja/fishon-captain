# Fishon Captain Environment Variables Audit

## ✅ Active Environment Variables

All variables in `.env.example` are actively used in the codebase.

### Core Database & Auth (REQUIRED)

- `DATABASE_URL` - Primary PostgreSQL connection
- `NEXTAUTH_SECRET` - NextAuth encryption secret
- `MFA_ENCRYPTION_KEY` - MFA token encryption
- `NEXTAUTH_URL` - Application base URL
- `GOOGLE_CLIENT_ID` - Google OAuth (required for login)
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

### Email (REQUIRED for OTP & Notifications)

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_SECURE` - Use TLS/SSL
- `EMAIL_FROM` - Sender email address
- `ADMIN_EMAIL` - Admin notification email (optional)

### Google Maps (REQUIRED for Location Features)

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Public Maps JS SDK
- `GOOGLE_PLACES_API_KEY` - Server-side Places API

### Media Storage (REQUIRED for Uploads)

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage
- `BLOB_HOSTNAME` - Blob storage hostname

### Optional OAuth Providers

- `FACEBOOK_CLIENT_ID` - Facebook OAuth
- `FACEBOOK_CLIENT_SECRET` - Facebook OAuth secret
- `APPLE_CLIENT_ID` - Apple OAuth
- `APPLE_CLIENT_SECRET` - Apple OAuth JWT

### Video Processing (OPTIONAL)

- `EXTERNAL_WORKER_URL` - Video normalization service
- `VIDEO_WORKER_SECRET` - Worker authentication
- `QSTASH_URL` - QStash endpoint
- `QSTASH_TOKEN` - QStash authentication
- `QSTASH_CURRENT_SIGNING_KEY` - QStash signature verification
- `QSTASH_NEXT_SIGNING_KEY` - QStash key rotation

### Fishon Market Integration (OPTIONAL)

- `MARKET_DATABASE_URL` - Direct DB access to market DB
- `FISHON_MARKET_API_URL` - Market API endpoint
- `CAPTAIN_API_SECRET` - Shared secret for captain→market calls
- `CAPTAIN_WEBHOOK_SECRET` - Webhook verification
- `CAPTAIN_WEBHOOK_URL` - Captain webhook endpoint
- `CRON_SECRET` - Cron job authentication

### Pusher Real-time (OPTIONAL)

- `PUSHER_APP_ID` - Pusher app ID
- `PUSHER_KEY` - Pusher key
- `PUSHER_SECRET` - Pusher secret
- `PUSHER_CLUSTER` - Pusher cluster
- `NEXT_PUBLIC_PUSHER_KEY` - Public Pusher key
- `NEXT_PUBLIC_PUSHER_CLUSTER` - Public cluster

### Deployment

- `NEXT_PUBLIC_SITE_URL` - Public app URL
- `VERCEL_URL` - Vercel deployment URL (auto-set)

### Development/Debugging

- `NEXT_PUBLIC_DEV_MODE` - Enable dev panel
- `ENABLE_DEV_USER_BOOTSTRAP` - Enable test user creation
- `NEXT_PUBLIC_CHARTER_FORM_DEBUG` - Form debugging logs
- `NEXT_PUBLIC_CHARTER_MAP_DEBUG` - Map debugging logs
- `NEXT_PUBLIC_CHARTER_FORM_LAZY_BUDGET_MS` - Lazy load budget
- `NEXT_PUBLIC_ENABLE_MP4_TRIM` - Enable MP4 trimming
- `NEXT_PUBLIC_VIDEO_QUEUE_DEBUG` - Video queue debugging
- `PRISMA_SUPPRESS_QUERY_LOG` - Suppress Prisma logs
- `ADMIN_BYPASS_PASSWORD` - Admin bypass authentication

## 🗑️ Unused/Legacy Variables

**None found** - All variables in `.env.local` are actively used.

However, some variables are **optional** and can be removed if features aren't needed:

### Can Remove If Not Using

- **Facebook/Apple OAuth**: `FACEBOOK_*`, `APPLE_*` if only using Google login
- **Video Processing**: `QSTASH_*`, `VIDEO_WORKER_SECRET`, `EXTERNAL_WORKER_URL` if not processing videos
- **Market Integration**: `MARKET_DATABASE_URL`, `FISHON_MARKET_API_URL`, `CAPTAIN_*` if running standalone
- **Pusher**: All `PUSHER_*` variables if not using real-time notifications
- **Development flags**: All `NEXT_PUBLIC_*_DEBUG` and `ENABLE_DEV_*` in production

## 📝 Recommendations

### 1. Minimize Production Variables

For production deployment, you only need:

```bash
# Required Core
DATABASE_URL
NEXTAUTH_SECRET
MFA_ENCRYPTION_KEY
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Required Features
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, EMAIL_FROM
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_PLACES_API_KEY
BLOB_READ_WRITE_TOKEN
BLOB_HOSTNAME

# Optional (based on features used)
PUSHER_* (if using real-time notifications)
CAPTAIN_* (if integrating with fishon-market)
EXTERNAL_WORKER_URL (if processing videos)
```

### 2. Remove Debug Variables in Production

Remove or set to `"0"` / `"false"`:

- `NEXT_PUBLIC_DEV_MODE`
- `ENABLE_DEV_USER_BOOTSTRAP`
- `NEXT_PUBLIC_CHARTER_FORM_DEBUG`
- `NEXT_PUBLIC_CHARTER_MAP_DEBUG`
- `NEXT_PUBLIC_VIDEO_QUEUE_DEBUG`
- `ADMIN_BYPASS_PASSWORD`

### 3. Consolidate SMTP Variables

Current setup uses:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`
- Consider using environment-specific config files instead

### 4. API Key Security

- Keep `GOOGLE_PLACES_API_KEY` restricted to server IP addresses
- Keep `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` restricted to HTTP referrers
- Rotate `CAPTAIN_API_SECRET` and `CAPTAIN_WEBHOOK_SECRET` regularly

## Usage Statistics

**Total variables in `.env.local`**: 42

- **Required (core)**: 6
- **Required (features)**: 11
- **Optional (OAuth)**: 6
- **Optional (integrations)**: 11
- **Development/Debug**: 8

All 42 variables are actively referenced in the codebase.
