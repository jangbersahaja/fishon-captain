# Charter Registration & Configuration System - Complete Guide

**Last Updated**: November 21, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Charter Registration Flow](#charter-registration-flow)
4. [Charter Configuration](#charter-configuration)
5. [Draft Management](#draft-management)
6. [Media Management](#media-management)
7. [API Integration](#api-integration)
8. [Configuration](#configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The Charter Registration System is a multi-step wizard that allows captains to register new fishing charters and manage their configurations. It features draft auto-saving, media upload with video processing, and a comprehensive configuration dashboard.

### Key Features

- ✅ **Multi-step wizard**: 8-step registration process with validation
- ✅ **Draft persistence**: Auto-save to server with optimistic locking
- ✅ **Media management**: Photo and video uploads with preview
- ✅ **Video processing**: External worker integration for normalization
- ✅ **Live preview**: Real-time preview of charter listing
- ✅ **Edit mode**: Full editing support for existing charters
- ✅ **Configuration dashboard**: Comprehensive charter management interface
- ✅ **Booking flow settings**: MANUAL vs AUTO booking configuration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Charter Registration System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────┐            │
│  │  Multi-Step Form │         │ Draft Service│            │
│  │   (8 Steps)      │────────▶│ (Server API) │            │
│  └────────┬─────────┘         └──────┬───────┘            │
│           │                          │                     │
│           ▼                          ▼                     │
│  ┌──────────────────┐         ┌──────────────┐            │
│  │ Media Uploader   │         │ Draft Storage│            │
│  │ (Photos/Videos)  │         │ (PostgreSQL) │            │
│  └────────┬─────────┘         └──────────────┘            │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────┐         ┌──────────────┐            │
│  │ Video Queue      │────────▶│ Video Worker │            │
│  │ (IndexedDB)      │         │ (External)   │            │
│  └──────────────────┘         └──────────────┘            │
│                                                            │
│  ┌──────────────────┐         ┌──────────────┐            │
│  │ Live Preview     │         │ Configuration│            │
│  │ Component        │         │ Dashboard    │            │
│  └──────────────────┘         └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **Charter Form Module**

- **Location**: `src/features/charter-onboarding/`
- **Technology**: React Hook Form + Zod validation
- **Purpose**: Multi-step charter registration wizard
- **Steps**: 8 steps (Basic Info → Trip Details → Review)

#### 2. **Draft Service**

- **API**: `/api/charter-drafts`
- **Purpose**: Server-side draft persistence with optimistic locking
- **Storage**: PostgreSQL (CharterDraft model)

#### 3. **Media Management**

- **Photos**: Direct Vercel Blob uploads
- **Videos**: Queue-based processing with external worker
- **Storage**: Vercel Blob (public URLs with signed tokens)

#### 4. **Configuration Dashboard**

- **Location**: `/captain/charters`
- **Purpose**: Charter management and configuration interface
- **Features**: Status management, booking settings, recent bookings

---

## Charter Registration Flow

### Registration Steps

```
Step 1: Basic Information
  - Charter name
  - Charter type (e.g., Inshore, Offshore)
  - Description
  - Location (city, state, pickup point)

Step 2: Boat Details
  - Boat name, type, length
  - Capacity (max guests)
  - Amenities
  - Safety features

Step 3: Trip Details
  - Trip types (e.g., Half Day, Full Day)
  - Duration
  - Pricing
  - Target species

Step 4: Availability
  - Operating days
  - Operating hours
  - Seasonal availability

Step 5: Policies
  - Cancellation policy
  - Weather policy
  - What to bring
  - Additional rules

Step 6: Media Upload
  - Photos (min 3, max 20)
  - Videos (max 5, 30s each)
  - Cover photo selection

Step 7: Contact & Verification
  - Phone number
  - Email confirmation
  - Captain license (optional)

Step 8: Review & Submit
  - Live preview of charter listing
  - Final validation
  - Submit for approval
```

### Form Validation

**Zod Schema Structure**:

```typescript
// src/features/charter-onboarding/charterForm.schema.ts

export const charterFormSchema = z.object({
  // Step 1: Basic Info
  name: z.string().min(5, "Charter name must be at least 5 characters"),
  charterType: z.string().min(1, "Please select a charter type"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  
  // Step 2: Boat Details
  boat: z.object({
    name: z.string().min(1, "Boat name is required"),
    type: z.string().min(1, "Boat type is required"),
    lengthFt: z.number().min(10, "Boat must be at least 10 feet"),
    capacity: z.number().min(1, "Capacity must be at least 1"),
  }),
  
  // Step 3: Trip Details
  trips: z.array(z.object({
    name: z.string().min(1, "Trip name is required"),
    durationHours: z.number().min(1, "Duration must be at least 1 hour"),
    basePrice: z.number().min(1, "Price must be greater than 0"),
    targetSpecies: z.array(z.string()).min(1, "Select at least one species"),
  })).min(1, "Add at least one trip type"),
  
  // Media
  photos: z.array(z.string()).min(3, "Upload at least 3 photos"),
  videos: z.array(z.string()).max(5, "Maximum 5 videos allowed"),
});
```

**Step-Specific Validation**:

Each step validates only its relevant fields using Zod `.pick()` method:

```typescript
// Step 1 validation
const step1Schema = charterFormSchema.pick({
  name: true,
  charterType: true,
  description: true,
  city: true,
  state: true,
});
```

---

## Charter Configuration

### Configuration Dashboard Features

The charter configuration page (`/captain/charters`) provides:

#### 1. **Charter Overview Card**

- Charter name and type
- Location (city, state)
- Status (Active/Inactive)
- Quick actions dropdown
- Edit charter button

#### 2. **Booking Flow Settings**

```typescript
// Two flow types supported:
type BookingFlowType = "MANUAL" | "AUTO";

// MANUAL Flow: Captain approves before payment
// AUTO Flow: Payment first, captain acknowledges
```

**Configuration**:

- Booking flow type selection
- Approval time limit (MANUAL flow)
- Instant booking toggle (AUTO flow)
- Update API: `/api/charters/:id/booking-flow`

#### 3. **Recent Bookings Display**

- Last 5 bookings for the charter
- Status badges with color coding
- Guest information
- Trip details and pricing
- Link to full bookings page

#### 4. **Trip Management**

- List of all trips for the charter
- Trip details (name, duration, price)
- Edit/deactivate trips
- Add new trip types

#### 5. **Media Gallery**

- View all photos and videos
- Reorder media
- Set cover photo
- Delete media
- Upload new media

#### 6. **Availability Management**

- Operating schedule editor
- Unavailable dates management
- Seasonal availability settings

---

## Draft Management

### Draft Lifecycle

```
1. CREATE
   └─▶ POST /api/charter-drafts
       - Creates new draft with status ACTIVE
       - Returns draftId and initial version

2. AUTO-SAVE (every step change)
   └─▶ PATCH /api/charter-drafts/:id
       - Sends x-draft-version header
       - Server validates version (optimistic locking)
       - Returns 409 on conflict

3. CONFLICT RESOLUTION
   └─▶ Client fetches server version
       - Displays conflict dialog
       - User chooses: Keep Local or Use Server

4. FINALIZE
   └─▶ POST /api/charter-drafts/:id/finalize
       - Validates all fields
       - Creates Charter + CaptainProfile
       - Associates media
       - Marks draft SUBMITTED
```

### Optimistic Locking

**Client Side**:

```typescript
// Send current version with each update
headers: {
  "x-draft-version": currentVersion.toString()
}
```

**Server Side**:

```typescript
// Validate version before update
if (clientVersion !== serverVersion) {
  return NextResponse.json(
    { error: "Draft has been modified elsewhere" },
    { status: 409 }
  );
}
```

### Draft Data Structure

```typescript
// CharterDraft model
{
  id: string;
  userId: string;
  charterId?: string; // Set when editing existing charter
  status: "ACTIVE" | "SUBMITTED";
  version: number; // Optimistic locking version
  dataJson: object; // Sanitized form data
  createdAt: Date;
  updatedAt: Date;
}
```

### Edit Mode

**Creating Edit Draft**:

```
POST /api/charter-drafts/from-charter/:charterId
  ├─ Loads existing charter data
  ├─ Creates new draft with charterId reference
  ├─ Hydrates form with charter data
  └─ Returns draftId for editing session
```

**Edit Flow**:

1. User clicks "Edit Charter" on dashboard
2. System creates draft from existing charter
3. Form loads with pre-filled data
4. User makes changes → auto-saved to draft
5. User submits → updates original charter

---

## Media Management

### Photo Upload

**Process**:

1. User selects photos (max 20)
2. Files validated (size, type, dimensions)
3. Direct upload to Vercel Blob
4. URLs stored in form state
5. On finalize: URLs linked to CharterMedia records

**Validation**:

- Min 3 photos required
- Max 20 photos allowed
- Max 5MB per photo
- Formats: JPG, PNG, WEBP
- Min dimensions: 800x600

### Video Upload

**Process**:

```
1. USER SELECTS VIDEO
   └─▶ Validation (size, duration, format)

2. TRIM MODAL (if needed)
   └─▶ User trims to ≤30 seconds
   └─▶ Metadata: trimStart, originalDuration

3. UPLOAD TO BLOB
   └─▶ Direct upload to Vercel Blob
   └─▶ Creates originalBlobKey

4. FINISH ENDPOINT
   └─▶ POST /api/blob/finish
   ├─ Probes video with ffprobe
   ├─ Decides: bypass vs normalize
   ├─ Creates CaptainVideo record
   └─ Enqueues for processing (if needed)

5. VIDEO QUEUE
   └─▶ IndexedDB queue (survives refresh)
   └─▶ Retry policy: 3 attempts
   └─▶ POST /api/videos/queue

6. EXTERNAL WORKER
   └─▶ Normalizes video (720p, H.264)
   └─▶ Generates thumbnail
   └─▶ Callback: POST /api/videos/normalize-callback

7. FINALIZE
   └─▶ Links video to charter
   └─▶ Status: queued → processing → ready
```

**Video Status Flow**:

```
queued → processing → ready | failed | cancelled
```

**Video Constraints**:

- Max 5 videos per charter
- Max 30 seconds per video
- Max 100MB per video
- Formats: MP4, MOV, WEBM
- Output: 720p H.264 MP4

### Media Component Reference

- `EnhancedVideoUploader`: Upload interface with queue status
- `VideoManager`: Status pills + thumbnails + retry
- `VideoPreviewCarousel`: Horizontal scroll preview (Review step)
- `VideoTrimModal`: Trim interface with timeline

---

## API Integration

### Charter Draft APIs

#### 1. **Create Draft** (`POST /api/charter-drafts`)

**Purpose**: Create new registration draft

**Request**:

```json
{
  "initialData": {
    "name": "Optional initial name",
    "charterType": "Optional type"
  }
}
```

**Response**:

```json
{
  "id": "draft_123",
  "version": 1,
  "createdAt": "2025-11-21T10:00:00Z"
}
```

#### 2. **Update Draft** (`PATCH /api/charter-drafts/:id`)

**Purpose**: Save form progress

**Headers**:

```
x-draft-version: 5
```

**Request**:

```json
{
  "dataJson": {
    "name": "Updated charter name",
    "step": 2,
    "boat": { ... }
  }
}
```

**Response**:

```json
{
  "success": true,
  "version": 6,
  "updatedAt": "2025-11-21T10:05:00Z"
}
```

**Error (409 Conflict)**:

```json
{
  "error": "Draft has been modified elsewhere",
  "serverVersion": 7,
  "serverData": { ... }
}
```

#### 3. **Finalize Draft** (`POST /api/charter-drafts/:id/finalize`)

**Purpose**: Submit completed registration

**Request**:

```json
{
  "photos": ["blob_url_1", "blob_url_2", ...],
  "videos": ["blob_url_1", "blob_url_2", ...],
  "coverPhotoIndex": 0
}
```

**Response**:

```json
{
  "success": true,
  "charterId": "charter_123",
  "message": "Charter created successfully"
}
```

**Validation Errors**:

```json
{
  "error": "Validation failed",
  "errors": {
    "name": "Charter name is required",
    "photos": "Minimum 3 photos required"
  }
}
```

#### 4. **Create Edit Draft** (`POST /api/charter-drafts/from-charter/:id`)

**Purpose**: Create draft from existing charter for editing

**Response**:

```json
{
  "draftId": "draft_456",
  "version": 1,
  "data": { ... existing charter data ... }
}
```

### Charter Management APIs

#### 1. **Update Booking Flow** (`PATCH /api/charters/:id/booking-flow`)

**Purpose**: Change charter booking flow type

**Request**:

```json
{
  "bookingFlowType": "MANUAL" | "AUTO",
  "approvalTimeHours": 24, // MANUAL only
  "instantBookingEnabled": true // AUTO only
}
```

#### 2. **Update Status** (`PATCH /api/charters/:id/status`)

**Purpose**: Activate/deactivate charter

**Request**:

```json
{
  "isActive": true
}
```

#### 3. **Media Operations**

- `POST /api/charters/:id/media` - Add media
- `DELETE /api/charters/:id/media/remove` - Remove media
- `PATCH /api/charters/:id/videos/reorder` - Reorder videos
- `POST /api/charters/:id/videos/link` - Link video to charter

---

## Configuration

### Environment Variables

```bash
# Vercel Blob (Media Storage)
BLOB_READ_WRITE_TOKEN="your-blob-token"

# Video Worker (External Service)
EXTERNAL_WORKER_URL="https://worker.fishon.my"
VIDEO_WORKER_SECRET="your-worker-secret"
VERCEL_BLOB_READ_WRITE_TOKEN="your-blob-token"

# Google Maps (Location Autocomplete)
GOOGLE_PLACES_API_KEY="your-places-key"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-maps-key"

# Feature Flags
NEXT_PUBLIC_CHARTER_FORM_DEBUG="1" # Enable analytics console logs
```

### Feature Module Structure

```
src/features/charter-onboarding/
├── charterForm.schema.ts       # Zod validation schemas
├── charterForm.defaults.ts     # Default form values
├── charterForm.draft.ts        # Draft sanitization/hydration
├── analytics.ts                # Event tracking
├── components/                 # Form components
│   ├── FormSection.tsx
│   ├── StepProgress.tsx
│   └── MediaGrid.tsx
├── steps/                      # Step-specific components
│   ├── BasicInfoStep.tsx
│   ├── BoatDetailsStep.tsx
│   ├── TripDetailsStep.tsx
│   └── ReviewStep.tsx
├── preview/                    # Live preview components
│   └── CharterPreview.tsx
├── server/                     # Server-side utilities
│   ├── validation.ts
│   └── mapping.ts
└── hooks/                      # Custom hooks
    ├── useAutosave.ts
    └── useMediaPreview.ts
```

---

## Testing

### Unit Tests

**Location**: `src/features/charter-onboarding/__tests__/`

**Coverage**:

- Schema validation (Zod)
- Draft sanitization/hydration
- Utility functions
- Form defaults

**Run Tests**:

```bash
npm test -- charter-onboarding
```

### Integration Tests

**Test Flows**:

1. **New Registration Flow**:
   - [ ] Create draft
   - [ ] Navigate through all steps
   - [ ] Upload photos (min 3)
   - [ ] Upload video (with trim)
   - [ ] Submit registration
   - [ ] Verify charter created

2. **Edit Flow**:
   - [ ] Create edit draft from existing charter
   - [ ] Modify fields
   - [ ] Auto-save triggers correctly
   - [ ] Submit updates
   - [ ] Verify charter updated

3. **Draft Conflict**:
   - [ ] Open same draft in two tabs
   - [ ] Make changes in tab 1
   - [ ] Make different changes in tab 2
   - [ ] Verify conflict detection
   - [ ] Resolve conflict (choose version)

4. **Video Processing**:
   - [ ] Upload video
   - [ ] Trim to <30s
   - [ ] Verify queue persistence (refresh page)
   - [ ] Wait for processing
   - [ ] Verify status updates (queued → processing → ready)

### Manual Testing Checklist

#### Form Validation

- [ ] Required fields show error on blur
- [ ] Submit blocked with invalid data
- [ ] Error summary appears above form
- [ ] Individual field errors inline

#### Media Upload

- [ ] Photo upload (3-20 photos)
- [ ] Photo validation (size, type, dimensions)
- [ ] Video upload (max 5 videos)
- [ ] Video trim modal (for >30s videos)
- [ ] Video queue persistence across refresh
- [ ] Cover photo selection

#### Draft System

- [ ] Auto-save on step change
- [ ] Manual save button works
- [ ] Version conflict detection
- [ ] Conflict resolution dialog
- [ ] Draft recovery after browser crash

#### Configuration Dashboard

- [ ] Charter card displays correctly
- [ ] Status toggle works
- [ ] Booking flow change works
- [ ] Recent bookings display
- [ ] Quick actions dropdown
- [ ] Edit button creates edit draft

---

## Troubleshooting

### Draft Issues

#### Problem: Draft not saving

**Check**:

1. Network tab for failed requests
2. Server logs for validation errors
3. Version header in request
4. User session validity

**Solution**:

```bash
# Check draft status
SELECT id, status, version, "updatedAt"
FROM "CharterDraft"
WHERE "userId" = 'user-id'
ORDER BY "updatedAt" DESC;

# Verify user owns draft
SELECT d.id, d."userId", u.email
FROM "CharterDraft" d
JOIN "User" u ON d."userId" = u.id
WHERE d.id = 'draft-id';
```

#### Problem: Version conflict loop

**Check**:

1. Multiple tabs/windows open?
2. Concurrent save requests?
3. Server version out of sync?

**Solution**:

```typescript
// Clear local storage and fetch fresh
localStorage.removeItem(`charter-draft-${draftId}`);
const fresh = await fetch(`/api/charter-drafts/${draftId}`);
```

### Media Upload Issues

#### Problem: Video not processing

**Check**:

1. Video queue status (IndexedDB)
2. CaptainVideo record status
3. External worker logs
4. Blob storage keys

**Solution**:

```bash
# Check video status
SELECT id, "processStatus", "originalBlobKey", "ready720pBlobKey"
FROM "CaptainVideo"
WHERE id = 'video-id';

# Retry processing
POST /api/videos/queue
{
  "videoId": "video-id",
  "force": true
}
```

#### Problem: Photos not appearing

**Check**:

1. Blob upload success (network tab)
2. URLs stored in form state
3. CORS headers on blob storage
4. Signed URL expiration

**Solution**:

```typescript
// Verify blob exists
const response = await fetch(blobUrl, { method: "HEAD" });
console.log("Blob exists:", response.ok);

// Generate new signed URL if expired
const newUrl = await refreshBlobUrl(blobKey);
```

### Form Issues

#### Problem: Validation not working

**Check**:

1. Zod schema matches fields
2. Step-specific schema slice
3. Error state rendering
4. Form submission handler

**Solution**:

```typescript
// Test schema manually
import { charterFormSchema } from "@features/charter-onboarding";

const result = charterFormSchema.safeParse(formData);
if (!result.success) {
  console.log("Validation errors:", result.error.flatten());
}
```

#### Problem: Preview not updating

**Check**:

1. Form state changes
2. Preview component re-render
3. Data transformation logic
4. React key attributes

**Solution**:

```typescript
// Force preview refresh
const [previewKey, setPreviewKey] = useState(0);

useEffect(() => {
  setPreviewKey((k) => k + 1);
}, [formData]);

<CharterPreview key={previewKey} data={formData} />
```

---

## Analytics Events

### Tracked Events

```typescript
// Form navigation
"step_view"             // User views a step
"step_complete"         // User completes a step
"validation_errors"     // Validation failed

// Draft operations
"draft_saved"           // Draft saved to server
"conflict_resolution"   // Version conflict occurred

// Submission
"finalize_attempt"      // User submits form
"finalize_success"      // Submission succeeded

// Media
"media_upload_start"    // Upload batch started
"media_upload_complete" // Single upload finished
"media_batch_complete"  // All uploads finished

// Performance
"lazy_component_loaded" // Dynamic import loaded
"preview_ready"         // Preview rendered
```

### Enable Console Logging

```typescript
// Development only
if (process.env.NODE_ENV === "development") {
  import("@features/charter-onboarding/analytics").then(({ enableCharterFormConsoleLogging }) => {
    enableCharterFormConsoleLogging();
  });
}
```

---

## Quick Reference

### Key Files

```
Charter Form:
- src/features/charter-onboarding/README.md
- src/features/charter-onboarding/charterForm.schema.ts
- src/features/charter-onboarding/charterForm.draft.ts

APIs:
- src/app/api/charter-drafts/route.ts
- src/app/api/charter-drafts/[id]/route.ts
- src/app/api/charter-drafts/[id]/finalize/route.ts
- src/app/api/charters/[id]/booking-flow/route.ts

Configuration:
- src/app/(portal)/captain/charters/page.tsx
- src/lib/charter-service.ts

Media:
- src/lib/uploads/videoQueue.ts
- src/app/api/blob/finish/route.ts
- src/app/api/videos/normalize-callback/route.ts
```

### Common Commands

```bash
# Development
npm run dev --turbopack

# Type check
npm run typecheck

# Test charter form
npm test -- charter-onboarding

# Database
npx prisma studio
npx prisma migrate dev
```

---

## Migration Notes

### Adding New Step

1. Define Zod schema for new fields
2. Create step component in `steps/`
3. Add to `STEP_SEQUENCE` in `formSteps.ts`
4. Update `FormSection.tsx` conditional render
5. Add analytics tracking

### Adding New Field

1. Update `charterForm.schema.ts`
2. Update `charterForm.defaults.ts`
3. Update `charterForm.draft.ts` (sanitization)
4. Add to appropriate step component
5. Update server validation in `server/validation.ts`

### Changing Draft Structure

1. Update `CharterDraft` model in Prisma schema
2. Run migration: `npx prisma migrate dev`
3. Update draft sanitization/hydration
4. Update API handlers
5. Test conflict resolution

---

## Support & Resources

- **Feature Module**: `src/features/charter-onboarding/README.md`
- **API Docs**: `docs/features/api-documentation.md`
- **Video System**: `docs/config/VIDEO_UPLOAD_SYSTEM.md`

**For questions or issues**: Contact development team

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
