# Fishon Captain

**Management Dashboard for Fishing Charter Captains**

Fishon Captain is the internal dashboard for charter captains and operators, built with Next.js 15 (App Router) + Prisma + NextAuth. This is one of three interconnected Fishon applications:

- **Fishon Captain** (this app): Captain/admin dashboard for managing charters and bookings
- **Fishon.my**: Customer-facing marketplace where anglers discover and book charters
- **Fishon Video Worker**: External video normalization service

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Vercel Blob storage token

### Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Check environment configuration
npm run check:env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev --turbopack
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📚 Documentation

All system documentation is consolidated in the `docs/config/` directory:

| Document | Description |
|----------|-------------|
| [CHARTER_REGISTRATION_SYSTEM.md](docs/config/CHARTER_REGISTRATION_SYSTEM.md) | 8-step registration wizard, draft management, media uploads |
| [BOOKING_SYSTEM.md](docs/config/BOOKING_SYSTEM.md) | Dual booking flows (MANUAL/AUTO), payment integration, webhooks |
| [AUTHENTICATION_SYSTEM.md](docs/config/AUTHENTICATION_SYSTEM.md) | OAuth providers, MFA/TOTP, email verification, password reset |
| [VIDEO_UPLOAD_SYSTEM.md](docs/config/VIDEO_UPLOAD_SYSTEM.md) | Queue-based uploads, 30s trim, external worker normalization |
| [DASHBOARD_ANALYTICS_SYSTEM.md](docs/config/DASHBOARD_ANALYTICS_SYSTEM.md) | Real-time metrics, earnings tracking, priority alerts |
| [CAPTAIN_PAYOUT_SYSTEM.md](docs/config/CAPTAIN_PAYOUT_SYSTEM.md) | Commission tiers, bi-weekly/monthly payouts |
| [OPERATIONAL_CALENDAR_SYSTEM.md](docs/config/OPERATIONAL_CALENDAR_SYSTEM.md) | Availability management, schedule configuration |
| [EMAIL_NOTIFICATION_SYSTEM.md](docs/config/EMAIL_NOTIFICATION_SYSTEM.md) | Flow-aware emails, Pusher real-time notifications |
| [ADMIN_TOOLS_SYSTEM.md](docs/config/ADMIN_TOOLS_SYSTEM.md) | Video moderation, storage inventory, audit logging |
| [DEPLOYMENT_GUIDE.md](docs/config/DEPLOYMENT_GUIDE.md) | Environment setup, Vercel deployment, troubleshooting |

---

## ⚡ Key Features

### For Captains
- **Charter Registration**: 8-step wizard with auto-save and optimistic locking
- **Booking Management**: Dual flows (approve-then-pay or pay-then-acknowledge)
- **Dashboard**: Real-time metrics, earnings, and priority alerts
- **Operational Calendar**: Visual availability and schedule management
- **Media Management**: Photo/video uploads with automatic 720p normalization

### For Admins
- **Video Moderation**: Side-by-side comparison of original vs normalized videos
- **Storage Inventory**: Track all video assets and their relationships
- **Staff Impersonation**: View captain dashboards with audit trail
- **Security**: Role-based access (CAPTAIN, STAFF, ADMIN)

---

## 🛠️ Development Commands

```bash
# Development
npm run dev --turbopack    # Start dev server with Turbopack
npm run check:env          # Validate environment variables
npm run typecheck          # Run TypeScript checks

# Testing
npm test                   # Run Vitest tests
npm run test:ci            # CI-optimized test run

# Database
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev     # Run migrations
npm run db:migrate:safe    # Safe migration with auto-backup

# Build
npm run build              # Production build
npm run lint               # Run ESLint
```

---

## 🔐 Environment Variables

### Required

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=browser-key
GOOGLE_PLACES_API_KEY=server-key

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your-blob-token
```

### Video Processing

```env
EXTERNAL_WORKER_URL=https://your-worker-url.com
VIDEO_WORKER_SECRET=your-worker-secret
QSTASH_TOKEN=your-qstash-token
```

### Email (Zoho SMTP)

```env
EMAIL_HOST=smtppro.zoho.com
EMAIL_PORT=465
EMAIL_USER=your-email@fishon.my
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM=no-reply@fishon.my
```

### Real-time Notifications (Pusher)

```env
NEXT_PUBLIC_PUSHER_APP_KEY=your-pusher-key
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-pusher-secret
```

See [DEPLOYMENT_GUIDE.md](docs/config/DEPLOYMENT_GUIDE.md) for the complete list.

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (portal)/          # Protected captain/staff pages
│   └── api/               # API routes
├── components/            # React components
├── features/              # Feature modules
│   └── charter-onboarding/  # Charter registration wizard
├── lib/                   # Utilities and services
└── server/                # Server-side logic

docs/
└── config/                # System documentation

scripts/                   # Utility scripts
├── backup-db.sh          # Database backup
├── restore-db.sh         # Database restore
└── safe-migrate.sh       # Safe migration workflow

prisma/
└── schema.prisma         # Database schema
```

---

## 🔒 Security

- **Authentication**: NextAuth v4 with OAuth (Google, Facebook, Apple) + credentials
- **MFA**: TOTP with backup codes
- **Rate Limiting**: Pluggable store (in-memory default, Redis-ready)
- **Security Headers**: CSP, HSTS, X-Frame-Options via `applySecurityHeaders`
- **Audit Logging**: All mutations logged via `writeAuditLog()`

---

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v4
- **Storage**: Vercel Blob
- **Video Processing**: External worker + QStash
- **Real-time**: Pusher
- **Email**: Zoho SMTP + React Email (@fishon/email)
- **Testing**: Vitest + jsdom
- **UI**: Tailwind CSS + shadcn/ui

---

## 🚢 Deployment

Deploy to Vercel:

```bash
# Option 1: Push to GitHub (auto-deploy)
git push origin main

# Option 2: Vercel CLI
vercel --prod
```

See [DEPLOYMENT_GUIDE.md](docs/config/DEPLOYMENT_GUIDE.md) for complete deployment instructions.

---

## 📄 License

Proprietary - All rights reserved.
