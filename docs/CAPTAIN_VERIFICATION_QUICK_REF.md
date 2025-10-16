# Captain Verification Documents - Quick Reference

## 🗂️ Storage Structure in Vercel Blob

```
vercel-blob-storage/
├── verification/
│   └── {userId}/                          ← User-scoped folder
│       ├── {timestamp}-id_front.jpg       ← Government ID front
│       ├── {timestamp}-id_back.jpg        ← Government ID back
│       ├── {timestamp}-captain_license.pdf
│       ├── {timestamp}-boat_reg.pdf
│       ├── {timestamp}-fishing_license.jpg
│       └── {timestamp}-insurance_doc.pdf  ← Additional docs
│
├── captains/{userId}/media/               ← Charter media (images only)
├── captain-videos/{userId}/               ← Short-form videos
└── temp/{charterId}/original/             ← Video processing temp
```

## 📊 Database Schema

**Table:** `CaptainVerification`

| Field              | Type     | Description                                               |
| ------------------ | -------- | --------------------------------------------------------- |
| `id`               | String   | Primary key                                               |
| `userId`           | String   | Owner (unique)                                            |
| `status`           | Enum     | PENDING/APPROVED/REJECTED                                 |
| `idFront`          | JSON     | `{ key, url, name, updatedAt, status?, validForPeriod? }` |
| `idBack`           | JSON     | Same structure as idFront                                 |
| `captainLicense`   | JSON     | Same structure                                            |
| `boatRegistration` | JSON     | Same structure                                            |
| `fishingLicense`   | JSON     | Same structure                                            |
| `additional`       | JSON     | Array of document objects                                 |
| `createdAt`        | DateTime | Record creation                                           |
| `updatedAt`        | DateTime | Last update                                               |

## 🔄 Upload Flow Diagram

```
┌─────────────┐
│  Captain    │
│  Selects    │
│  File       │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ POST /api/blob/upload           │
│ FormData:                       │
│  - file: File                   │
│  - docType: "idFront"           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Server validates:               │
│  ✓ User authenticated           │
│  ✓ File exists                  │
│  ✓ docType allowed              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Generate blob key:              │
│ verification/{userId}/          │
│   {timestamp}-{filename}        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Upload to Vercel Blob           │
│ Returns: { key, url }           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Client saves metadata:          │
│ POST /api/captain/verification  │
│ Body: { idFront: {...} }        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Update CaptainVerification      │
│ Set idFront JSON field          │
└─────────────────────────────────┘
```

## 🔐 Document Status Lifecycle

```
┌──────────────┐
│   UPLOADED   │  ← File uploaded, metadata saved
│  (no status) │     Captain can replace/delete
└──────┬───────┘
       │ Captain clicks "Save"
       ▼
┌──────────────┐
│  PROCESSING  │  ← Submitted for staff review
│  (pending)   │     Captain CANNOT replace/delete
└──────┬───────┘
       │ Staff reviews
       ▼
┌──────────────┐
│  VALIDATED   │  ← Approved by staff
│  (locked)    │     Captain CANNOT modify
│              │     Optional: validForPeriod set
└──────────────┘
```

## 🎯 API Quick Reference

### Upload File

```bash
POST /api/blob/upload
Content-Type: multipart/form-data

FormData:
  file: <binary>
  docType: "idFront" | "idBack" | "captainLicense" | ...

Response:
  { ok: true, url: "https://...", key: "verification/..." }
```

### Save Document Metadata

```bash
POST /api/captain/verification
Content-Type: application/json

Body:
  { "idFront": { "key": "...", "url": "...", "name": "...", "updatedAt": "..." } }

Response:
  { ok: true }
```

### Fetch Verification Data

```bash
GET /api/captain/verification

Response:
  {
    "verification": {
      "userId": "...",
      "status": "PENDING",
      "idFront": { ... },
      "idBack": { ... },
      ...
    }
  }
```

### Submit for Review

```bash
POST /api/captain/verification
Content-Type: application/json

# Government ID (both sides)
Body: { "submitGovtId": true }

# Single document
Body: { "submit": "captainLicense" }

Response:
  { ok: true }
```

### Delete Blob

```bash
POST /api/blob/delete
Content-Type: application/json

Body:
  { "key": "verification/user123/..." }
```

## 📋 Document Types & Accept Filters

| Document Type     | `docType` Value    | Accept Filter | Required |
| ----------------- | ------------------ | ------------- | -------- |
| Gov ID Front      | `idFront`          | `image/*`     | ✅ Yes   |
| Gov ID Back       | `idBack`           | `image/*`     | ✅ Yes   |
| Captain License   | `captainLicense`   | `*/*`         | ❌ No    |
| Boat Registration | `boatRegistration` | `*/*`         | ❌ No    |
| Fishing License   | `fishingLicense`   | `*/*`         | ❌ No    |
| Additional Docs   | `additional`       | `*/*`         | ❌ No    |

## 🚨 Common Issues & Solutions

### Issue: Upload succeeds but doc doesn't appear

**Cause:** Metadata save to database failed
**Solution:**

1. Check browser console for `/api/captain/verification` errors
2. Refresh page to re-fetch from server
3. Re-upload if needed

### Issue: Cannot replace validated document

**Cause:** Document status is "validated" (locked)
**Solution:**

- Contact staff/admin to unlock
- This is expected behavior for approved documents

### Issue: 403 Forbidden when trying to replace

**Cause:** Document is validated/locked
**Response:** `{ "error": "locked" }`
**Solution:** Document is approved and immutable

### Issue: Orphan blobs (storage without DB reference)

**Cause:** Upload succeeded but DB save failed
**Solution:**

- Admin: Go to `/staff/media` → Storage tab
- Filter: `linked: orphan`
- Review and delete orphan blobs

## 🔍 Finding Documents in Admin Panel

**Path:** `/staff/media` → **Storage** tab

**Filters:**

- **Scope:** `verification` (select from dropdown)
- **Linked:** `orphan` (find orphan blobs)
- **Search:** Enter `userId` or filename

**Columns:**

- Blob Key (e.g., `verification/user123/...`)
- Size
- Uploaded At
- Linked To (shows if referenced in DB)
- Actions (Delete)

## 📁 Related Files

### Frontend

- `/src/app/(portal)/captain/verification/page.tsx` - Verification page UI
- `/src/components/captain/` - Reusable captain components

### Backend

- `/src/app/api/captain/verification/route.ts` - Verification API
- `/src/app/api/blob/upload/route.ts` - Upload handler
- `/src/app/api/blob/delete/route.ts` - Delete handler

### Database

- `/prisma/schema.prisma` - Database schema
- Model: `CaptainVerification`

### Admin Tools

- `/src/app/(admin)/staff/media/` - Admin storage inventory

## 🛠️ Developer Checklist

When modifying verification documents:

- [ ] Update `CaptainVerification` schema if adding fields
- [ ] Run `npx prisma migrate dev` after schema changes
- [ ] Update docType validation in `/api/blob/upload`
- [ ] Update client-side upload function if needed
- [ ] Test upload → save → submit → validate flow
- [ ] Verify orphan blob cleanup works
- [ ] Check admin storage inventory displays correctly
- [ ] Update this documentation

## 💡 Best Practices

1. **Always upsert** `CaptainVerification` record before saving documents
2. **Check validation status** before allowing replace/delete
3. **Use timestamps** in blob keys to prevent collisions
4. **Sanitize filenames** to remove special characters
5. **Best-effort cleanup** on delete (don't block on failure)
6. **Log errors** for upload/save failures
7. **Test with large files** (PDFs, high-res images)
8. **Test mobile uploads** (camera capture)

## 🔗 See Also

- [CAPTAIN_VERIFICATION_DOCUMENTS.md](./CAPTAIN_VERIFICATION_DOCUMENTS.md) - Full detailed documentation
- [STORAGE_PAGINATION_FIX.md](./STORAGE_PAGINATION_FIX.md) - Admin storage inventory
- [API_VIDEO_ROUTES.md](./API_VIDEO_ROUTES.md) - Video upload pipeline
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Project conventions
