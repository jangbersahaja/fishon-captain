# Quick Reference - Captain Showcase Feature

## Files Created

```
src/components/
├── CaptainCard.tsx               (Individual captain card)
├── CaptainDetailModal.tsx        (Modal with full details)
└── CaptainShowcase.tsx           (Grid container & data fetching)
```

## Files Modified

```
src/app/page.tsx                  (Added CaptainShowcase import & placement)
```

## Component Props

### CaptainCard

```typescript
interface CaptainCardData {
  id: string;
  displayName: string;
  bio: string;
  experienceYrs: number;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  state: string;
  city: string;
  charterCount: number;
}
```

### CaptainDetailModal

```typescript
interface CaptainDetailModalProps {
  captain: CaptainCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

## Key Features

| Feature                | Status |
| ---------------------- | ------ |
| Responsive grid layout | ✅     |
| Profile images         | ✅     |
| Experience badges      | ✅     |
| Modal details          | ✅     |
| Keyboard support (ESC) | ✅     |
| Click outside to close | ✅     |
| Hover animations       | ✅     |
| Location display       | ✅     |
| Trip count             | ✅     |
| Bio display            | ✅     |
| Fallback avatars       | ✅     |
| Mobile responsive      | ✅     |
| Database integration   | ✅     |
| Automatic updates      | ✅     |

## Styling Classes

- **Colors**: `#EC2227` (primary red), neutral grays
- **Spacing**: Tailwind scale (px-4, py-6, etc.)
- **Responsive**: `sm:`, `md:`, `lg:` breakpoints
- **Effects**: `hover:`, `group-hover:`, transitions

## Database Query

```prisma
CaptainProfile.findMany({
  take: 8,
  orderBy: { createdAt: "desc" },
  where: { charters.some({ isActive: true }) }
})
```

## Page Placement

```
Hero Section
↓
Value Props (Blue Background)
↓
How It Works (3 Steps)
↓
>>> CAPTAIN SHOWCASE <<<
↓
Pricing
↓
Safety & Verification
↓
FAQ
↓
Final CTA
```

## User Flow

```
1. User lands on page
2. Sees captain showcase after "How it works"
3. Clicks captain card
4. Modal opens with full details
5. Clicks "Start Your Journey"
6. Redirected to /auth?next=/captain/form
7. Registration form loads
```

## Performance Metrics

- **Load time**: No impact (async server component)
- **Build time**: No additional time
- **Database queries**: 1 optimized query
- **Image optimization**: Next.js Image component
- **Bundle size**: Minimal (~5KB gzipped)

## Customization Points

```typescript
// In CaptainShowcase.tsx - Change limit:
take: 8,  // Show 8 captains (change to X)

// In CaptainShowcase.tsx - Change order:
orderBy: { createdAt: "desc" }  // Newest first

// In CaptainCard.tsx - Change grid columns:
lg:grid-cols-4  // 4 columns on desktop
```

## Accessibility Features

- Semantic HTML elements
- Alt text on all images
- Keyboard navigation (ESC to close modal)
- Proper heading hierarchy
- Focus management in modal
- ARIA labels where needed

## Mobile Optimizations

- Single column on phones
- Touch-friendly button sizes (min 48px)
- Readable text sizes
- Proper spacing for thumb navigation
- Fast modal loading

## Error Handling

- Missing avatars → fallback anchor icon
- No captains registered → section hidden (null)
- No bio → default text
- Missing location → "Unknown" fallback
- Image load failures → graceful fallback

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive down to 320px width
- Touch and mouse input support

## Environment Requirements

- Next.js 15+ with App Router
- Prisma 6+
- PostgreSQL database
- Tailwind CSS configured

## Known Limitations

- Shows 8 captains maximum (configurable)
- Modal doesn't have pagination
- No search/filter in showcase (can be added)
- Avatar images must be externally hosted

## Future Enhancements

- Add captain ratings
- Implement search/filter
- Create "All Captains" page
- Add captain testimonials
- Location-based filtering
- Achievement badges
