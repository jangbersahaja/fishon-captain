---
generated_by: docs-consolidation-bot
generated_at: 2025-10-17T04:26:24Z
sources:
  - docs/Z_INDEX_SYSTEM.md
  - docs/guides/Z_INDEX_SYSTEM.md
---

# z-index-design-system

---- SOURCE: docs/Z_INDEX_SYSTEM.md ----

# Z-Index Design System

This document outlines the z-index layering system used throughout the FishOn Captain Registration application.

## Design System

The z-index values are centralized in `/src/config/zIndex.ts` to prevent layout conflicts and ensure consistent layering.

### Layers (from bottom to top)

| Layer           | Range        | Components                                            | Purpose               |
| --------------- | ------------ | ----------------------------------------------------- | --------------------- |
| **Base**        | z-0 to z-9   | Basic content, raised elements                        | Default content layer |
| **Interactive** | z-10 to z-19 | Hover states, focus indicators                        | Interactive feedback  |
| **Positioned**  | z-20 to z-39 | Dropdowns, tooltips, sticky elements                  | Positioned overlays   |
| **Navigation**  | z-40 to z-59 | Main navbar, sub-navigation, nav dropdowns            | Navigation hierarchy  |
| **Overlay**     | z-60 to z-79 | Offline banner, notifications                         | System overlays       |
| **Modal**       | z-80 to z-99 | Modal backdrops, modal content                        | Modal dialogs         |
| **Critical**    | z-100+       | Toast notifications, loading indicators, debug panels | Critical UI elements  |

### Specific Values

```typescript
export const zIndex = {
  // Base content layer
  base: 0,
  content: 1,
  raised: 2,

  // Interactive elements
  interactive: 10,
  hover: 11,
  focus: 12,

  // Positioned elements
  dropdown: 20, // Form dropdowns, autocomplete
  tooltip: 25, // Tooltips and help text
  popover: 30, // Popovers and contextual content
  sticky: 35, // Sticky headers/sidebars

  // Navigation layer
  navigation: 40, // Main navbar
  subNavigation: 45, // Secondary navigation (staff header)
  navigationDropdown: 50, // Navigation dropdown menus (rendered in portal)

  // Overlay layer
  overlay: 60, // General overlays
  offlineBanner: 70, // Offline status banner
  notification: 75, // Notification banners

  // Modal layer
  backdrop: 80, // Modal backdrops
  modal: 90, // Modal containers
  modalContent: 95, // Modal content

  // Critical layer
  toast: 100, // Toast notifications
  loading: 110, // Loading overlays
  debug: 999, // Debug panels (development only)
};
```

## Usage

### In Components

```typescript
import { zIndexClasses } from "@/config/zIndex";

// Use in className
<div className={`fixed inset-0 ${zIndexClasses.backdrop}`}>
  <div className={`relative ${zIndexClasses.modal}`}>Modal content</div>
</div>;
```

### Getting Numeric Values

```typescript
import { getZIndex } from "@/config/zIndex";

const modalZIndex = getZIndex("modal"); // Returns 90
```

## Component Hierarchy

The following components are properly layered:

1. **Base Layout**

   - Main content: `z-0`
   - Raised cards: `z-[2]`
   - Captain portal aside elements (`captain/layout.tsx`): `z-[1]`

2. **Navigation**

   - Main navbar (`Navbar.tsx`): `z-40`
   - Staff header (`staff/layout.tsx`): `z-[45]`
   - Navigation dropdowns: `z-50`

3. **Forms & Interactions**

   - Form dropdowns (`AddressAutocomplete`, `CalendarPicker`): `z-20`
   - Tooltips and hover states: `z-[25]`

4. **System Overlays**

   - Offline banner (`OfflineBanner.tsx`): `z-[70]`

5. **Modals & Dialogs**

   - Modal backdrops (`ConfirmDialog`, `CharterGallery`): `z-[80]`
   - Modal content: `z-[90]`

6. **Critical UI**
   - Toast notifications: `z-[100]`
   - Debug panels: `z-[999]`

## Best Practices

1. **Always use the design system values** - Don't create arbitrary z-index values
2. **Import from the central config** - Use `zIndexClasses` for Tailwind or `getZIndex()` for custom CSS
3. **Consider the layer hierarchy** - Navigation should always be below modals, modals below toasts, etc.
4. **Update this documentation** when adding new components or layers

## Common Issues Fixed

1. **Navbar dropdown behind staff header** - Navigation dropdown (z-50) now appears above sub-navigation (z-45)
2. **Modal backdrops inconsistent** - All modals now use consistent backdrop (z-80) and content (z-90) values
3. **Form dropdowns behind navigation** - Form dropdowns (z-20) correctly appear below navigation but above content
4. **Dropdowns behind captain layout aside elements** - Captain portal aside elements now use z-[1] to ensure form dropdowns (z-20) and navigation dropdowns (z-50) appear correctly
5. **Navbar dropdown behind form components due to stacking context** - Fixed by rendering navbar dropdown in a React portal to escape all stacking contexts created by backdrop-blur, transforms, and other CSS properties. Combined with z-index fixes for tooltips (z-25), debug panels (z-999), and modals (z-80)
6. **Navbar dropdown positioning issues** - Changed from absolute to fixed positioning with dynamic position calculation for responsive behavior

## Adding New Components

When adding new components that need z-index positioning:

1. Determine which layer the component belongs to
2. Use the appropriate value from the design system
3. If a new layer is needed, update the design system and this documentation
4. Test with existing components to ensure proper layering

---

Last updated: October 4, 2025 - Fixed navbar dropdown stacking context issues using React portal


---- SOURCE: docs/guides/Z_INDEX_SYSTEM.md ----

# Z-Index Design System

This document outlines the z-index layering system used throughout the FishOn Captain Registration application.

## Design System

The z-index values are centralized in `/src/config/zIndex.ts` to prevent layout conflicts and ensure consistent layering.

### Layers (from bottom to top)

| Layer           | Range        | Components                                            | Purpose               |
| --------------- | ------------ | ----------------------------------------------------- | --------------------- |
| **Base**        | z-0 to z-9   | Basic content, raised elements                        | Default content layer |
| **Interactive** | z-10 to z-19 | Hover states, focus indicators                        | Interactive feedback  |
| **Positioned**  | z-20 to z-39 | Dropdowns, tooltips, sticky elements                  | Positioned overlays   |
| **Navigation**  | z-40 to z-59 | Main navbar, sub-navigation, nav dropdowns            | Navigation hierarchy  |
| **Overlay**     | z-60 to z-79 | Offline banner, notifications                         | System overlays       |
| **Modal**       | z-80 to z-99 | Modal backdrops, modal content                        | Modal dialogs         |
| **Critical**    | z-100+       | Toast notifications, loading indicators, debug panels | Critical UI elements  |

### Specific Values

```typescript
export const zIndex = {
  // Base content layer
  base: 0,
  content: 1,
  raised: 2,

  // Interactive elements
  interactive: 10,
  hover: 11,
  focus: 12,

  // Positioned elements
  dropdown: 20, // Form dropdowns, autocomplete
  tooltip: 25, // Tooltips and help text
  popover: 30, // Popovers and contextual content
  sticky: 35, // Sticky headers/sidebars

  // Navigation layer
  navigation: 40, // Main navbar
  subNavigation: 45, // Secondary navigation (staff header)
  navigationDropdown: 50, // Navigation dropdown menus (rendered in portal)

  // Overlay layer
  overlay: 60, // General overlays
  offlineBanner: 70, // Offline status banner
  notification: 75, // Notification banners

  // Modal layer
  backdrop: 80, // Modal backdrops
  modal: 90, // Modal containers
  modalContent: 95, // Modal content

  // Critical layer
  toast: 100, // Toast notifications
  loading: 110, // Loading overlays
  debug: 999, // Debug panels (development only)
};
```

## Usage

### In Components

```typescript
import { zIndexClasses } from "@/config/zIndex";

// Use in className
<div className={`fixed inset-0 ${zIndexClasses.backdrop}`}>
  <div className={`relative ${zIndexClasses.modal}`}>Modal content</div>
</div>;
```

### Getting Numeric Values

```typescript
import { getZIndex } from "@/config/zIndex";

const modalZIndex = getZIndex("modal"); // Returns 90
```

## Component Hierarchy

The following components are properly layered:

1. **Base Layout**

   - Main content: `z-0`
   - Raised cards: `z-[2]`
   - Captain portal aside elements (`captain/layout.tsx`): `z-[1]`

2. **Navigation**

   - Main navbar (`Navbar.tsx`): `z-40`
   - Staff header (`staff/layout.tsx`): `z-[45]`
   - Navigation dropdowns: `z-50`

3. **Forms & Interactions**

   - Form dropdowns (`AddressAutocomplete`, `CalendarPicker`): `z-20`
   - Tooltips and hover states: `z-[25]`

4. **System Overlays**

   - Offline banner (`OfflineBanner.tsx`): `z-[70]`

5. **Modals & Dialogs**

   - Modal backdrops (`ConfirmDialog`, `CharterGallery`): `z-[80]`
   - Modal content: `z-[90]`

6. **Critical UI**
   - Toast notifications: `z-[100]`
   - Debug panels: `z-[999]`

## Best Practices

1. **Always use the design system values** - Don't create arbitrary z-index values
2. **Import from the central config** - Use `zIndexClasses` for Tailwind or `getZIndex()` for custom CSS
3. **Consider the layer hierarchy** - Navigation should always be below modals, modals below toasts, etc.
4. **Update this documentation** when adding new components or layers

## Common Issues Fixed

1. **Navbar dropdown behind staff header** - Navigation dropdown (z-50) now appears above sub-navigation (z-45)
2. **Modal backdrops inconsistent** - All modals now use consistent backdrop (z-80) and content (z-90) values
3. **Form dropdowns behind navigation** - Form dropdowns (z-20) correctly appear below navigation but above content
4. **Dropdowns behind captain layout aside elements** - Captain portal aside elements now use z-[1] to ensure form dropdowns (z-20) and navigation dropdowns (z-50) appear correctly
5. **Navbar dropdown behind form components due to stacking context** - Fixed by rendering navbar dropdown in a React portal to escape all stacking contexts created by backdrop-blur, transforms, and other CSS properties. Combined with z-index fixes for tooltips (z-25), debug panels (z-999), and modals (z-80)
6. **Navbar dropdown positioning issues** - Changed from absolute to fixed positioning with dynamic position calculation for responsive behavior

## Adding New Components

When adding new components that need z-index positioning:

1. Determine which layer the component belongs to
2. Use the appropriate value from the design system
3. If a new layer is needed, update the design system and this documentation
4. Test with existing components to ensure proper layering

---

Last updated: October 4, 2025 - Fixed navbar dropdown stacking context issues using React portal



## TODO: Review & Clean
- [ ] Remove small duplicated lines / housekeeping.
- [ ] Move anything clearly obsolete into Archive section below.

### Archive / Legacy (moved)
> All originals moved to docs-archived/z-index-design-system/
