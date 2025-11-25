# Pricing System Configuration

## Overview

The pricing system for Fishon manages charter trip pricing with support for base prices, promotional prices, and future dynamic pricing capabilities. Admin dashboard provides centralized control and monitoring.

---

## Current System Analysis

### Database Schema (Current)

#### Charter Level

```prisma
model Charter {
  pricingPlan  CharterPricingPlan @default(BASIC)  // BASIC(10%), SILVER(8%), GOLD(5%)
  // ... other fields
}

enum CharterPricingPlan {
  BASIC   // 10% commission
  SILVER  // 8% commission
  GOLD    // 5% commission
}
```

#### Trip Level

```prisma
model Trip {
  price       Decimal  @db.Decimal(10, 2)  // Base price set by captain
  promoPrice  Decimal? @db.Decimal(10, 2)  // Optional promotional price
  // ... other fields
}
```

### Current Pricing Flow

1. **Captain Sets Prices**: Base price and optional promo price per trip
2. **Commission Applied**: Based on charter's pricing plan (BASIC/SILVER/GOLD)
3. **Customer Sees**: Either base price or promo price (if active)
4. **Platform Fee**: Fixed percentage based on pricing plan

---

## Research: Dynamic Pricing Systems

### Industry Best Practices

#### 1. **Airbnb's Smart Pricing**

- **Demand-based**: Adjusts based on booking patterns
- **Seasonality**: Peak/off-peak periods
- **Local Events**: Concerts, festivals, holidays
- **Competitor Analysis**: Market rate comparison
- **Minimum/Maximum Bounds**: Captain sets price floor/ceiling

#### 2. **Uber's Surge Pricing**

- **Real-time Supply/Demand**: Driver availability vs rider requests
- **Time-based**: Rush hours, weekends
- **Weather**: Rain, extreme temperatures
- **Location**: High-demand areas
- **Transparency**: Clear multiplier display

#### 3. **Hotel Revenue Management**

- **Advance Booking**: Early bird discounts
- **Last-minute Deals**: Fill empty slots
- **Length of Stay**: Multi-day discounts
- **Occupancy Rate**: Dynamic adjustment
- **Historical Data**: Past booking trends

### Factors for Fishing Charter Dynamic Pricing

#### High Demand Indicators (Price ↑)

- **Time-based**:
  - Weekends vs weekdays
  - Peak fishing seasons (by species)
  - Public holidays
  - School holidays
- **Weather**:
  - Perfect fishing conditions forecast
  - Calm seas, clear skies
- **Availability**:
  - Few remaining slots
  - Last boat available for date
- **Booking Lead Time**:
  - Last-minute bookings (premium)
- **Species Availability**:
  - Peak season for target species
  - Migration patterns

#### Low Demand Indicators (Price ↓)

- **Time-based**:
  - Weekdays
  - Off-season months
  - Early morning slots
- **Weather**:
  - Marginal conditions predicted
- **Availability**:
  - Many empty slots
  - Approaching date with no bookings
- **First-time Customers**:
  - Introductory discounts
  - Early bird bookings (3+ weeks advance)

---

## Proposed System Architecture

### Phase 1: Manual Price Control (MVP)

#### Admin Dashboard Features

1. **Pricing Overview**
   - View all charters and their pricing plans
   - See base vs promo prices for all trips
   - Quick statistics (avg price, price ranges)

2. **Price Configuration**
   - Enable/disable promo pricing per trip
   - Set date ranges for promotional periods
   - Bulk price updates
   - Price approval workflow

3. **Monitoring**
   - Price effectiveness metrics
   - Conversion rates by price point
   - Revenue impact analysis
   - A/B testing results

4. **Captain Controls**
   - Set min/max price bounds per trip
   - Opt-in/out of dynamic pricing
   - Review price change history

### Phase 2: Rule-Based Dynamic Pricing

#### Pricing Rules Engine

```typescript
interface PricingRule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;

  // Conditions
  conditions: {
    daysUntilTrip?: { min?: number; max?: number };
    dayOfWeek?: number[];
    season?: string[];
    weatherScore?: { min: number };
    occupancyRate?: { min?: number; max?: number };
    targetSpecies?: string[];
    isHoliday?: boolean;
    bookingCount?: { min?: number; max?: number };
  };

  // Actions
  actions: {
    type: "PERCENTAGE" | "FIXED" | "MULTIPLIER";
    value: number;
    maxIncrease?: number; // Cap at +30%
    maxDecrease?: number; // Cap at -20%
  };

  // Metadata
  description?: string;
  validFrom: Date;
  validUntil?: Date;
}
```

#### Example Rules

```typescript
// Weekend Premium
{
  name: "Weekend Premium",
  conditions: { dayOfWeek: [5, 6, 0] },  // Fri-Sun
  actions: { type: 'PERCENTAGE', value: 15, maxIncrease: 20 }
}

// Last-Minute Discount
{
  name: "Last Minute Fill",
  conditions: {
    daysUntilTrip: { max: 2 },
    occupancyRate: { max: 50 }
  },
  actions: { type: 'PERCENTAGE', value: -15, maxDecrease: 20 }
}

// Peak Season (Marlin)
{
  name: "Marlin Season Premium",
  conditions: {
    season: ['PEAK'],
    targetSpecies: ['Blue Marlin', 'Black Marlin']
  },
  actions: { type: 'MULTIPLIER', value: 1.25, maxIncrease: 30 }
}

// Early Bird
{
  name: "Early Bird Special",
  conditions: { daysUntilTrip: { min: 21 } },
  actions: { type: 'PERCENTAGE', value: -10, maxDecrease: 15 }
}
```

### Phase 3: ML-Based Dynamic Pricing

#### Machine Learning Model

- **Training Data**: Historical booking data, weather, seasonality
- **Features**:
  - Time features (day, month, hour)
  - Charter features (boat size, location, rating)
  - External data (weather forecast, competitor prices)
  - Demand signals (search volume, booking velocity)
- **Model Output**: Optimal price recommendation
- **Validation**: A/B testing, human oversight

---

## Database Schema Additions

### Pricing Configuration

```prisma
model PricingConfig {
  id                    String   @id @default(cuid())

  // Global settings
  dynamicPricingEnabled Boolean  @default(false)
  minPriceMultiplier    Decimal  @default(0.7)   // Don't go below 70% of base
  maxPriceMultiplier    Decimal  @default(1.5)   // Don't exceed 150% of base

  // Captain opt-in/out
  allowCaptainOverride  Boolean  @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model PricingRule {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  priority    Int      @default(0)

  // Conditions (JSON)
  conditions  Json

  // Actions (JSON)
  actions     Json

  // Validity
  validFrom   DateTime
  validUntil  DateTime?

  // Metadata
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, priority])
  @@index([validFrom, validUntil])
}

model DynamicPrice {
  id              String   @id @default(cuid())
  tripId          String
  basePrice       Decimal  @db.Decimal(10, 2)
  calculatedPrice Decimal  @db.Decimal(10, 2)
  appliedRules    String[] // Rule IDs

  // Context snapshot
  conditions      Json     // What conditions were present

  // Valid period
  validFrom       DateTime
  validUntil      DateTime

  // Override
  isOverridden    Boolean  @default(false)
  overridePrice   Decimal? @db.Decimal(10, 2)
  overrideReason  String?
  overrideBy      String?

  createdAt       DateTime @default(now())

  @@index([tripId, validFrom, validUntil])
  @@index([createdAt])
}

model PriceHistory {
  id          String   @id @default(cuid())
  tripId      String
  priceType   String   // 'BASE' | 'PROMO' | 'DYNAMIC'
  oldPrice    Decimal? @db.Decimal(10, 2)
  newPrice    Decimal  @db.Decimal(10, 2)
  reason      String?
  changedBy   String
  changedAt   DateTime @default(now())

  @@index([tripId, changedAt])
}
```

---

## Implementation Roadmap

### Phase 1: Admin Pricing Dashboard (Week 1-2)

**Goal**: Centralized price management and monitoring

**Tasks**:

1. Create `/staff/pricing` route structure
2. Build pricing overview page
   - List all charters with pricing plans
   - Show base/promo prices for trips
   - Display pricing statistics
3. Build price configuration UI
   - Edit base prices
   - Enable/disable promo prices
   - Set promotional periods
4. Implement monitoring dashboard
   - Price distribution charts
   - Conversion rate by price point
   - Revenue impact analysis
5. Add audit logging for price changes

**Deliverables**:

- Admin can view all pricing in one place
- Admin can manually adjust prices
- Admin can track price change history
- Dashboard shows pricing effectiveness

### Phase 2: Rule-Based System (Week 3-4)

**Goal**: Automated price adjustments based on rules

**Tasks**:

1. Database migrations for new tables
2. Build pricing rules engine
   - Rule evaluation system
   - Condition matching
   - Price calculation
3. Admin UI for rule management
   - Create/edit/delete rules
   - Set rule priorities
   - Enable/disable rules
4. Price calculation service
   - Evaluate all applicable rules
   - Apply price adjustments
   - Respect min/max bounds
5. Captain notification system
   - Alert on price changes
   - Opt-in/out controls
6. A/B testing framework
   - Compare dynamic vs static prices
   - Measure conversion impact

**Deliverables**:

- Rules engine working
- Admin can create rules
- Prices adjust automatically
- Captains can opt-in/out

### Phase 3: ML Enhancement (Week 5-6)

**Goal**: Intelligent price recommendations

**Tasks**:

1. Data pipeline setup
   - Historical booking data export
   - Feature engineering
2. Model development
   - Training on historical data
   - Validation and testing
3. Integration with pricing service
   - Model serving infrastructure
   - Fallback to rule-based system
4. Admin ML dashboard
   - Model performance metrics
   - Price recommendation review
   - Override capabilities
5. Continuous learning pipeline
   - Retrain on new data
   - A/B test improvements

**Deliverables**:

- ML model providing recommendations
- Admin can review/approve ML prices
- System learns from outcomes
- Measurable revenue improvement

---

## Key Metrics to Track

### Pricing Effectiveness

- **Conversion Rate**: Bookings / Views by price point
- **Revenue Per Available Boat Hour (RevPABH)**: Similar to RevPAR in hotels
- **Average Booking Value (ABV)**: Mean transaction value
- **Price Elasticity**: Demand sensitivity to price changes
- **Occupancy Rate**: Booked slots / Available slots

### Dynamic Pricing Performance

- **Rule Hit Rate**: How often rules trigger
- **Override Rate**: Manual overrides / Auto-prices
- **Price Variance**: Standard deviation of prices
- **Revenue Lift**: Dynamic vs static pricing revenue
- **Customer Satisfaction**: Ratings correlation with prices

### Operational Metrics

- **Configuration Time**: Time to set rules/prices
- **System Latency**: Price calculation speed
- **Error Rate**: Failed calculations
- **Captain Satisfaction**: Opt-in rate, feedback

---

## Risk Mitigation

### Price Gouging Prevention

- **Hard Caps**: Never exceed 1.5x base price
- **Transparency**: Show why price changed
- **Customer Protection**: Price lock at booking time
- **Refund Policy**: Price increases within 24h

### Captain Relations

- **Opt-in Required**: Captains control participation
- **Minimum Guarantee**: Always meet min price
- **Preview Period**: 7-day trial before live
- **Override Rights**: Captain can always override

### Technical Risks

- **Fallback System**: Revert to base price on error
- **Gradual Rollout**: Test with 10% of charters first
- **Monitoring**: Alert on abnormal price changes
- **Audit Trail**: Log all price decisions

---

## Future Enhancements

### Integration Opportunities

- **Weather APIs**: Real-time weather impact
- **Event Calendars**: Festivals, holidays
- **Competitor Monitoring**: Market rate tracking
- **Search Volume**: Google Trends integration
- **Social Media**: Buzz/sentiment analysis

### Advanced Features

- **Group Discounts**: Automatic for large parties
- **Loyalty Pricing**: Returning customer discounts
- **Bundle Pricing**: Multi-trip packages
- **Membership Tiers**: Subscriber-only rates
- **Referral Incentives**: Friend discounts

### Reporting & Analytics

- **Price Optimization Report**: Weekly insights
- **Seasonal Trends**: Year-over-year comparison
- **Competitor Benchmarking**: Position in market
- **Customer Segments**: Price sensitivity analysis
- **Forecast Models**: Demand prediction

---

## Technical Considerations

### Performance

- **Caching**: Cache calculated prices (15-30 min TTL)
- **Precomputation**: Calculate prices overnight for next 30 days
- **Rate Limiting**: Limit price recalculation frequency
- **Database Indexing**: Optimize price lookups

### Scalability

- **Async Processing**: Calculate prices in background
- **Queue System**: Handle price update requests
- **Read Replicas**: Separate read/write for prices
- **CDN Caching**: Cache price data at edge

### Security

- **Admin-Only**: Price rule configuration
- **Audit Logging**: All price changes tracked
- **Role-Based Access**: STAFF vs ADMIN permissions
- **Input Validation**: Prevent malicious rules

---

## Success Criteria

### Phase 1 (Manual Control)

- ✅ All pricing visible in one dashboard
- ✅ Admin can update prices in <2 minutes
- ✅ 100% of price changes logged
- ✅ Price history available for all trips

### Phase 2 (Rule-Based)

- ✅ 5+ pricing rules created and active
- ✅ 80% of prices adjusted automatically
- ✅ <10% captain override rate
- ✅ 15%+ revenue increase vs manual pricing

### Phase 3 (ML-Based)

- ✅ Model accuracy >85% in price recommendations
- ✅ 25%+ revenue lift vs rule-based pricing
- ✅ <5% customer complaints about pricing
- ✅ 90%+ captain satisfaction with system

---

## References & Resources

### Academic Research

- "Dynamic Pricing in the Airline Industry" - MIT
- "Demand Forecasting with Machine Learning" - Stanford
- "Revenue Management for Tourism" - Cornell

### Industry Tools

- **PriceLabs**: Airbnb pricing tool
- **Beyond Pricing**: Vacation rental pricing
- **Wheelhouse**: Dynamic pricing platform
- **Duetto**: Hotel revenue management

### APIs & Data Sources

- **OpenWeatherMap**: Weather forecasts
- **Google Calendar**: Holiday detection
- **Clearbit**: Competitor price monitoring
- **Google Trends**: Search volume data

---

## Conclusion

The pricing system should be rolled out in phases:

1. **Immediate**: Admin dashboard for manual control
2. **Short-term** (1-2 months): Rule-based automation
3. **Long-term** (3-6 months): ML-powered optimization

Start simple, measure results, iterate based on data. Focus on transparency, captain control, and customer fairness throughout.
