This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Starting Point Autocomplete & Map

The captain registration form now supports Google Places-powered address suggestions and an interactive map for refining coordinates.

### Environment Variables

Add to `.env.local` (do NOT commit secrets):

```
GOOGLE_PLACES_API_KEY=YOUR_SERVER_KEY   # server-side (Places Autocomplete & Details)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_KEY  # restricted browser key for Maps JS
```

Recommended key restrictions:

- Server key: restrict by IP (if using a fixed server) + API restrictions (Places API, Place Details, _optional_ Geocoding later).
- Browser key: restrict by HTTP referrers + API restrictions (Maps JavaScript API).

### Flow

1. User types in "Starting point address" → debounced call to `/api/places/autocomplete`.
2. User selects a suggestion → we fetch `/api/places/details?placeId=...` to obtain geometry (lat/lng).
3. Latitude & longitude fields auto-fill.
4. Map component becomes active (lazy loads Google Maps JS) and places a draggable marker.
5. Dragging marker updates the lat/lng inputs in real time.
6. Clearing the address hides/disables the map and clears placeId.

### Relevant Files

- `src/app/api/places/autocomplete/route.ts` – server proxy for Place Autocomplete.
- `src/app/api/places/details/route.ts` – server proxy for Place Details (geometry).
- `src/app/captains/register/_components/form/components/AddressAutocomplete.tsx` – input + suggestion list.
- `src/app/captains/register/_components/form/hooks/usePlaceDetails.ts` – fetches geometry.
- `src/app/captains/register/_components/form/components/LocationMap.tsx` – lazy-loaded Google Map with draggable marker.
- `src/app/captains/register/_components/form/steps/BasicsStep.tsx` – integration wiring.

### Added Schema Fields

- `placeId?: string` (optional – stored when a suggestion is chosen).
- `latitude`, `longitude` auto-populated (user can fine-tune via map).

### Autofill Behavior

When a starting point address is selected, the app now attempts to fill:

- State (from administrative_area_level_1)
- City/Town (administrative_area_level_2/3/locality match against known list of districts; stored internally as `city`)
- Postcode (postal_code)

If a component cannot be matched, the original user-selected values remain. Users can still manually adjust any field.

### Extending Further

- Reverse geocode after manual marker drag to update the textual address.
- Persist structured address components (jetty name, locality, etc.).
- Add rate limiting / caching to autocomplete endpoint.
- Add loading indicator in autocomplete list.

### Security Note

If any API keys were accidentally committed, rotate them immediately in Google Cloud Console and update `.env.local`. Ensure `.env.local` is in `.gitignore`.
