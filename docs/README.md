# FishOn Captain Register Documentation

Welcome to the FishOn Captain Register documentation. This directory contains all technical documentation for the platform.

## 📚 Documentation Structure

### 🎯 Quick Start

New to the project? Start here:

1. **[Main README](../README.md)** - Project overview, setup, and getting started
2. **[API Overview](./api/README.md)** - API routes and conventions
3. **[Copilot Instructions](../.github/copilot-instructions.md)** - Platform snapshot and key workflows

### 📖 Core Documentation

#### API Reference (`/api`)

- **[API Cleanup Plan](./api/API_CLEANUP_ACTION_PLAN.md)** - Route inventory, conventions, and cleanup roadmap
- **[Video API Routes](./api/API_VIDEO_ROUTES.md)** - Complete video processing API reference

#### Guides (`/guides`)

Troubleshooting and implementation guides:

- **[Fix: Infinite Render Loop](./guides/FIX_INFINITE_RENDER_LOOP.md)** - Debugging infinite re-renders in forms
- **[Fix: Enhanced Video Uploader Loop](./guides/FIX_ENHANCED_VIDEO_UPLOADER_LOOP.md)** - Video uploader component issues
- **[Video Upload Fix Guide](./guides/VIDEO_UPLOAD_FIX_GUIDE.md)** - General video upload troubleshooting
- **[Z-Index System](./guides/Z_INDEX_SYSTEM.md)** - UI layering conventions

#### Historical Archive (`/archive`)

Completed phase reports and historical implementation notes (for reference only):

- Phase 2A, 2B, 2C completion reports
- Phase 13 completion summary
- Video upload phases status
- Implementation completion reports (30s trim, auto-trim modal, WhatsApp-style UI)
- PendingMedia cleanup notes
- Toast persistence fix
- Video upload migration notes

### 🗂️ Module-Specific Documentation

Some modules have their own README files in their directories:

- **[Charter Onboarding Feature](../src/features/charter-onboarding/README.md)** - Multi-step form module
- **[API Routes](../src/app/api/README.md)** - Duplicate of API cleanup plan
- **[Storage Utilities](../src/lib/storage/README.md)** - Blob upload utilities
- **[Prisma Migrations](../prisma/README_MIGRATIONS.md)** - Database migration notes

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend**: Next.js 15 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js with Google OAuth
- **Storage**: Vercel Blob
- **Video Processing**: FFmpeg via external worker (QStash)
- **Testing**: Vitest, React Testing Library

### Key Workflows

#### 1. Charter Registration & Editing

- Multi-step form with autosave (`CharterDraft` model)
- Draft → Finalize flow with optimistic locking
- Media upload via Vercel Blob
- Video processing queue with status tracking

#### 2. Video Processing Pipeline

```text
Upload → CaptainVideo (queued) → /api/videos/queue
  → External Worker (FFmpeg) → /api/videos/normalize-callback
  → CaptainVideo (ready) with processed URLs
```

#### 3. Authentication & Authorization

- NextAuth with Google OAuth
- Role-based access: CAPTAIN, STAFF, ADMIN
- Middleware gates `/captain/*` and `/staff/*` routes

## 🔧 Development

### Essential Commands

```bash
# Development
npm run dev --turbopack      # Start dev server (recommended)
npm run check:env            # Validate environment variables
npm run typecheck            # TypeScript validation

# Database
npx prisma migrate dev       # Apply migrations
npx prisma generate          # Regenerate Prisma Client
npx prisma studio            # Visual database browser
npm run migrate:drift-heal   # Fix migration drift (if needed)

# Testing
npm test                     # Run tests in watch mode
npm run test:ci              # Single-run with dot reporter
```

### Environment Variables

Required variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...  # Browser key
GOOGLE_PLACES_API_KEY=...            # Server key (restricted)

# Blob Storage
BLOB_READ_WRITE_TOKEN=...            # Vercel Blob token

# Video Processing
VIDEO_WORKER_SECRET=...              # Worker auth
EXTERNAL_WORKER_URL=...              # Production worker URL
QSTASH_TOKEN=...                     # QStash auth (production)
```

## 📝 Documentation Standards

### When to Create Documentation

- **New Features**: Create feature README in the module directory
- **API Changes**: Update API documentation
- **Breaking Changes**: Add migration guide
- **Bug Fixes**: Update troubleshooting guides if it's a common issue
- **Completion**: Create completion report in `/archive`

### Documentation Templates

#### Feature README

```markdown
# Feature Name

Brief description.

## Structure

- List key files and their purposes

## Usage

Code examples

## Testing

How to test this feature

## Future Improvements

Ideas for enhancement
```

#### Troubleshooting Guide

```markdown
# Issue: Brief Description

## Symptoms

What the user experiences

## Root Cause

Technical explanation

## Solution

Step-by-step fix

## Prevention

How to avoid in future
```

## 🔍 Finding Information

| What you need                | Where to look                                    |
| ---------------------------- | ------------------------------------------------ |
| **Quick setup & overview**   | [Main README](../README.md)                      |
| **API endpoint details**     | [API docs](./api/)                               |
| **Video processing**         | [Video API Routes](./api/API_VIDEO_ROUTES.md)    |
| **Form/component issues**    | [Guides](./guides/)                              |
| **Feature module internals** | Module README (e.g., `src/features/*/README.md`) |
| **Database schema**          | `prisma/schema.prisma`                           |
| **Historical context**       | [Archive](./archive/)                            |

## 🤝 Contributing

When updating documentation:

1. Keep README files in module directories for module-specific details
2. Put cross-cutting concerns in `docs/guides/`
3. Archive completion reports in `docs/archive/`
4. Update this index when adding new top-level docs
5. Ensure links are relative and work from both GitHub and local dev

## 📊 Current Status (October 2025)

### ✅ Completed

- Phase 2C-1: Dual pipeline video processing (legacy + new)
- Phase 13: Enhanced video uploader with queue
- PendingMedia model removal
- Charter onboarding form with draft/finalize
- Video trim modal (30s limit)
- IndexedDB queue persistence

### 🚧 In Progress

- Phase 2C-2: Monitoring dual pipeline (2-4 weeks)
- Testing dual pipeline in production

### 📋 Upcoming

- Phase 2C-3: Feature flag cutover (disable legacy)
- Phase 2D: Remove legacy worker endpoints
- Phase 3: API route documentation enhancement

---

**Last Updated**: October 12, 2025  
**Maintainers**: Development Team  
**Questions?** Check Copilot instructions or ask the team
