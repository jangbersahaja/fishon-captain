# Analytics Configuration Quick Start

## Current Issue

You're seeing "Failed to fetch analytics: Error: Unknown error" because:

1. **Direct DB access is disabled** (`USE_ANALYTICS_DB` not set)
2. **API endpoint doesn't exist or is failing** (fishon-market API returns error)

## Solution: Enable Direct DB Access

### Step 1: Add Environment Variables

Add to your `/Users/jangbersahaja/Website/fishon-captain/.env`:

```bash
# Enable direct database access for analytics (RECOMMENDED)
USE_ANALYTICS_DB=1

# Market database connection (same as your MARKET_DATABASE_URL for bookings)
MARKET_DATABASE_URL="postgresql://neondb_owner:your_password@your_host/neondb?sslmode=require"

# API fallback configuration (optional, for when DB fails)
NEXT_PUBLIC_FISHON_MARKET_URL="http://localhost:3001"
FISHON_MARKET_API_KEY="your-api-key-here"
```

### Step 2: Verify Database Connection

The analytics system will use the same `MARKET_DATABASE_URL` you're already using for bookings.

**Check if it's working:**

```bash
cd /Users/jangbersahaja/Website/fishon-captain
npx prisma db execute --schema=prisma/schema-market.prisma --stdin <<< "SELECT COUNT(*) FROM analytics_events;"
```

### Step 3: Restart Dev Server

```bash
# Kill the current server (Ctrl+C)
npm run dev
```

### Step 4: Visit Analytics Page

Navigate to: `http://localhost:3000/captain/analytics`

**You should now see:**

- Empty state: "No Analytics Data Yet" (if no events tracked)
- Analytics dashboard (if events exist in fishon-market database)
- Detailed logs in terminal showing the data source being used

## What Happens Now

With `USE_ANALYTICS_DB=1`, the system will:

1. ✅ Try direct DB access first (fast, efficient)
2. ✅ Fall back to API if DB fails (reliable)
3. ✅ Return empty analytics if both fail (graceful degradation)
4. ✅ Log detailed debug information

## Checking Logs

Watch your terminal for these log messages:

```
[Analytics] Fetching analytics for captain clxxxx, period: 30d
[Analytics] USE_DIRECT_DB: true, FALLBACK_TO_API: true
[Analytics] MARKET_DATABASE_URL configured: true
[Analytics] Using direct DB access...
```

**Success indicators:**

- No error messages in logs
- Page loads without "Failed to fetch analytics" error
- Shows either empty state or actual analytics data

**If you see errors:**

- Check `MARKET_DATABASE_URL` is correct
- Verify database user has SELECT permissions on `analytics_events` table
- Ensure Prisma client is generated: `npx prisma generate --schema=prisma/schema-market.prisma`

## Alternative: Disable Analytics for Now

If you want to skip analytics setup temporarily:

### Option 1: Show Empty State by Default

The service now returns empty analytics data if all sources fail. The page will show "No Analytics Data Yet" instead of crashing.

### Option 2: Comment Out Analytics Link

In your navigation, temporarily hide the analytics link until you're ready to set it up.

## Verification Steps

1. **Check environment variable is set:**

   ```bash
   grep USE_ANALYTICS_DB .env
   # Should output: USE_ANALYTICS_DB=1
   ```

2. **Check database connection:**

   ```bash
   grep MARKET_DATABASE_URL .env
   # Should output your PostgreSQL connection string
   ```

3. **Test Prisma connection:**

   ```bash
   npx prisma db execute --schema=prisma/schema-market.prisma --stdin <<< "SELECT 1;"
   ```

4. **Check analytics table exists:**
   ```bash
   npx prisma db execute --schema=prisma/schema-market.prisma --stdin <<< "SELECT COUNT(*) FROM analytics_events;"
   ```

## Next Steps After Setup

Once analytics is working:

1. **Generate test data**: Visit some charter pages in fishon-market to create analytics events
2. **Verify tracking**: Check fishon-market logs for tracking events
3. **View analytics**: Refresh the analytics page in fishon-captain
4. **Test period selector**: Try different time periods (7d, 30d, 90d, 1y)

## Need Help?

**Common Issues:**

1. **"analytics_events table not found"**
   - Run migrations in fishon-market: `cd /Users/jangbersahaja/Website/fishon-market && npm run prisma:migrate`

2. **"Permission denied for table analytics_events"**
   - Grant SELECT permission to your database user

3. **"Prisma Client not found"**
   - Regenerate: `npx prisma generate --schema=prisma/schema-market.prisma`

4. **Still seeing API errors**
   - API endpoint might not be implemented yet in fishon-market
   - Direct DB is the recommended approach anyway

## Summary

**Quick Fix (Recommended):**

```bash
# Add to .env
echo "USE_ANALYTICS_DB=1" >> .env

# Restart server
npm run dev
```

Your analytics page should now work! 🎉
