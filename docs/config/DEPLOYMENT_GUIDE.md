---
generated_by: docs-consolidation-bot
generated_at: 2025-10-17T04:26:24Z
sources:
  - docs/DEPLOYMENT_CHECKLIST.md
---

# deployment-checklist

---- SOURCE: docs/DEPLOYMENT_CHECKLIST.md ----

# Deployment Checklist

## ✅ Pre-Deployment Verification (Completed)

### Build Status

- ✅ **Environment Variables**: All required variables configured

  - DATABASE_URL
  - NEXTAUTH_SECRET
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  - GOOGLE_PLACES_API_KEY
  - BLOB_READ_WRITE_TOKEN (Vercel Blob)
  - QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
  - EXTERNAL_WORKER_URL
  - NEXT_PUBLIC_SITE_URL

- ✅ **TypeScript**: No compilation errors
- ✅ **Production Build**: Successfully completed with Turbopack
- ✅ **Tests**: All 10 tests passing (3 test files)
- ✅ **Database Migrations**: Schema up to date (9 migrations)

### Code Quality

- ✅ No TypeScript errors
- ✅ All tests passing
- ⚠️ Minor markdown linting issues in documentation (non-blocking)

## 🚀 Deployment Steps

### For Vercel Deployment

1. **Set Environment Variables in Vercel Dashboard**

   ```bash
   # Required for production
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
   NEXTAUTH_URL=https://your-domain.vercel.app

   # Google OAuth
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...

   # Google Maps
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
   GOOGLE_PLACES_API_KEY=...

   # Vercel Blob Storage
   BLOB_READ_WRITE_TOKEN=...

   # QStash (for video processing)
   QSTASH_TOKEN=...
   QSTASH_CURRENT_SIGNING_KEY=...
   QSTASH_NEXT_SIGNING_KEY=...

   # External Worker (video normalization)
   EXTERNAL_WORKER_URL=https://your-worker-url.com
   VIDEO_WORKER_SECRET=<generate-secret>

   # Email (Zoho SMTP)
   EMAIL_HOST=smtppro.zoho.com
   EMAIL_PORT=587
   EMAIL_USER=...
   EMAIL_PASSWORD=...
   EMAIL_FROM=...

   # Site Config
   NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
   ```

2. **Deploy to Vercel**

   ```bash
   # Option 1: Push to GitHub (automatic deployment)
   git push origin main

   # Option 2: Deploy directly with Vercel CLI
   vercel --prod
   ```

3. **Run Database Migrations on Production**

   ```bash
   # SSH into Vercel or use Vercel CLI
   npx prisma migrate deploy
   ```

4. **Verify Deployment**
   - [ ] Homepage loads correctly
   - [ ] Auth flow works (signin/signup)
   - [ ] Google OAuth login works
   - [ ] Password reset flow works
   - [ ] OTP verification works
   - [ ] Captain registration form loads
   - [ ] File uploads work (Vercel Blob)
   - [ ] Video uploads and processing work
   - [ ] Staff dashboard accessible
   - [ ] Admin security page accessible

### For Self-Hosted Deployment

1. **Install Dependencies**

   ```bash
   npm ci --production
   ```

2. **Build the Application**

   ```bash
   npm run build
   ```

3. **Run Database Migrations**

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Start the Server**
   ```bash
   npm start
   # Or use PM2 for production
   pm2 start npm --name "fishon-captain" -- start
   ```

## 📋 Post-Deployment Tasks

### Immediate Verification

- [ ] Test user registration flow
- [ ] Test user login (both password and OAuth)
- [ ] Test forgot password flow
- [ ] Test charter registration form
- [ ] Test file uploads
- [ ] Test video uploads and processing
- [ ] Verify email notifications are sent
- [ ] Check staff dashboard functionality
- [ ] Verify admin security features

### Monitoring Setup

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up performance monitoring

### Security

- [ ] Review and update CORS policies
- [ ] Verify rate limiting is working
- [ ] Test account lockout after failed logins
- [ ] Verify email verification is required
- [ ] Test password history validation
- [ ] Verify MFA options are available

## 🔧 Troubleshooting

### Common Issues

**Database Connection Errors**

- Verify DATABASE_URL is correct
- Check database is accessible from deployment environment
- Verify SSL mode is set correctly for your database provider

**OAuth Not Working**

- Verify Google OAuth credentials
- Add production URL to Google OAuth allowed redirect URIs
- Ensure NEXTAUTH_URL matches your production domain

**Email Not Sending**

- Verify SMTP credentials
- Check EMAIL_HOST and EMAIL_PORT
- Verify email provider allows SMTP access

**Video Processing Not Working**

- Verify EXTERNAL_WORKER_URL is accessible
- Check VIDEO_WORKER_SECRET matches between app and worker
- Verify QStash credentials are correct
- Check Vercel Blob token has write permissions

**Upload Errors**

- Verify BLOB_READ_WRITE_TOKEN is set
- Check Vercel Blob storage limits
- Verify file size limits in code match infrastructure

## 📊 Performance Considerations

### Recommended Settings

- Enable gzip compression
- Configure CDN for static assets
- Set appropriate cache headers
- Enable image optimization (Next.js built-in)
- Consider edge deployment for better global performance

### Database

- Configure connection pooling (already using Neon pooler)
- Set up read replicas if needed
- Monitor query performance
- Set up database backups

### Caching Strategy

- API routes use `cache: "no-store"` for fresh data
- Static pages are pre-rendered where possible
- Consider adding Redis for session storage if scaling

## 📝 Environment-Specific Notes

### Development

- Uses local database or development database
- Hot reload enabled with Turbopack
- Verbose logging enabled
- Email may use test mode

### Staging

- Should mirror production environment
- Use separate database
- Enable verbose logging for debugging
- Consider using test payment methods

### Production

- Minimize logging (errors only)
- Enable all security features
- Configure proper backup strategy
- Set up monitoring and alerts
- Use production SMTP for emails
- Enable rate limiting

## 🎯 Success Criteria

The deployment is successful when:

- ✅ All environment variables are set correctly
- ✅ Application builds without errors
- ✅ Database migrations run successfully
- ✅ All critical user flows work end-to-end
- ✅ Authentication and authorization work properly
- ✅ File uploads and video processing work
- ✅ Email notifications are sent successfully
- ✅ No console errors on key pages
- ✅ API responses are within acceptable latency
- ✅ Security features are functioning (rate limiting, account lockout, etc.)

## 📞 Support

For deployment issues:

1. Check application logs in Vercel dashboard
2. Review database logs
3. Check external service status (Google OAuth, Zoho, QStash)
4. Review recent code changes in Git history
5. Consult documentation in `/docs` folder

---

**Last Updated**: October 14, 2025
**Build Status**: ✅ Ready for deployment
**Database Schema**: Up to date (9 migrations)
**Test Status**: ✅ All tests passing (10/10)



## TODO: Review & Clean
- [ ] Remove small duplicated lines / housekeeping.
- [ ] Move anything clearly obsolete into Archive section below.

### Archive / Legacy (moved)
> All originals moved to docs-archived/deployment-checklist/
