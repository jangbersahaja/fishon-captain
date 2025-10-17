# Features Documentation Index

> **Last Updated:** 2025-10-17  
> **Status:** Reorganization in progress

This directory contains consolidated feature documentation for the FishOn Captain Register platform. Each document follows a standardized format with frontmatter metadata and focuses on current implementation state and future plans.

---

## 📚 Core Feature Documentation

### 🎥 [Video Upload System](./VIDEO-UPLOAD-SYSTEM.md)

**Status:** Active | **Type:** Feature

Comprehensive video upload, processing, and management system.

**Key Topics:**

- Client-side queue-based uploads with retry logic
- 30-second video trimming enforcement
- Dual-pipeline architecture (NEW + Legacy)
- External worker normalization to 720p
- IndexedDB persistence across page refreshes

**Related:** `EnhancedVideoUploader`, `VideoTrimModal`, `VideoManager`, `/api/videos/*`

---

### 🔐 Authentication System

**Status:** TBD | **Type:** Feature

Multi-factor authentication, OTP verification, password management.

**Topics to consolidate:**

- MFA setup and NextAuth integration
- OTP/TAC verification flow
- Password reset with Zoho email
- OAuth (Google) providers
- Email verification

**Source Docs:** `authentication-*.md`, `mfa-*.md`, `otp-*.md`, `password-reset-*.md`

---

### 🎭 [Captain Showcase](./captain-showcase-*.md)

**Status:** Complete | **Type:** Feature

Public showcase page for verified captains.

**Key Topics:**

- Visual card layout with stats
- Video carousel integration
- Responsive design implementation
- Main page design upgrade

**Source Docs:** Multiple `captain-showcase-*.md` files (needs consolidation)

---

### 🛠️ Admin Tools

**Status:** TBD | **Type:** Feature

Admin dashboard features for staff management.

**Topics to consolidate:**

- Admin video details and moderation
- Storage inventory with pagination
- API cleanup and optimization
- Verification document management

**Source Docs:** `admin-video-details-*.md`, `storage-inventory-*.md`, `api-cleanup-*.md`

---

## 🐛 Bug Fixes & Solutions

### FIX – [Video Dimensions Returning Null](./fix-video-dimensions-returning-null.md)

**Status:** Fixed | **Date:** 2025-10-XX

Resolved video dimension detection issue in `/api/blob/finish`.

---

### FIX – [Portrait Video Upscaling Bug](./fix-portrait-video-upscaling-bug.md)

**Status:** Fixed | **Date:** 2025-10-XX

Fixed portrait videos being incorrectly upscaled beyond 720p.

---

### FIX – [Toast Persistence Issue](./toast-persistence-fix-summary.md)

**Status:** Fixed | **Date:** 2025-10-XX

Resolved toast notifications not persisting across navigation.

---

### FIX – [Maximum Update Depth Exceeded](./fix-maximum-update-depth-exceeded-error.md)

**Status:** Fixed | **Date:** 2025-10-XX

Fixed infinite render loop in `EnhancedVideoUploader`.

---

### FIX – [Video Gallery Not Loading](./video-gallery-fixes---review-step.md)

**Status:** Fixed | **Date:** 2025-10-17

Changed ReviewStep to fetch videos directly via API instead of form state.

---

### FIX – [Storage Inventory Pagination](./storage-inventory-pagination-fix.md)

**Status:** Fixed | **Date:** 2025-10-17

Fixed pagination to load all blobs → filter → paginate (not paginate → filter).

---

## 📖 Configuration & Setup Guides

### [External Video Worker Setup](./external-video-worker-setup-guide.md)

**Type:** Guide

How to deploy and configure the external video normalization worker.

**Topics:**

- QStash integration for production
- Worker environment variables
- Local development setup
- Health monitoring

---

### [Zoho Email Configuration](./zoho-email-configuration-guide.md)

**Type:** Guide

SMTP configuration for transactional emails.

**Topics:**

- App password setup
- Email templates (verification, password reset)
- Troubleshooting delivery issues
- Rate limiting

---

### [Z-Index Design System](./z-index-design-system.md)

**Type:** Reference

Standardized z-index values for consistent layering.

**Layers:** Base (0-9) → Content (10-19) → Navigation (20-29) → Overlay (30-39) → Modal (40-49) → Toast (50-59)

---

## 📊 API Documentation

### [Video API Routes](./video-api-routes-documentation.md)

**Type:** Reference

Complete API reference for video operations.

**Endpoints:**

- `POST /api/blob/upload` - Upload video files
- `POST /api/blob/finish` - Complete multipart upload
- `POST /api/videos/queue` - Queue video processing
- `POST /api/videos/normalize-callback` - Worker callback
- `GET /api/captain/videos` - List processed videos
- `DELETE /api/captain/videos/:id` - Delete video

---

### [API Cleanup Progress](./api-cleanup-progress-summary.md)

**Type:** Progress Report

Tracking deprecated routes and consolidation efforts.

---

## 🗂️ Deployment & Production

### [Deployment Checklist](./deployment-checklist.md)

**Type:** Checklist

Pre-deployment verification steps.

**Topics:**

- Environment variable validation
- Database migration verification
- Feature flag checks
- Monitoring setup

---

### [Production Readiness Report](./production-readiness-report.md)

**Type:** Assessment

Current production readiness status and blockers.

---

## 📚 Reference Documentation

### [Captain Verification Documents](./captain-verification-documents---storage-api-analysis.md)

**Type:** Technical Reference

Storage structure and API for verification document uploads.

**Topics:**

- Vercel Blob storage paths
- Database schema (`CaptainVerification`)
- Upload flow and status lifecycle
- Admin management interface

---

### [Schema Extraction Summary](./schema-extraction-summary.md)

**Type:** Technical Note

Zod schema extraction to manifest file for type safety.

---

## 📦 Historical & Archive

### [Historical Documentation Archive](./historical-documentation-archive.md)

**Type:** Archive Index

Index of deprecated and archived documentation.

**Archived Topics:**

- Legacy video upload phases
- Old authentication implementations
- Superseded completion reports

---

## 🔧 Maintenance Tasks

### Files Needing Consolidation

**Authentication (25+ files):**

- `authentication-*.md` → Consolidate to `AUTHENTICATION-SYSTEM.md`
- `mfa-*.md` → Merge into auth doc
- `otp-*.md` → Merge into auth doc
- `password-reset-*.md` → Merge into auth doc
- `solution-a-*.md` → Archive (deprecated approach)

**Captain Showcase (10+ files):**

- `captain-showcase-*.md` → Consolidate to `CAPTAIN-SHOWCASE.md`
- Remove duplicate visual guides

**Video Upload (30+ files):**

- ✅ Consolidated to `VIDEO-UPLOAD-SYSTEM.md`
- `phase-*.md` → Archive phase reports
- `video-upload-phase-*.md` → Archive

**Admin Tools:**

- `admin-video-details-*.md` → Consolidate
- `storage-inventory-*.md` → Consolidate
- `api-cleanup-*.md` → Consolidate

---

## 📝 Documentation Standards

### Frontmatter Format

```yaml
---
type: feature | fix | guide | reference
status: active | complete | deprecated | planned
feature: feature-name
updated: YYYY-MM-DD
tags: [tag1, tag2, tag3]
---
```

### Document Structure

1. **Summary** - Brief overview (2-3 sentences)
2. **Current State** - What exists now
3. **Implementation** - How it works
4. **Configuration** - Setup requirements
5. **Future Plans** - Upcoming enhancements
6. **Troubleshooting** - Common issues
7. **Related Docs** - Cross-references
8. **Archive Notes** - Merged/deprecated sources

---

## 🚀 Quick Links

- [Main Project README](../../README.md)
- [Copilot Instructions](../../.github/copilot-instructions.md)
- [Prisma Schema](../../prisma/schema.prisma)
- [API Routes Index](../../src/app/api/README.md)

---

## 📞 Need Help?

1. Check the relevant feature doc above
2. Search for specific error messages in bug fixes
3. Review API documentation for endpoint details
4. Check deployment checklist before releasing

---

_This index will be updated as documentation consolidation progresses._
