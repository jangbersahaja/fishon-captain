# Vercel Production Configuration Guide

## Quick Setup Checklist

### 1. Shared Credentials (Must Match Between Apps)

```bash
# Generate once, use in BOTH apps
CAPTAIN_WEBHOOK_SECRET="$(openssl rand -base64 32)"

# Same Pusher app for both
PUSHER_APP_ID="12345"
PUSHER_KEY="abc123"
PUSHER_SECRET="xyz789"
PUSHER_CLUSTER="ap1"

# Same SMTP for brand consistency
SMTP_HOST="smtp.zoho.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@fishon.my"
SMTP_PASS="your-zoho-app-password"
```

### 2. Unique Credentials (Must Be Different)

```bash
# fishon-captain
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Captain secret

# fishon-market
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Market secret (DIFFERENT!)
TAC_SECRET="$(openssl rand -base64 32)"  # Market TAC secret
```

### 3. Cross-App URLs (Point to Each Other)

```bash
# fishon-captain → points to market
FISHON_MARKET_API_URL="https://fishon.my"

# fishon-market → points to captain
FISHON_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
NEXT_PUBLIC_CAPTAIN_API_URL="https://fishon-captain.vercel.app"
CAPTAIN_WEBHOOK_URL="https://fishon-captain.vercel.app/api/webhooks/booking"
```

### 4. Database Strategy

#### Option A: Separate Databases (Recommended)

```bash
# fishon-captain
DATABASE_URL="postgresql://...@host/fishon_captain?sslmode=require"

# fishon-market
DATABASE_URL="postgresql://...@host/fishon_market?sslmode=require"
CAPTAIN_DATABASE_URL="postgresql://market_reader:...@host/fishon_captain?sslmode=require"
```

#### Option B: Shared Database (Not Recommended)

```bash
# Both apps use same DATABASE_URL (but different schemas/tables)
# fishon-market still needs CAPTAIN_DATABASE_URL for read-only access
```

## Vercel Deployment Steps

### fishon-captain

1. Go to Vercel → fishon-captain project → Settings → Environment Variables
2. Copy all variables from `.env.example.vercel`
3. Set these as Production variables
4. Important values:
   - `NEXTAUTH_SECRET` - Generate new
   - `MFA_ENCRYPTION_KEY` - Generate new
   - `CAPTAIN_WEBHOOK_SECRET` - **Save this for market app**
   - `FISHON_MARKET_API_URL` - Set to market domain
5. Redeploy

### fishon-market

1. Go to Vercel → fishon-market project → Settings → Environment Variables
2. Copy all variables from `.env.example.vercel`
3. Set these as Production variables
4. Important values:
   - `NEXTAUTH_SECRET` - Generate new (DIFFERENT from captain)
   - `TAC_SECRET` - Generate new
   - `CAPTAIN_WEBHOOK_SECRET` - **Use SAME value from captain app**
   - `FISHON_CAPTAIN_API_URL` - Set to captain domain
   - `CAPTAIN_DATABASE_URL` - Set to captain database (read-only user)
5. Redeploy

## Video Processing Setup (fishon-captain)

### Without Video Processing (Basic Setup)

```bash
# Only BLOB storage required
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
VERCEL_BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token"
BLOB_HOSTNAME="your-bucket.public.blob.vercel-storage.com"
```

**What works:**

- ✅ Captains can upload videos
- ✅ Videos stored in Vercel Blob
- ✅ Videos playable (if compatible format)

**Limitations:**

- ❌ No video compression/optimization
- ❌ No thumbnail generation
- ❌ Large file sizes (can be 100MB+)
- ❌ Format compatibility issues (only certain codecs work)
- ⚠️ Poor user experience (long load times, incompatible videos)

### With Video Processing (Recommended for Production)

```bash
# All blob variables above, PLUS:
EXTERNAL_WORKER_URL="https://fishon-video-worker.vercel.app/api/worker-normalize"
VIDEO_WORKER_SECRET="your-video-worker-secret"

# Optional but recommended for production:
QSTASH_URL="https://qstash.upstash.io/v2/publish"
QSTASH_TOKEN="your-qstash-token"
QSTASH_CURRENT_SIGNING_KEY="qstash-signing-key"
QSTASH_NEXT_SIGNING_KEY="qstash-next-key"
```

**Benefits:**

- ✅ Videos compressed to 720p (smaller file sizes)
- ✅ Thumbnails auto-generated
- ✅ Format normalization (H.264/AAC - universal compatibility)
- ✅ Better performance (faster loading)
- ✅ Better UX (progress indicators, preview thumbnails)

**Setup Required:**

1. Deploy `fishon-video-worker` to Vercel
2. Configure `EXTERNAL_WORKER_URL` pointing to worker
3. Set matching `VIDEO_WORKER_SECRET` in both apps
4. (Optional) Setup QStash for async processing

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is different between apps
- [ ] `CAPTAIN_WEBHOOK_SECRET` is the same between apps
- [ ] `MFA_ENCRYPTION_KEY` is unique and secure (captain only)
- [ ] `TAC_SECRET` is unique and secure (market only)
- [ ] Pusher credentials match exactly (if using real-time)
- [ ] Google OAuth credentials are valid for production domains
- [ ] SMTP password is an app-specific password (not account password)
- [ ] Database URLs use `sslmode=require` for security
- [ ] No debug flags (NEXT*PUBLIC*\*\_DEBUG) in production
- [ ] No dev-only secrets (ADMIN_BYPASS_PASSWORD, EMAIL_TEST_SECRET)
- [ ] Video processing configured (if using video features)

## Variable Count Summary

| App                | Total Prod Vars | Required | Optional |
| ------------------ | --------------- | -------- | -------- |
| **fishon-captain** | ~25             | 17       | 8        |
| **fishon-market**  | ~20             | 14       | 6        |

## Common Issues & Solutions

### Issue: Webhooks return 401/403

**Solution:** Verify `CAPTAIN_WEBHOOK_SECRET` matches in both apps

### Issue: No charter data in market

**Solution:** Check `CAPTAIN_DATABASE_URL` or `FISHON_CAPTAIN_API_URL`

### Issue: Real-time notifications not working

**Solution:** Verify all Pusher credentials match exactly between apps

### Issue: Google OAuth fails

**Solution:**

1. Add production URLs to Google OAuth console
2. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Verify `NEXTAUTH_URL` matches your domain

### Issue: Email not sending

**Solution:**

1. Use app-specific password for SMTP
2. Test with `EMAIL_VERIFY_AT_START="true"` in preview environment
3. Check Zoho SMTP logs

## Testing Production Config

### Test captain app

```bash
# After deployment, verify:
curl https://fishon-captain.vercel.app/api/health
# Should return 200 OK

# Test auth:
# Visit: https://fishon-captain.vercel.app/login
```

### Test market app

```bash
# After deployment, verify:
curl https://fishon.my/api/health
# Should return 200 OK

# Test charter data:
# Visit: https://fishon.my/charters
# Should show charters from captain DB
```

### Test integration

1. Create booking in market → Should send webhook to captain
2. Captain approves booking → Should send notification to market
3. Real-time notification → Should appear instantly (if Pusher configured)

## Quick Copy-Paste Template

### Generate all secrets at once

```bash
echo "# fishon-captain secrets"
echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\""
echo "MFA_ENCRYPTION_KEY=\"$(openssl rand -base64 32)\""
echo "CAPTAIN_API_SECRET=\"$(openssl rand -base64 32)\""
echo ""
echo "# fishon-market secrets"
echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\""
echo "TAC_SECRET=\"$(openssl rand -base64 32)\""
echo "BOOKINGS_EXPIRE_SECRET=\"$(openssl rand -base64 32)\""
echo "CRON_SECRET=\"$(openssl rand -base64 32)\""
echo ""
echo "# Shared secrets (use SAME value in both apps)"
echo "CAPTAIN_WEBHOOK_SECRET=\"$(openssl rand -base64 32)\""
```

Copy the output and use in Vercel environment variables!
