# FishOn Schemas

Consolidated schema and type definitions for the FishOn Captain application.

## Purpose

This folder contains all runtime validators (Zod), TypeScript types/interfaces, DTOs representing API payloads/events, and event contract shapes used across the fishon-captain repository. It serves as a temporary consolidation before extraction into a shared package `@fishon/schemas`.

## Structure

```
src/schemas/
├── index.ts                  # Barrel export - import from here
├── charter.ts                # Charter form schemas (registration/onboarding)
├── charter-update.ts         # Charter update schemas (edit mode)
├── draft.ts                  # Draft management schemas
├── media.ts                  # Media upload and management schemas
├── video.ts                  # Video processing schemas
├── video-upload-types.ts     # Video upload lifecycle types
└── README.md                 # This file
```

## Usage

Import schemas and types from the barrel export:

```typescript
import { 
  charterFormSchema, 
  CharterFormValues,
  ProcessStatusEnum,
  VideoUploadStatus 
} from '@/schemas';
```

Or import directly from specific files if needed:

```typescript
import { tripSchema } from '@/schemas/charter';
import { MediaFileSchema } from '@/schemas/media';
```

## Schema Categories

### Charter Schemas (`charter.ts`)
- **charterFormSchema**: Main charter registration/onboarding form
- **tripSchema**: Individual fishing trip offerings
- **policiesSchema**: Charter policies and rules
- Step-specific schemas for multi-step form validation

### Charter Update (`charter-update.ts`)
- **CharterUpdateSchema**: Partial charter updates in edit mode
- Used by `/api/charters/[id]` PATCH endpoint

### Draft Schemas (`draft.ts`)
- **DraftPatchSchema**: Charter draft partial updates
- Supports optimistic locking with client version

### Media Schemas (`media.ts`)
- **MediaFileSchema**: Generic media file (images/videos)
- **FinalizeMediaSchema**: Media finalization payload
- **IncomingMediaSchema**: Media updates in edit mode
- **MediaRemovalSchema**: Media deletion requests

### Video Schemas (`video.ts`)
- **ProcessStatusEnum**: Video processing lifecycle states
- **CreateUploadSchema**: Video upload initialization
- **FinishFormSchema**: Video upload completion with trim metadata
- **TranscodePayloadSchema**: Worker transcoding payload

### Video Upload Types (`video-upload-types.ts`)
- Complete type definitions for video upload lifecycle
- Queue management types and configurations
- Progress tracking and error handling types

## Validation Examples

### Charter Form Validation
```typescript
import { charterFormSchema } from '@/schemas';

const result = charterFormSchema.safeParse(formData);
if (result.success) {
  // Valid data
  const values = result.data;
} else {
  // Validation errors
  console.error(result.error);
}
```

### Media Validation
```typescript
import { MediaFileSchema } from '@/schemas';

const mediaFile = {
  name: 'charters/123/media/photo.jpg',
  url: 'https://example.com/photo.jpg',
  sizeBytes: 1024000
};

const result = MediaFileSchema.safeParse(mediaFile);
```

## Testing

Tests for schemas are located in adjacent `__tests__` directories. To run schema tests:

```bash
npm test src/schemas/__tests__
```

## Important Notes

### Preserved Exports
All exported names are preserved from their original locations to maintain backward compatibility. **Do not rename exports** without coordinating changes across all consuming code.

### File Validation
Some schemas (e.g., `charterFormSchema`) include client-side file validation that checks `instanceof File`. These validations are skipped during server-side execution.

### Migration from Original Locations
Schemas were extracted from:
- `src/features/charter-onboarding/charterForm.schema.ts`
- `src/lib/schemas/video.ts`
- `src/server/media.ts`
- `src/server/drafts.ts`
- `src/types/videoUpload.ts`
- Various API route files with inline schemas

Original files now re-export from this location for backward compatibility.

## Next Steps

### Phase 1: Consolidation ✅
Gather all schemas into `src/schemas/` with barrel exports.

### Phase 2: Package Extraction (Planned)
1. Create `@fishon/schemas` npm package
2. Move schemas to new package
3. Add build pipeline (TypeScript compilation)
4. Publish to npm registry

### Phase 3: Migration (Planned)
1. Update imports across all FishOn services
2. Replace `@/schemas` imports with `@fishon/schemas`
3. Remove duplicated schema definitions
4. Deprecate this folder

## Contributing

When adding new schemas:

1. **Create a new file** for logical grouping (e.g., `booking.ts` for booking-related schemas)
2. **Export from barrel** - Add exports to `index.ts`
3. **Add JSDoc comments** - Document purpose and usage
4. **Write tests** - Add validation tests in `__tests__/`
5. **Update README** - Document the new schema here

### Schema Naming Conventions
- Schemas: `PascalCase` + `Schema` suffix (e.g., `CharterFormSchema`)
- Types: `PascalCase` (e.g., `CharterFormValues`)
- Enums: `PascalCase` + `Enum` suffix (e.g., `ProcessStatusEnum`)
- Functions: `camelCase` (e.g., `normalizeFinalizeMedia`)
