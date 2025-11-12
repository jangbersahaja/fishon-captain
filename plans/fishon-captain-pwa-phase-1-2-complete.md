# Phase 1-2 Complete: PWA Foundation & Metadata Updates

**Completed:** November 13, 2025

## Summary

Successfully implemented PWA foundation for Fishon Captain using Next.js 15 native support and resolved all themeColor deprecation warnings by migrating to viewport export. Updated metadata to reflect current production state.

---

## Changes Implemented

### 1. PWA Dependencies & Icons ✅

**Files Created:**

- `scripts/generate-pwa-icons.js` - Icon generation script using sharp
- `public/images/logos/captain-vector-512x512.svg` - Source Captain logo (official vector)
- `public/icons/` - 10 PWA icons (72px-512px + maskable)
- `public/apple-touch-icon.png` - iOS home screen icon

**Dependencies Added:**

- `sharp` - Icon generation from SVG
- `@types/serviceworker` - TypeScript support

**Source Asset:**

- Using official Captain vector logo (`captain-vector-512x512.svg`)
- Background: `#ec2227` (Fishon red)
- All icons generated from 512x512 SVG for crisp quality

**Test Coverage:**

- 21 icon validation tests (existence, dimensions, file sizes)

### 2. Native Manifest Implementation ✅

**Files Created:**

- `src/app/manifest.ts` - Next.js `MetadataRoute.Manifest` (native support)
- Replaced: `public/manifest.json` (static file - removed)

**Configuration:**

```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fishon Captain Dashboard",
    short_name: "Fishon Captain",
    start_url: "/captain",
    display: "standalone",
    theme_color: "#ec2227",
    // 9 icons including maskable variant
  };
}
```

**Benefits:**

- Type-safe manifest generation
- Auto-linked by Next.js (no manual link needed)
- Hot-reload during development

**Test Coverage:**

- 17 manifest validation tests

### 3. Service Worker ✅

**File Created:**

- `public/sw.js` - Minimal service worker for push notifications

**Features:**

- Push notification handler
- Notification click handler
- Basic install/activate lifecycle
- Ready for future push API integration

### 4. Metadata & Viewport Updates ✅

**Critical Fix: themeColor Migration**

**Before (Deprecated):**

```typescript
export const metadata: Metadata = {
  themeColor: "#ec2227", // ❌ Deprecated in Next.js 15
  // ...
};
```

**After (Next.js 15 Pattern):**

```typescript
export const viewport: Viewport = {
  themeColor: "#ec2227", // ✅ Correct location
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};
```

**Metadata Modernization:**

Old (Coming Soon placeholder):

```typescript
title: "Fishon — Malaysia's Fishing & Charter Booking (Coming Soon)";
```

New (Production-ready):

```typescript
title: {
  default: "Fishon Captain — Manage Your Fishing Charters",
  template: "%s | Fishon Captain",
}
```

**Complete Updates:**

- ✅ Title with template support
- ✅ Updated description (charter management focus)
- ✅ Production URL (`captain.fishon.my`)
- ✅ SEO keywords array
- ✅ Enhanced OpenGraph metadata
- ✅ Twitter card with creator handle
- ✅ Proper icon configuration
- ✅ Application name and category
- ✅ Format detection settings

**Test Coverage:**

- 20 metadata/viewport validation tests

### 5. Configuration Cleanup ✅

**Files Modified:**

- `next.config.ts` - Reverted to clean config (removed outdated `@ducanh2912/next-pwa`)
- `.gitignore` - Cleaned up PWA entries
- `src/app/layout.tsx` - Viewport export + modernized metadata

---

## Test Results

**Total: 60 PWA Tests Passing**

- ✅ 21 icon validation tests
- ✅ 17 manifest validation tests
- ✅ 20 metadata/viewport tests
- ✅ 2 general PWA tests

All tests pass with zero warnings.

---

## Build Verification

**TypeScript:** ✅ Passes with no errors  
**ESLint:** ✅ No blocking issues  
**Warnings Resolved:** ✅ All themeColor deprecation warnings fixed

**Before:**

```
⚠ Unsupported metadata themeColor is configured in metadata export
  Please move it to viewport export instead.
```

**After:**

```
✓ Compiled successfully
```

---

## PWA Installation Status

**✅ Tested & Verified on Real Devices**

**Desktop (Chrome/Edge):**

- ✅ Install icon appears in address bar
- ✅ "Install Fishon Captain" prompt works
- ✅ App installs to desktop with custom icon
- ✅ Standalone window mode works
- ✅ **USER VERIFIED:** App downloads and installs successfully

**Mobile (iOS Safari):**

- ✅ "Add to Home Screen" available
- ✅ Custom icon displays on home screen
- ✅ Status bar theming works (#ec2227)
- ✅ **USER VERIFIED:** Saves to home screen successfully

**Mobile (Android Chrome):**

- ✅ Install prompt appears
- ✅ Maskable icon adapts to device theme
- ✅ Standalone mode works
- ✅ **USER VERIFIED:** Saves to home screen successfully

**Note:** Mobile install prompt in address bar requires additional implementation (Phase 3).

---

## Architecture

**No External Dependencies for PWA:**

- ❌ Removed `@ducanh2912/next-pwa` (outdated, build failures)
- ✅ Using Next.js 15 native `MetadataRoute.Manifest`
- ✅ Simple custom service worker

**Key Files:**

```
src/app/
├── manifest.ts          # Type-safe manifest (auto-linked)
└── layout.tsx           # Viewport + metadata exports

public/
├── sw.js                # Service worker
├── apple-touch-icon.png # iOS icon
└── icons/               # PWA icon set

scripts/
└── generate-pwa-icons.js # Icon generation tool
```

---

## Future Implementation Phases

Following Next.js 15 PWA Guide patterns for remaining features:

### Phase 3: Install Prompt & beforeinstallprompt Handler

**Goal:** Custom install prompt UI for mobile address bar and in-app install buttons

**Implementation (Following Next.js Guide):**

1. **Install Prompt Detection Hook**

   ```typescript
   // src/hooks/usePWAInstall.ts
   - Capture beforeinstallprompt event
   - Store prompt reference
   - Track installation state (installed/dismissed)
   - Handle prompt() call
   ```

2. **InstallPrompt Component** (`src/components/pwa/InstallPrompt.tsx`)
   - Dialog/modal UI following Next.js guide pattern
   - iOS detection and manual instructions
   - Display mode detection (standalone check)
   - Accept/dismiss handling

3. **InstallButton Component** (`src/components/pwa/InstallButton.tsx`)
   - Reusable install button for navbar/settings
   - Conditional rendering (only when installable)
   - Cross-platform detection

4. **PWA Settings Section** (`src/app/(portal)/captain/settings/pwa`)
   - Install status indicator
   - Storage usage display (navigator.storage API)
   - Clear cache option
   - App info (version, update available)

**Files to Create:**

- `src/hooks/usePWAInstall.ts`
- `src/components/pwa/InstallPrompt.tsx`
- `src/components/pwa/InstallButton.tsx`
- `src/app/(portal)/captain/settings/pwa/page.tsx`

**Testing:**

- [ ] Desktop Chrome: beforeinstallprompt captured
- [ ] Mobile Chrome: Address bar install prompt works
- [ ] iOS Safari: Shows manual instructions
- [ ] Standalone mode: Install button hidden when already installed

---

### Phase 4: Push Notifications (Web Push API)

**Goal:** Re-engagement via push notifications following Next.js guide

**Implementation (Following Next.js Guide - `/docs/app/guides/progressive-web-apps#implementing-web-push-notifications`):**

1. **Generate VAPID Keys**

   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   # Add to .env:
   # NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   # VAPID_PRIVATE_KEY=...
   ```

2. **Client-Side Push Manager** (`src/app/(portal)/captain/settings/notifications/page.tsx`)

   ```typescript
   - urlBase64ToUint8Array helper
   - PushNotificationManager component
   - Subscribe/unsubscribe flow
   - Test notification sender
   - Permission request UI
   ```

3. **Server Actions** (`src/app/actions/push-notifications.ts`)

   ```typescript
   "use server";

   export async function subscribeUser(sub: PushSubscription);
   export async function unsubscribeUser();
   export async function sendNotification(message: string);

   // Store subscriptions in database (PushSubscription model)
   ```

4. **Service Worker Updates** (`public/sw.js`)
   - Already has push event handler
   - Update notification click URL
   - Add notification actions (view/dismiss)
   - Badge support

5. **Database Schema**
   ```prisma
   model PushSubscription {
     id        String   @id @default(cuid())
     userId    String
     user      User     @relation(...)
     endpoint  String   @unique
     keys      Json     // { p256dh, auth }
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

**Use Cases:**

- New booking notifications
- Charter approval status
- Payment reminders
- System announcements

**Testing:**

- [ ] Permission request flow
- [ ] Subscribe/unsubscribe works
- [ ] Test notification sends
- [ ] Notification click opens app
- [ ] Works offline (queued)

---

### Phase 5: Offline Support & Background Sync

**Goal:** Offline functionality with background sync for critical operations

**Implementation (Following Next.js Guide - `/docs/app/guides/progressive-web-apps#offline-support`):**

1. **Enhanced Service Worker** (`public/sw.js`)

   ```javascript
   // Cache strategies (Workbox patterns)
   - Cache-first: Static assets, images, fonts
   - Network-first: API routes, dynamic data
   - Stale-while-revalidate: Dashboard data

   // Offline fallback
   - Cache offline.html
   - Serve when network fails

   // Background Sync API
   self.addEventListener('sync', (event) => {
     if (event.tag === 'draft-sync') {
       event.waitUntil(syncDrafts())
     }
     if (event.tag === 'media-sync') {
       event.waitUntil(syncMediaUploads())
     }
   })
   ```

2. **Offline Queue Enhancement** (`src/lib/offlineQueue.ts`)
   - Already exists with sessionStorage
   - Add Background Sync API registration
   - Retry with exponential backoff
   - Status updates via postMessage

3. **Draft Save Integration** (`src/features/charter-onboarding/`)
   - Integrate existing autosave with Background Sync
   - Queue failed saves for retry
   - Show sync status in UI

4. **Media Upload Integration** (`src/lib/uploads/videoQueue.ts`)
   - Already uses IndexedDB
   - Add Background Sync registration
   - Resume uploads when online
   - Progress persistence

5. **Offline Indicator** (`src/components/OfflineBanner.tsx`)
   - Already exists
   - Add sync status
   - Show queued operations count

**Cache Configuration:**

```javascript
// In service worker
const CACHE_VERSION = "v1";
const CACHE_NAMES = {
  static: `fishon-captain-static-${CACHE_VERSION}`,
  dynamic: `fishon-captain-dynamic-${CACHE_VERSION}`,
  images: `fishon-captain-images-${CACHE_VERSION}`,
};

const CACHE_EXPIRY = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  dynamic: 7 * 24 * 60 * 60 * 1000, // 7 days
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
};
```

**Testing:**

- [ ] Offline mode: Shows cached pages
- [ ] Draft saves queue when offline
- [ ] Media uploads resume after reconnect
- [ ] Background sync triggers on reconnect
- [ ] Cache expiry works

---

### Phase 6: Security Headers & CSP

**Goal:** Secure PWA following Next.js guide recommendations

**Implementation (Following Next.js Guide - `/docs/app/guides/progressive-web-apps#securing-your-application`):**

1. **Security Headers** (`next.config.ts`)

   ```typescript
   async headers() {
     return [
       {
         source: '/(.*)',
         headers: [
           {
             key: 'X-Content-Type-Options',
             value: 'nosniff',
           },
           {
             key: 'X-Frame-Options',
             value: 'DENY',
           },
           {
             key: 'Referrer-Policy',
             value: 'strict-origin-when-cross-origin',
           },
         ],
       },
       {
         source: '/sw.js',
         headers: [
           {
             key: 'Content-Type',
             value: 'application/javascript; charset=utf-8',
           },
           {
             key: 'Cache-Control',
             value: 'no-cache, no-store, must-revalidate',
           },
           {
             key: 'Content-Security-Policy',
             value: "default-src 'self'; script-src 'self'",
           },
         ],
       },
     ]
   }
   ```

2. **Content Security Policy** (`src/middleware.ts` or `next.config.ts`)
   - Currently has CSP in `src/lib/headers.ts`
   - Extend for service worker
   - Add 'worker-src' directive
   - Nonce support for inline scripts

3. **HTTPS Enforcement**
   - Already enforced by Vercel
   - Local dev: `next dev --experimental-https`

**Current Security (Already Implemented):**

- ✅ `src/lib/headers.ts` - CSP with Google Maps allowlist
- ✅ Rate limiting on sensitive routes
- ✅ Auth middleware protection
- ✅ HTTPS via Vercel

**Enhancements Needed:**

- [ ] Service worker CSP
- [ ] Nonce-based CSP (remove 'unsafe-inline')
- [ ] Subresource Integrity (SRI) for CDN assets
- [ ] CORS policy review

---

### Phase 7: Advanced PWA Features

**Goal:** Enhance user experience with modern web capabilities

**Features (From Next.js PWA Guide):**

1. **App Shortcuts** (Manifest)

   ```typescript
   // src/app/manifest.ts
   shortcuts: [
     {
       name: "Create Charter",
       short_name: "New Charter",
       url: "/captain/charters/new",
       icons: [{ src: "/icons/shortcut-new.png", sizes: "96x96" }],
     },
     {
       name: "View Bookings",
       short_name: "Bookings",
       url: "/captain/bookings",
       icons: [{ src: "/icons/shortcut-bookings.png", sizes: "96x96" }],
     },
   ];
   ```

2. **Share Target API** (Manifest)

   ```typescript
   share_target: {
     action: "/captain/charters/new",
     method: "POST",
     enctype: "multipart/form-data",
     params: {
       title: "title",
       text: "text",
       url: "url",
       files: [
         {
           name: "media",
           accept: ["image/*", "video/*"],
         },
       ],
     },
   }
   ```

3. **Periodic Background Sync**

   ```javascript
   // Request permission and register
   const status = await navigator.permissions.query({
     name: "periodic-background-sync",
   });

   if (status.state === "granted") {
     await registration.periodicSync.register("dashboard-sync", {
       minInterval: 24 * 60 * 60 * 1000, // 24 hours
     });
   }
   ```

4. **Badge API** (Unread notifications)

   ```javascript
   // Set badge count
   navigator.setAppBadge(5); // 5 unread notifications

   // Clear badge
   navigator.clearAppBadge();
   ```

5. **File System Access API**
   - Save export files locally
   - Access photos for charter uploads

**Testing:**

- [ ] App shortcuts appear on long-press
- [ ] Share target receives shared content
- [ ] Periodic sync updates dashboard
- [ ] Badge shows unread count
- [ ] File system access works

---

## Documentation Updates Needed

- [ ] Update Copilot instructions with PWA patterns
- [ ] Document manifest.ts usage
- [ ] Add viewport configuration guidelines
- [ ] Service worker customization guide

---

## Known Issues

**None** - All themeColor warnings resolved, PWA installs successfully on all platforms.

---

## References

- [Next.js 15 PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MetadataRoute.Manifest API](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [generateViewport API](https://nextjs.org/docs/app/api-reference/functions/generate-viewport)
- [Web App Manifest Spec](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Status:** Phase 1-2 Complete ✅  
**Next:** User decision on Phase 3+ implementation timeline
