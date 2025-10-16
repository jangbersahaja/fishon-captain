# Captain Verification Documents - Storage & API Analysis

## Overview

This document details how captain verification documents are uploaded, stored in Vercel Blob, and managed in the database.

## User Flow

**Captain Dashboard → Verification Page (`/captain/verification`)**

The page allows captains to upload:

1. **Government ID** (required) - Front & Back
2. **Captain License** (optional)
3. **Boat Registration** (optional)
4. **Fishing License** (optional)
5. **Additional Documents** (optional, multiple files)

## Upload Flow

### 1. Client-Side Upload Process

**Location:** `/src/app/(portal)/captain/verification/page.tsx`

**Upload Function:**

```typescript
async function uploadFile(file: File, docType: DocType): Promise<Statused> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("docType", docType);
  const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload_failed");
  const j = (await res.json()) as { key: string; url: string };
  return {
    key: j.key,
    url: j.url,
    name: file.name,
    updatedAt: new Date().toISOString(),
  };
}
```

**Document Types:**

- `idFront` - Government ID front
- `idBack` - Government ID back
- `captainLicense` - Captain license certificate
- `boatRegistration` - Boat registration document
- `fishingLicense` - Fishing license
- `additional` - Additional supporting documents

### 2. Server-Side Upload Processing

**API Route:** `/api/blob/upload/route.ts`

**Flow:**

1. Authenticate user session
2. Validate file and docType
3. Sanitize filename
4. Generate blob storage key
5. Upload to Vercel Blob
6. Return `{ key, url }` to client

**Key Generation Logic:**

```typescript
// For verification documents
key = `verification/${userId}/${timestamp}-${sanitized}`;

// Examples:
// verification/user_abc123/1729234567890-id_front.jpg
// verification/user_abc123/1729234578901-captain_license.pdf
```

**Path Pattern:**

```
verification/
  └── {userId}/
      ├── {timestamp}-id_front.jpg
      ├── {timestamp}-id_back.jpg
      ├── {timestamp}-captain_license.pdf
      ├── {timestamp}-boat_registration.pdf
      ├── {timestamp}-fishing_license.jpg
      └── {timestamp}-additional_doc_1.pdf
```

## Storage in Vercel Blob

**Service:** Vercel Blob Storage
**Token:** `BLOB_READ_WRITE_TOKEN` (environment variable)
**Access:** Public URLs (signed)

**Blob Key Structure:**

```
verification/{userId}/{timestamp}-{sanitized-filename}
```

**Example Keys:**

```
verification/clxyz123abc/1729234567890-government_id_front.jpg
verification/clxyz123abc/1729234578901-government_id_back.jpg
verification/clxyz123abc/1729234589012-captain_license.pdf
verification/clxyz123abc/1729234599123-boat_registration_certificate.pdf
verification/clxyz123abc/1729234609234-fishing_license.jpg
verification/clxyz123abc/1729234619345-additional_insurance_doc.pdf
```

**URL Format:**

```
https://{vercel-blob-domain}/{key}
```

## Database Storage

**Model:** `CaptainVerification`
**Schema Location:** `prisma/schema.prisma`

### Schema Definition

```prisma
model CaptainVerification {
  id               String             @id @default(cuid())
  userId           String             @unique
  status           VerificationStatus @default(PENDING)
  idFront          Json?              // { key, url, name, updatedAt, status?, validForPeriod? }
  idBack           Json?              // { key, url, name, updatedAt, status?, validForPeriod? }
  captainLicense   Json?              // { key, url, name, updatedAt, status?, validForPeriod? }
  boatRegistration Json?              // { key, url, name, updatedAt, status?, validForPeriod? }
  fishingLicense   Json?              // { key, url, name, updatedAt, status?, validForPeriod? }
  additional       Json @default("[]") // Array of { key, url, name, updatedAt, status? }
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  user             User               @relation(fields: [userId], references: [id])
}
```

### JSON Structure for Documents

**Single Document (idFront, idBack, etc.):**

```json
{
  "key": "verification/user123/1729234567890-id_front.jpg",
  "url": "https://blob.vercel-storage.com/...",
  "name": "id_front.jpg",
  "updatedAt": "2025-10-17T10:30:00.000Z",
  "status": "processing" | "validated",
  "validForPeriod": {
    "from": "2025-01-01",
    "to": "2030-12-31"
  }
}
```

**Additional Documents Array:**

```json
[
  {
    "key": "verification/user123/1729234619345-insurance.pdf",
    "url": "https://blob.vercel-storage.com/...",
    "name": "Insurance Certificate.pdf",
    "updatedAt": "2025-10-17T10:35:00.000Z"
  },
  {
    "key": "verification/user123/1729234629456-safety_cert.pdf",
    "url": "https://blob.vercel-storage.com/...",
    "name": "Safety Certification.pdf",
    "updatedAt": "2025-10-17T10:36:00.000Z",
    "status": "validated"
  }
]
```

## API Routes

### 1. POST `/api/captain/verification`

**Purpose:** Save/update verification documents

**Authentication:** Required (CAPTAIN role)

**Request Body Patterns:**

**a) Upload Single Document:**

```json
{
  "idFront": {
    "key": "verification/user123/...",
    "url": "https://...",
    "name": "id_front.jpg",
    "updatedAt": "2025-10-17T10:30:00.000Z"
  }
}
```

**b) Add Additional Document:**

```json
{
  "additionalAdd": {
    "key": "verification/user123/...",
    "url": "https://...",
    "name": "insurance.pdf",
    "updatedAt": "2025-10-17T10:35:00.000Z"
  }
}
```

**c) Remove Additional Document:**

```json
{
  "additionalRemove": "verification/user123/1729234619345-insurance.pdf"
}
```

**d) Update Additional Document Name:**

```json
{
  "additionalUpdateName": {
    "key": "verification/user123/...",
    "name": "Updated Document Name.pdf"
  }
}
```

**e) Remove Single Document:**

```json
{
  "remove": "idFront"
}
```

**f) Submit for Verification:**

Government ID (both sides):

```json
{
  "submitGovtId": true
}
```

Single field:

```json
{
  "submit": "captainLicense"
}
```

**Response:**

```json
{
  "ok": true
}
```

**Error Responses:**

- `401` - Unauthorized
- `403` - `{ "error": "locked" }` - Document already validated
- `400` - Invalid request
- `404` - Document not found

### 2. GET `/api/captain/verification`

**Purpose:** Fetch current verification data

**Authentication:** Required (CAPTAIN role)

**Response:**

```json
{
  "verification": {
    "id": "clxyz...",
    "userId": "user123",
    "status": "PENDING",
    "idFront": {
      "key": "verification/user123/...",
      "url": "https://...",
      "name": "id_front.jpg",
      "updatedAt": "2025-10-17T10:30:00.000Z",
      "status": "validated"
    },
    "idBack": { ... },
    "captainLicense": null,
    "boatRegistration": null,
    "fishingLicense": null,
    "additional": [],
    "createdAt": "2025-10-15T08:00:00.000Z",
    "updatedAt": "2025-10-17T10:30:00.000Z"
  }
}
```

### 3. POST `/api/blob/upload`

**Purpose:** Upload file to Vercel Blob

**Authentication:** Required

**Request:** `multipart/form-data`

- `file`: File to upload
- `docType`: Document type (verification types listed above)

**Response:**

```json
{
  "ok": true,
  "url": "https://blob.vercel-storage.com/...",
  "key": "verification/user123/1729234567890-document.pdf"
}
```

### 4. POST `/api/blob/delete`

**Purpose:** Delete blob from storage

**Request:**

```json
{
  "key": "verification/user123/1729234567890-document.pdf"
}
```

## Document Status Lifecycle

### Status Values

1. **No Status** (undefined) - Recently uploaded, not submitted
2. **`processing`** - Submitted for staff review
3. **`validated`** - Approved by staff/admin

### Status Transitions

```
Upload → (no status) → Submit → "processing" → Staff Review → "validated"
                ↓
             Replace (if not validated)
                ↓
             Delete (if not validated)
```

### Protected Actions

**Validated documents cannot be:**

- Replaced
- Deleted
- Updated

Attempting these actions returns `403 Forbidden` with `{ "error": "locked" }`.

## File Type Support

**Accepted File Types:**

**Government ID:**

- Images only: `image/*`
- Common formats: JPG, PNG, WEBP, HEIC

**Other Documents:**

- All file types: `*/*`
- Images: JPG, PNG, WEBP, GIF
- Documents: PDF, DOC, DOCX, RTF
- Spreadsheets: XLS, XLSX, CSV
- Archives: ZIP, RAR, 7Z, TAR, GZ

**File Size Limits:**

- Standard uploads: No explicit limit (server/Vercel limits apply)
- Videos (if enabled): 50MB max (see `MAX_SHORT_VIDEO_BYTES`)

## UI Features

### Upload Controls

1. **Single File Upload:**

   - Click "Upload File" button
   - Or "Replace File" if existing
   - Shows thumbnail preview for images
   - Shows file type icon for documents

2. **Multiple File Upload:**
   - Drag & drop or click to select
   - Upload multiple at once
   - Inline rename capability
   - Individual remove buttons

### Visual States

**Status Badges:**

- **Validated:** Green badge with checkmark icon
- **Processing:** Amber badge
- **Uploaded:** Gray text with timestamp
- **Not Uploaded:** "Not uploaded" in gray

**Section Collapsing:**

- Sections auto-collapse after submission
- Click header to expand/collapse
- Validated sections show green badge when collapsed

### Validation Rules

**Government ID:**

- Both front AND back required before submission
- Cannot submit individually
- Must submit together via "Save" button

**Optional Documents:**

- Can submit individually
- Uploaded → Save to mark as "processing"
- Not required for account approval

## Admin/Staff Review

**Review Interface:** `/staff/media` or dedicated verification dashboard

**Staff Actions:**

1. View uploaded documents
2. Mark as "validated"
3. Set validity period (optional)
4. Reject/request reupload

**Status Updates:**

- Staff sets `status: "validated"`
- Optionally sets `validForPeriod: { from, to }`
- Document becomes locked (cannot be replaced/deleted)

## Data Cleanup

### Blob Deletion

**Client-Side Deletion:**

```typescript
async function deleteKey(key?: string) {
  if (!key) return;
  await fetch("/api/blob/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
```

**Server-Side Deletion (Best-Effort):**

```typescript
import { del } from "@vercel/blob";

await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
```

### Orphan Blobs

**Scenario:** Upload succeeds but database save fails

**Detection:** Blob exists in storage but no reference in `CaptainVerification`

**Prevention:** Transaction pattern (upload → save → delete on failure)

**Cleanup:** Admin storage inventory page (`/staff/media` → Storage tab)

## Security Considerations

### Access Control

1. **Upload API:** Requires authenticated session
2. **Verification API:** User can only access their own documents
3. **Blob URLs:** Publicly accessible (signed URLs)
4. **Validated Documents:** Locked from modification

### Data Protection

- Document keys include `userId` for isolation
- Timestamps prevent filename collisions
- Sanitized filenames (remove special chars)
- Public blob access (no sensitive data in URL)

### Best Practices

1. **Never expose raw blob keys to unauthorized users**
2. **Validate docType on server-side**
3. **Check validation status before allowing changes**
4. **Best-effort cleanup on delete (non-blocking)**
5. **Use upsert pattern for verification records**

## Troubleshooting

### Common Issues

**1. Upload fails with 413 (Too Large)**

- Check file size vs limits
- Video uploads limited to 50MB

**2. Upload succeeds but document doesn't appear**

- Check network errors in browser console
- Verify POST to `/api/captain/verification` succeeded
- Refresh page to re-fetch from server

**3. Cannot replace validated document**

- Expected behavior - validated docs are locked
- Contact staff/admin to revert validation status

**4. Blob storage full/quota exceeded**

- Check Vercel Blob usage dashboard
- Clean up orphan blobs via admin tools
- Upgrade storage plan if needed

### Debug Steps

1. **Client-side:**

   - Open browser DevTools → Network tab
   - Check `/api/blob/upload` response
   - Check `/api/captain/verification` response
   - Verify `key` and `url` returned

2. **Server-side:**

   - Check Vercel logs for upload errors
   - Verify `BLOB_READ_WRITE_TOKEN` set
   - Check Prisma query logs
   - Verify user session exists

3. **Database:**
   - Query `CaptainVerification` table
   - Verify JSON structure is valid
   - Check `updatedAt` timestamp
   - Confirm `userId` matches session

## Related Documentation

- `docs/API_VIDEO_ROUTES.md` - Video upload pipeline
- `prisma/schema.prisma` - Database schema
- `.github/copilot-instructions.md` - Project conventions
- `docs/STORAGE_PAGINATION_FIX.md` - Admin storage inventory

## Summary

**Storage Location:** Vercel Blob under `verification/{userId}/` prefix

**Database:** `CaptainVerification` model with JSON fields

**API Endpoints:**

- `POST /api/blob/upload` - Upload file
- `POST /api/captain/verification` - Save metadata
- `GET /api/captain/verification` - Fetch data
- `POST /api/blob/delete` - Delete blob

**Status Flow:** Upload → Submit → Processing → Validated (locked)

**Admin Tools:** `/staff/media` for storage inventory and orphan cleanup
