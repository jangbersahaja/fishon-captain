# Captain Showcase - Visual Demo & Layout Guide

## Page Layout Position

```
┌─────────────────────────────────────────────┐
│              HERO SECTION                   │
│  "List your charter on Fishon.my"          │
│  [Register] [WhatsApp] Stats               │
│              [Hero Image]                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         VALUE PROPS (Red Background)        │
│  What you get: 4 feature cards             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           HOW IT WORKS Section              │
│  Step 1 | Step 2 | Step 3                  │
└─────────────────────────────────────────────┘

████████████████████████████████████████████████
█                                              █
█  ★★ CAPTAIN SHOWCASE (NEW) ★★               █
█                                              █
█  "Meet Our Trusted Captains"                █
█  Section description & inspiration text     █
█                                              █
█  ┌──────────┐ ┌──────────┐ ┌──────────┐    █
█  │ Captain 1│ │ Captain 2│ │ Captain 3│    █
█  │ [Avatar] │ │ [Avatar] │ │ [Avatar] │    █
█  │ Name     │ │ Name     │ │ Name     │    █
█  │ City     │ │ City     │ │ City     │    █
█  │ Bio...   │ │ Bio...   │ │ Bio...   │    █
█  │ 8 Trips  │ │ 8 Trips  │ │ 8 Trips  │    █
█  └──────────┘ └──────────┘ └──────────┘    █
█                                              █
█  ┌──────────┐ ┌──────────┐ ┌──────────┐    █
█  │ Captain 5│ │ Captain 6│ │ Captain 7│    █
█  │ [Avatar] │ │ [Avatar] │ │ [Avatar] │    █
█  │ ...      │ │ ...      │ │ ...      │    █
█  └──────────┘ └──────────┘ └──────────┘    █
█                                              █
█  Bottom CTA:                                 █
█  "Ready to become a captain?"               █
█  [Get Started Now Button]                   █
█                                              █
████████████████████████████████████████████████

┌─────────────────────────────────────────────┐
│          PRICING Section                    │
│  Basic 10% | Silver 20% (Coming Soon)      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│    SAFETY & VERIFICATION (Red Background)   │
│  Awards & Badges | Safety Checks            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              FAQ Section                    │
│  Collapsible Q&A items                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      FINAL CTA (Red Background)             │
│  "Ready to reach more anglers?"             │
│  [Register] [WhatsApp Chat]                │
└─────────────────────────────────────────────┘
```

---

## Responsive Grid Layouts

### Mobile (< 640px)

```
Single Column

┌──────────────────────┐
│   Captain Card 1     │
└──────────────────────┘
┌──────────────────────┐
│   Captain Card 2     │
└──────────────────────┘
┌──────────────────────┐
│   Captain Card 3     │
└──────────────────────┘
┌──────────────────────┐
│   Captain Card 4     │
└──────────────────────┘
```

### Tablet (640px - 1024px)

```
Two Columns

┌──────────────┐ ┌──────────────┐
│ Captain 1    │ │ Captain 2    │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ Captain 3    │ │ Captain 4    │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ Captain 5    │ │ Captain 6    │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ Captain 7    │ │ Captain 8    │
└──────────────┘ └──────────────┘
```

### Desktop (> 1024px)

```
Four Columns

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Capt 1  │ │Capt 2  │ │Capt 3  │ │Capt 4  │
└────────┘ └────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Capt 5  │ │Capt 6  │ │Capt 7  │ │Capt 8  │
└────────┘ └────────┘ └────────┘ └────────┘
```

---

## Captain Card Anatomy

```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Gradient Background Overlay │    │
│  └─────────────────────────────┘    │
│                                     │
│         ┌──────────────┐            │
│         │              │            │
│         │  [Avatar]    │  🎯 Badge  │
│         │              │            │
│         └──────────────┘            │
│         96px × 96px                 │
│         with border &               │
│         border-radius               │
│                                     │
│      Captain Full Name              │
│      (font-bold, text-lg)           │
│                                     │
│    📍 City / Location               │
│    (text-sm, icon in brand color)   │
│                                     │
│  "Bio preview text here             │
│   truncated to 2 lines"             │
│  (text-xs, line-clamp-2)            │
│                                     │
│    ┌─────────────────┐              │
│    │  🏆 X Trips    │              │
│    └─────────────────┘              │
│    (background highlight)           │
│                                     │
│    View Profile →  (hover only)     │
│    (opacity-0 group-hover:opacity-100)
│                                     │
└─────────────────────────────────────┘
```

---

## Modal Anatomy

```
┌─────────────────────────────────────────────────────┐
│  ╳ (close button)                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│        ╔════════════════════════════════╗           │
│        ║   Gradient Header Background   ║           │
│        ║   (Red to darker red)          ║           │
│        ╚════════════════════════════════╝           │
│                                                     │
│              ┌─────────────────┐                    │
│              │                 │                    │
│              │   [Avatar]      │  ○ Experience     │
│              │   128px         │  Badge (11y)      │
│              │   with border   │                    │
│              └─────────────────┘                    │
│                                                     │
│              Captain Full Name                      │
│            📍 City, State Region                    │
│                                                     │
│              ─────────────────────────              │
│                    About Section                    │
│              ─────────────────────────              │
│                                                     │
│        Bio text here. Full description              │
│        of the captain's experience and              │
│        expertise. Multiple lines of text            │
│        displayed in full.                          │
│                                                     │
│        ┌──────────────────┐ ┌──────────────────┐   │
│        │  🏆 12 Trips     │ │  ⚓ 11 Years     │   │
│        │  Available Trips │ │  Experience      │   │
│        └──────────────────┘ └──────────────────┘   │
│                                                     │
│        ┌─────────────────────────────────────────┐  │
│        │  Start Your Journey              [CTA]  │  │
│        └─────────────────────────────────────────┘  │
│                                                     │
│  Join 40+ captains already earning on Fishon.my    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Interaction States

### Captain Card States

**Default State:**

- Border: `border-neutral-200`
- Background: `bg-white`
- Cursor: default

**Hover State:**

- Border: `border-[#EC2227]/50`
- Shadow: `shadow-lg`
- Opacity: arrow appears
- Transform: subtle scale

**Click State:**

- Modal opens
- Backdrop appears
- Smooth transition

### Modal States

**Closed:**

- Hidden (display: none)
- No backdrop

**Opening:**

- Backdrop fades in
- Modal slides up
- ~200ms animation

**Open:**

- Fully visible
- Interactive
- Can scroll if needed

**Closing:**

- Reverse animation
- 200ms fade out
- Body scroll restored

---

## Color Palette Usage

```
#EC2227 (Brand Red) used in:
  ✓ Experience badge background
  ✓ Trophy/Anchor icons
  ✓ Location pin icon
  ✓ Links and CTAs
  ✓ Gradient header in modal
  ✓ Hover border color
  ✓ Focus states

Neutral Grays (50-900):
  ✓ Text colors (900 = black)
  ✓ Borders (200)
  ✓ Backgrounds (50, 100)
  ✓ Hover states (50, 100)

White:
  ✓ Card backgrounds
  ✓ Modal background
  ✓ Text on red backgrounds
```

---

## Animation Timings

```
Card Hover:
  - Border color: 150ms ease
  - Shadow: 150ms ease
  - Arrow opacity: 150ms ease

Modal Open:
  - Backdrop fade-in: 200ms ease
  - Modal slide-up: 200ms ease-out

Modal Close:
  - All reverse: 150ms ease-in

Icon Transitions:
  - Color changes: 150ms ease
```

---

## Accessibility Features

```
Captain Card:
  ✓ Semantic <button> wrapper
  ✓ Focusable (Tab key)
  ✓ Hover/Focus states visible
  ✓ Click handler on card

Avatar Image:
  ✓ Meaningful alt text
  ✓ Fallback icon if missing
  ✓ Image loading optimization

Modal:
  ✓ Focus trap (stays in modal)
  ✓ ESC key closes
  ✓ Click outside closes
  ✓ Proper heading hierarchy
  ✓ Backdrop with correct contrast
```

---

## Performance Characteristics

```
Rendering:
  - Server-side: CaptainShowcase fetches data
  - Client-side: Cards & Modal for interactivity
  - No jank on scroll
  - Smooth 60fps animations

Image Loading:
  - Next.js Image component
  - Lazy loading on scroll
  - Responsive sizes
  - WebP format where supported

Bundle Impact:
  - CaptainCard: ~2KB
  - Modal: ~3KB
  - Showcase: ~1KB
  - Total: ~6KB gzipped
```

This visual guide shows exactly how the Captain Showcase section appears and functions across all device sizes!
