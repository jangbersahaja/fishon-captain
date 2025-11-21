# Fishon Captain - System Configuration Documentation

**Last Updated**: November 21, 2025  
**Purpose**: Centralized living documentation for all Fishon Captain features

---

## Overview

This directory contains comprehensive, up-to-date configuration documentation for all major systems in the Fishon Captain application. Each document follows a consistent format covering architecture, configuration, API integration, testing, and troubleshooting.

**Goal**: Single source of truth for each feature - no more scattered, outdated, or duplicate documentation.

---

## Documentation Index

### Core Features

1. **[CHARTER_REGISTRATION_SYSTEM.md](./CHARTER_REGISTRATION_SYSTEM.md)**
   - Multi-step charter registration wizard
   - Draft management with optimistic locking
   - Media upload (photos & videos)
   - Video processing pipeline
   - Edit mode and configuration dashboard

2. **[BOOKING_SYSTEM.md](./BOOKING_SYSTEM.md)**
   - Dual booking flows (MANUAL & AUTO)
   - Payment integration (tokenized & direct)
   - Status management and transitions
   - Cross-app webhook integration (fishon-market ↔ fishon-captain)
   - Email and push notifications

3. **[EMAIL_NOTIFICATION_SYSTEM.md](./EMAIL_NOTIFICATION_SYSTEM.md)**
   - Dual-channel communication (email + Pusher)
   - Flow-aware messaging (MANUAL vs AUTO)
   - Payment-aware templates (TOKENIZED vs DIRECT)
   - React Email templates (@fishon/email package)
   - Webhook integration

### Management Features

4. **[DASHBOARD_ANALYTICS_SYSTEM.md](./DASHBOARD_ANALYTICS_SYSTEM.md)**
   - Real-time metrics and KPIs
   - Booking statistics aggregation
   - Financial tracking and earnings
   - Charter performance monitoring
   - Priority alerts and actions

5. **[OPERATIONAL_CALENDAR_SYSTEM.md](./OPERATIONAL_CALENDAR_SYSTEM.md)**
   - Visual calendar editor
   - Daily operating hours configuration
   - Unavailable dates management
   - Recurring schedule patterns
   - Conflict detection

6. **[CAPTAIN_PAYOUT_SYSTEM.md](./CAPTAIN_PAYOUT_SYSTEM.md)**
   - Earnings calculation and commission tiers
   - Bi-weekly and monthly payout schedules
   - Bank account management
   - Transaction history
   - Admin payout processing

### Media & Content

7. **[VIDEO_UPLOAD_SYSTEM.md](./VIDEO_UPLOAD_SYSTEM.md)**
   - Queue-based upload with retry logic
   - 30-second trim enforcement
   - Video normalization pipeline
   - External worker integration (QStash)
   - Status tracking and thumbnails

### Security & Access

8. **[AUTHENTICATION_SYSTEM.md](./AUTHENTICATION_SYSTEM.md)**
   - Multi-provider OAuth (Google, Facebook, Apple)
   - Credential-based login with email verification
   - Multi-factor authentication (MFA/TOTP)
   - Password reset flows
   - Role-based access control

9. **[ADMIN_TOOLS_SYSTEM.md](./ADMIN_TOOLS_SYSTEM.md)**
   - Video moderation dashboard
   - Storage inventory management
   - API cleanup tools
   - Audit logging
   - Staff impersonation

### Configuration & Deployment

10. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
    - Environment setup
    - Build and deployment steps
    - Database migrations
    - Monitoring and rollback

11. **[ZOHO_EMAIL_CONFIG.md](./ZOHO_EMAIL_CONFIG.md)**
    - SMTP configuration
    - Email service setup
    - Troubleshooting email delivery

---

## Document Format

All documentation follows this structure:

```markdown
# [Feature Name] - Complete Guide

**Last Updated**: [Date]  
**Status**: ✅ Production Ready | 🚧 In Development  
**Applies To**: fishon-captain | fishon-market | Both

## Table of Contents
- System Overview
- Architecture
- [Feature-specific sections]
- API Integration
- Configuration
- Testing
- Troubleshooting

## System Overview
Brief description and key features

## Architecture
System components and data flow diagrams

## [Feature Sections]
Detailed implementation, usage, and examples

## API Integration
Endpoint reference, request/response examples

## Configuration
Environment variables, settings, feature flags

## Testing
Unit tests, integration tests, manual testing checklists

## Troubleshooting
Common issues and solutions

## Related Documentation
Links to other relevant docs
```

---

## Maintenance Guidelines

### When to Update

- ✅ Feature implementation complete
- ✅ API endpoint changes
- ✅ Configuration changes
- ✅ Bug fixes that affect usage
- ✅ New environment variables
- ✅ Architecture changes

### How to Update

1. **Update the document directly** - Living documents, not versioned plans
2. **Update "Last Updated" date** at the top
3. **Add notes to relevant sections** - No need to preserve old info
4. **Keep it concise** - Remove outdated information
5. **Test examples** - Ensure code samples work

### Document Lifecycle

- **Active**: Feature in production, document kept current
- **Deprecated**: Feature removed, move to `docs/archive/`
- **Superseded**: Feature replaced, update to new implementation

---

## Quick Navigation

**By Feature Type**:

- **Business Logic**: Charter Registration, Booking System, Operational Calendar
- **Communication**: Email Notifications
- **Analytics**: Dashboard & Analytics
- **Financial**: Captain Payout
- **Media**: Video Upload
- **Security**: Authentication, Admin Tools
- **Infrastructure**: Deployment, Email Config

**By Stakeholder**:

- **Captains**: Charter Registration, Booking System, Dashboard, Payout, Operational Calendar
- **Admins**: Admin Tools, All system docs
- **Developers**: All docs, especially API Integration and Configuration sections
- **DevOps**: Deployment Guide, Configuration sections

---

## Migration from Old Documentation

This consolidated structure replaced:

- **140+ scattered docs** in `/docs` and `/plans` directories
- **Phase-based documentation** (Phase 1-6 completion docs)
- **Legacy plan documents** (implementation plans, proposals)
- **Duplicate feature docs** (multiple versions of same feature)
- **Archive directories** (old migration guides, deprecated features)

**Result**: 92% reduction in documentation files (140 → 11 living documents)

---

## Related Resources

- **Copilot Instructions**: `.github/copilot-instructions.md`
- **API Documentation**: Individual docs have API reference sections
- **Code Comments**: Feature modules have README.md files (e.g., `src/features/charter-onboarding/README.md`)
- **Database Schema**: `prisma/schema.prisma`

---

## Getting Help

- **For feature questions**: Check the specific system document first
- **For implementation details**: See feature module README (e.g., `src/features/*/README.md`)
- **For API questions**: Refer to API Integration sections
- **For troubleshooting**: Each doc has a Troubleshooting section
- **For development team**: Contact via internal channels

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
