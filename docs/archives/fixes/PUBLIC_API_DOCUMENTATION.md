# fishon-captain: Public API Configuration

## Environment Variables

```env
# Optional: Require API key authentication (recommended for production)
FISHON_CAPTAIN_API_KEY=your-secret-api-key-here
```

If not set, API is publicly accessible.

## API Endpoints

Base URL: `/api/public/charters`

- `GET /api/public/charters` - List all charters (paginated)
- `GET /api/public/charters/:id` - Get single charter by ID
- `GET /api/public/charters/search` - Search with filters

### Query Parameters

**List & Search:**

- `limit` - Results per page (default: 50, max: 100)
- `offset` - Skip results (default: 0)
- `state` - Filter by state
- `charterType` - Filter by charter type
- `minPrice` / `maxPrice` - Filter by trip price range
- `location` - Search in state/district/starting point _(search only)_
- `technique` - Filter by fishing technique _(search only)_

## Files Created

- `prisma/migrations/20251021144800_create_v_public_charters_view/migration.sql` - Database view
- `src/app/api/public/charters/route.ts` - List endpoint
- `src/app/api/public/charters/[id]/route.ts` - Single charter endpoint
- `src/app/api/public/charters/search/route.ts` - Search endpoint
