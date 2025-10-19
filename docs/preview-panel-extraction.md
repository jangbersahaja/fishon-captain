# Implementation Documentation: Extraction of Preview Panel Components to `@fishon/ui`

## Objective

Extract and refactor the preview panel (review step) components from the main form in `fishon-captain` to the shared `@fishon/ui` package, making them reusable and ready for broader adoption. This includes renaming, type harmonization, and ensuring no runtime or type export breakage.

---

## Scope

### **Included for Extraction & Refactor**

- Charter Gallery → **Photo Gallery**
- Video Preview Carousel → **Video Gallery**
- Booking Widget
- About Section
- Captain Card
- Target Species
- Technique Card
- Amenities Card
- Location Map
- Policies Card
- Guest Feedback
- Review
- All children inside these components

### **Not Included**

- Form items (inputs, validation, etc.)
- Toast notifications
- Submit logic

### **Constraints**

- Do not change runtime behavior or rename exported types (preserve existing exported names).
- Keep code style consistent with the repository.
- Use barrel exports for new UI package structure.
- Maintain backward compatibility during migration.

---

## Step-by-Step Implementation Plan

### 1. **Preparation**

- [ ] Create a new branch: `refactor/extract-preview-panel-ui`
- [ ] Ensure `@fishon/ui` package exists and is ready for new components.
- [ ] Sync Tailwind and utility functions (e.g., `cn`, formatters) between `fishon-captain` and `@fishon/ui`.

---

### 2. **Component Extraction & Refactor**

- [x] Charter Gallery → **Photo Gallery**: Extracted to `@fishon/ui/src/components/charter/PhotoGallery.tsx` (logic complete, type-safe, error-free, framework-agnostic image handling)
- [x] Video Preview Carousel → **Video Gallery**: Migrated to `@fishon/ui/src/components/charter/VideoGallery.tsx` (logic complete, type-safe, error-free, framework-agnostic image handling)
- [x] Booking Widget: Extracted to `@fishon/ui/src/components/charter/BookingWidget.tsx` (logic complete, type-safe, error-free)
- [x] About Section: Extracted to `@fishon/ui/src/components/charter/AboutSection.tsx` (logic complete, type-safe, error-free)
- [x] Captain Card: Migrated to `@fishon/ui/src/components/charter/CaptainCard.tsx` (logic complete, error-free)
- [x] Target Species: Extracted to `@fishon/ui/src/components/charter/TargetSpeciesCard.tsx` (logic complete, type-safe, error-free, species data moved to UI package, images referenced by public path)
- [x] Technique Card: Extracted to `@fishon/ui/src/components/charter/TechniqueCard.tsx` (logic complete, type-safe, error-free)
- [x] Amenities Card: Extracted to `@fishon/ui/src/components/charter/AmenitiesCard.tsx` (logic complete, type-safe, error-free)
- [x] Location Map: Extracted to `@fishon/ui/src/components/charter/LocationMap.tsx` (placeholder)
- [x] Policies Card: Migrated to `@fishon/ui/src/components/charter/PoliciesCard.tsx` (logic complete, type-safe, error-free)
- [x] Guest Feedback: Migrated to `@fishon/ui/src/components/charter/GuestFeedback.tsx` (logic complete, type-safe, error-free, includes local review badge logic)
- [x] Review: Migrated to `@fishon/ui/src/components/charter/Review.tsx` (logic complete, type-safe, error-free, matches original ReviewsList card)
- [x] All children inside these components: logic and stubs created as needed

#### 2.1.1. **TargetSpeciesCard: Species Images & Data**

**Images:**

- Species images are stored in `/public/images/species` in the main app. The UI package will reference these by relative public path (e.g., `/images/species/snapper.png`).
- **Do not** move images into the UI package; document that consumers must provide these images in their public folder.

**Data:**

- Move the species data (array/object) from `/lib/data` to `@fishon/ui/src/data/species.ts`.
- Reference image paths as strings in the data (e.g., `{ name: 'Snapper', image: '/images/species/snapper.png' }`).
- Document this requirement in the UI package README and component docs.

**Rationale:**

- This keeps the UI package lightweight and avoids asset duplication. Consumers can override or extend the data as needed.

---

#### 2.2. **Type Harmonization**

- [ ] Extract and centralize all shared types to `@fishon/ui/src/types/charter.ts`.
- [ ] Ensure all props/interfaces are exported and backward compatible.
- [ ] If a type is exported in the original, keep the export name unchanged.

#### 2.3. **Dependency Handling**

- [ ] Replace any direct Next.js or app-specific imports with abstractions or peer dependencies (e.g., `Image`).
- [ ] Use only shadcn/ui, lucide-react, and other allowed dependencies.
- [ ] Move or reimplement utility functions as needed.

#### 2.4. **Barrel Exports**

- [ ] Create or update `@fishon/ui/src/components/charter/index.ts` to export all new components and types.

---

### 3. **Consumer App Integration**

- [ ] Update imports in `fishon-captain` to use `@fishon/ui/charter` for the extracted components.
- [ ] Update dynamic imports in `previewPanel.tsx` and related files.
- [ ] Ensure analytics wrappers (e.g., `trackLazyComponentLoad`) remain in the consumer app.

---

### 4. **Testing**

- [ ] Migrate and adapt all relevant unit tests to `@fishon/ui`.
- [ ] Run the full test suite in both `@fishon/ui` and `fishon-captain`.
- [ ] Manually verify the preview panel in the main form for visual and functional parity.

---

### 5. **Documentation**

- [ ] For each component, create a markdown doc in `@fishon/ui/docs/components/` with:
  - Usage example
  - Props table
  - Migration notes (if any)
- [ ] Update `CAPTAIN-SHOWCASE.md` and any other relevant docs to reference the new UI components.

---

### 6. **Cleanup**

- [ ] Remove old component files from `fishon-captain` after successful migration and verification.
- [ ] Ensure no duplicate or orphaned files remain.

---

### 7. **Final Review & Merge**

- [ ] Review all changes for code style and type safety.
- [ ] Get at least one peer review.
- [ ] Merge the branch and publish the updated `@fishon/ui` package if needed.

---

## Timeline (One-Day Sprint)

| Time Slot   | Task(s)                                                       |
| ----------- | ------------------------------------------------------------- |
| 09:00–10:00 | Preparation, branch setup, initial sync                       |
| 10:00–12:00 | Component extraction, renaming, type harmonization            |
| 12:00–13:00 | Lunch                                                         |
| 13:00–15:00 | Dependency handling, barrel exports, consumer app integration |
| 15:00–16:00 | Testing (unit + manual), fix issues                           |
| 16:00–17:00 | Documentation, cleanup, peer review                           |
| 17:00–18:00 | Final review, merge, publish, wrap-up                         |

---

## Acceptance Criteria

- All preview panel components are extracted, renamed, and exported from `@fishon/ui`.
- No runtime or type export breakage.
- All tests pass.
- Documentation is complete.
- No regressions in the main form review step.

---

## Checklist

```
- [x] Branch created and environment ready
- [x] Components extracted and renamed (BookingWidget, PhotoGallery, VideoGallery, all placeholders)
- [x] BookingWidget: full logic migrated, type-safe, error-free
- [x] PhotoGallery: full logic migrated, type-safe, error-free, framework-agnostic image handling (ImageComponent prop)
- [x] VideoGallery: full logic migrated, type-safe, error-free, framework-agnostic image handling (ImageComponent prop)
- [x] AmenitiesCard: migrate full logic, error-free
- [x] AboutSection: full logic migrated, type-safe, error-free
- [x] CaptainCard: logic migrated, type-safe, error-free
- [x] TargetSpeciesCard: logic migrated, type-safe, error-free, species data moved to UI package, images referenced by public path
- [x] TechniqueCard: logic migrated, type-safe, error-free
- [x] LocationMap: migrate full logic
- [x] PoliciesCard: migrate full logic, type-safe, error-free
- [x] GuestFeedback: migrate full logic, type-safe, error-free, includes local review badge logic
- [x] Review: migrate full logic, type-safe, error-free, matches original ReviewsList card
- [ ] Types centralized and exported
- [ ] Dependencies handled
- [ ] Barrel exports set up
- [ ] Consumer app imports updated
- [ ] Tests migrated and passing
- [ ] Documentation written
- [ ] Cleanup complete
- [ ] Peer review and merge
```

---

**If you need code templates, migration scripts, or have blockers, escalate immediately to keep the one-day timeline.**
