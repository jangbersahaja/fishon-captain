# Promo Code Admin Dashboard

## Overview

The Promo Code Admin Dashboard provides staff and admin users with comprehensive tools to manage promotional codes for the Fishon platform. The system connects to the **fishon-market database** to manage promo codes that are used during the booking flow.

## Architecture

### Database Connection

- **Location**: Promo codes are stored in the `fishon-market` database
- **Connection**: Uses `MARKET_DATABASE_URL` environment variable
- **Client**: `marketPrisma` (defined in `src/lib/database/market-prisma.ts`)
- **Access**: Read/write access for STAFF and ADMIN roles only

### Key Components

```
fishon-captain/
├── src/
│   ├── app/
│   │   ├── api/admin/promo-codes/
│   │   │   ├── route.ts                    # List & Create APIs
│   │   │   ├── [id]/route.ts              # Update & Delete APIs
│   │   │   └── [id]/stats/route.ts        # Usage statistics API
│   │   └── (admin)/staff/
│   │       └── promo-codes/
│   │           ├── page.tsx                # List page
│   │           ├── create/page.tsx         # Create page
│   │           ├── [id]/page.tsx          # Detail/Edit page
│   │           └── _components/
│   │               └── PromoCodeForm.tsx   # Reusable form
│   └── lib/
│       └── database/
│           └── market-prisma.ts            # Market DB client
```

## Features

### 1. Promo Code Management

#### List View (`/staff/promo-codes`)

- View all promo codes with filters
- Status badges (Active, Inactive, Expired)
- Type badges (Percentage/Fixed)
- Usage statistics at a glance
- Search by code or name
- Filter by status and scope

#### Create (`/staff/promo-codes/create`)

- Form validation with Zod
- Support for PERCENTAGE and FIXED discount types
- Configurable eligibility rules
- Usage limits (global and per-user)
- Date range selection
- Scope selection (Universal/Registration)

#### Detail/Edit (`/staff/promo-codes/[id]`)

- View detailed statistics
- Edit existing promo codes
- Real-time usage tracking
- Recent bookings list
- Conversion rate analytics

### 2. Discount Types

#### Percentage Discount

- Configure percentage (1-100%)
- Optional maximum discount cap
- Example: "10% off" with max RM100 discount

#### Fixed Amount Discount

- Configure fixed amount in MYR
- Direct deduction from booking total
- Example: "RM50 off"

### 3. Scope Types

#### Universal

- Public codes anyone can use
- Tracked by global usage count
- Per-user usage limits apply
- Example: `FISHONPROMO2025` (5 uses per user)

#### Registration

- Assigned to specific users
- Typically for welcome bonuses
- One-time use per user
- Example: `FISHONTRIP1` (new user welcome)

### 4. Eligibility Rules

- **Minimum Purchase**: Require minimum booking amount
- **New Users Only**: Restrict to users with no completed bookings
- **Valid Period**: Start and end dates
- **Max Uses**: Global usage limit (optional)
- **Max Uses Per User**: Per-user limit (default: 1)
- **Max Discount**: Cap discount amount for percentage types

### 5. Statistics & Analytics

- Total bookings using the code
- Total discount given
- Revenue generated
- Conversion rate (for Registration scope)
- Booking status breakdown
- Recent bookings list

## API Endpoints

### GET `/api/admin/promo-codes`

List all promo codes with filters

**Query Parameters:**

- `status`: ACTIVE | INACTIVE | EXPIRED
- `scope`: UNIVERSAL | REGISTRATION
- `search`: Search by code or name

**Response:**

```json
{
  "promoCodes": [
    {
      "id": "...",
      "code": "SUMMER2025",
      "name": "Summer Sale",
      "type": "PERCENTAGE",
      "percentage": 20,
      "status": "ACTIVE",
      "bookingsCount": 45,
      "assignmentsCount": 0,
      ...
    }
  ]
}
```

### POST `/api/admin/promo-codes`

Create new promo code

**Request Body:**

```json
{
  "code": "SUMMER2025",
  "name": "Summer Sale 2025",
  "description": "Get 20% off all trips",
  "type": "PERCENTAGE",
  "percentage": 20,
  "scope": "UNIVERSAL",
  "startDate": "2025-06-01T00:00",
  "endDate": "2025-08-31T23:59",
  "maxUsesPerUser": 1,
  "status": "ACTIVE"
}
```

### PATCH `/api/admin/promo-codes/[id]`

Update existing promo code

**Request Body:** Same as POST (partial updates supported)

### DELETE `/api/admin/promo-codes/[id]`

Delete or deactivate promo code

- Hard delete if never used
- Soft delete (set INACTIVE) if has bookings

### GET `/api/admin/promo-codes/[id]/stats`

Get detailed usage statistics

**Response:**

```json
{
  "promoCode": { ... },
  "statistics": {
    "totalBookings": 45,
    "totalDiscountGiven": 2250.50,
    "totalRevenue": 8750.00,
    "conversionRate": 75.5,
    ...
  },
  "recentBookings": [...],
  "recentAssignments": [...]
}
```

## Security

- **Authentication**: NextAuth session required
- **Authorization**: STAFF or ADMIN role required
- **Database**: Read/write access to fishon-market DB
- **API Protection**: All endpoints check session and role

## Environment Variables

### Required

```bash
# Fishon Market database connection
MARKET_DATABASE_URL="postgresql://user:password@host/market_db"

# NextAuth for authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Usage Examples

### Creating a Universal Promo Code

```typescript
// Example: 10% off for all users, unlimited uses
{
  code: "FISHON10",
  name: "Platform Launch",
  type: "PERCENTAGE",
  percentage: 10,
  scope: "UNIVERSAL",
  startDate: "2025-11-25T00:00",
  endDate: "2025-12-31T23:59",
  maxUsesPerUser: 5,
  status: "ACTIVE"
}
```

### Creating a Welcome Bonus

```typescript
// Example: RM50 off for new users only
{
  code: "WELCOME50",
  name: "New User Welcome",
  type: "FIXED",
  fixedAmount: 50,
  scope: "REGISTRATION",
  startDate: "2025-11-25T00:00",
  endDate: "2026-12-31T23:59",
  maxUsesPerUser: 1,
  newUsersOnly: true,
  minPurchase: 200,
  status: "ACTIVE"
}
```

### Creating a Limited Campaign

```typescript
// Example: 20% off, max RM100 discount, first 100 uses
{
  code: "BLACKFRIDAY",
  name: "Black Friday Sale",
  type: "PERCENTAGE",
  percentage: 20,
  maxDiscount: 100,
  scope: "UNIVERSAL",
  startDate: "2025-11-29T00:00",
  endDate: "2025-11-29T23:59",
  maxUses: 100,
  maxUsesPerUser: 1,
  status: "ACTIVE"
}
```

## Integration with Booking Flow

Promo codes are validated and applied during the booking checkout process in `fishon-market`:

1. User enters promo code in checkout form
2. Client calls `/api/promo-codes/validate` (fishon-market)
3. Server validates eligibility rules
4. Discount calculated and applied to pricing
5. Booking created with `promoCodeId` reference
6. Usage count incremented
7. Assignment marked as used (for Registration scope)

## Testing

### Manual Testing Checklist

- [ ] Create PERCENTAGE promo code
- [ ] Create FIXED promo code
- [ ] Create UNIVERSAL promo code
- [ ] Create REGISTRATION promo code
- [ ] Edit existing promo code
- [ ] Set promo code to INACTIVE
- [ ] Delete unused promo code
- [ ] Verify statistics display
- [ ] Test filters and search
- [ ] Verify expired status detection

### Database Verification

```sql
-- Check promo code exists
SELECT * FROM "PromoCode" WHERE code = 'TESTCODE';

-- Check usage count
SELECT "usesCount", "maxUses" FROM "PromoCode" WHERE code = 'TESTCODE';

-- Check assignments
SELECT * FROM "UserPromoCodeAssignment" WHERE "promoCodeId" = '...';

-- Check bookings using promo
SELECT * FROM "Booking" WHERE "promoCodeId" = '...';
```

## Future Enhancements

- [ ] Bulk import/export promo codes
- [ ] Auto-assign to new users
- [ ] Charter-specific promo codes
- [ ] A/B testing capabilities
- [ ] Email campaign integration
- [ ] Advanced analytics dashboard
- [ ] Promo code scheduling
- [ ] Dynamic discount rules
- [ ] Referral tracking
- [ ] Multi-tier discounts

## Troubleshooting

### Issue: Cannot connect to market database

**Solution**: Verify `MARKET_DATABASE_URL` is set correctly in `.env.local`

### Issue: Promo code not appearing in fishon-market

**Solution**: Check `status` is ACTIVE and dates are valid

### Issue: Statistics not updating

**Solution**: Verify bookings have `promoCodeId` field populated

### Issue: Unauthorized access

**Solution**: Ensure user has STAFF or ADMIN role in fishon-captain

## Related Documentation

- [Booking System Configuration](../../../fishon-market/docs/config/BOOKING_SYSTEM.md)
- [Pricing Service](../../../fishon-market/src/lib/services/pricing-service.ts)
- [Promo Service](../../../fishon-market/src/lib/services/promo-service.ts)
