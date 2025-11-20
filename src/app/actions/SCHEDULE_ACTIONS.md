# Schedule Actions Documentation

Server actions for managing charter operational schedules. Located in `src/app/actions/schedule-actions.ts`.

## Overview

This module provides server actions for fetching and updating charter schedules, including operational days configuration. All actions require authentication and verify that the user (captain) owns the charter before allowing modifications.

## Server Actions

### `getCharterSchedule(charterId: string)`

Fetches the charter schedule for a specific charter.

#### Parameters

- `charterId` (string): The ID of the charter to fetch schedule for

#### Returns

```typescript
{
  success: boolean;
  data?: CharterSchedule;  // Undefined if no schedule exists
  error?: string;
}
```

#### Behavior

- **Verifies Authentication**: Returns `{ success: false, error: "Unauthorized" }` if user not authenticated
- **Verifies Charter Ownership**: Returns `{ success: false, error: "Forbidden: You don't own this charter" }` if user doesn't own the charter
- **Returns Schedule Data**: Returns existing CharterSchedule if found
- **Returns Undefined Data**: If no schedule exists yet, returns `{ success: true, data: undefined }`

#### Example Usage

```typescript
const result = await getCharterSchedule("charter-123");
if (result.success && result.data) {
  console.log(result.data.scheduleType); // "CUSTOM", "EVERYDAY", etc.
  console.log(result.data.operationalDays); // [1, 2, 3, 4, 5]
}
```

### `updateCharterSchedule(charterId: string, scheduleType: string, operationalDays?: number[])`

Updates or creates a charter schedule.

#### Parameters

- `charterId` (string): The ID of the charter
- `scheduleType` (string): One of: `"EVERYDAY"`, `"WEEKDAYS"`, `"WEEKENDS"`, `"CUSTOM"`
- `operationalDays?` (number[]): Array of day numbers 0-6 (Sunday=0 to Saturday=6). Required if `scheduleType` is `"CUSTOM"`

#### Returns

```typescript
{
  success: boolean;
  data?: CharterSchedule;
  error?: string;
}
```

#### Validation Rules

1. **Schedule Type Validation**: `scheduleType` must be one of the valid enum values
   - Error: `"Invalid scheduleType. Must be one of: EVERYDAY, WEEKDAYS, WEEKENDS, CUSTOM"`

2. **Operational Days Array Validation** (if provided):
   - Must be an array
   - Error: `"operationalDays must be an array"`
   - All values must be 0-6
   - Error: `"operationalDays must be array of numbers 0-6 (Sunday=0 to Saturday=6)"`

3. **CUSTOM Type Validation**:
   - Must have at least one operational day
   - Error: `"CUSTOM scheduleType requires at least one operational day"`

4. **Authentication & Ownership**: Same as `getCharterSchedule()`

#### Behavior

- **Uses Upsert**: Creates new schedule if doesn't exist, updates if exists
- **Clears Operational Days**: For non-CUSTOM types, sets `operationalDays` to empty array `[]`
- **Revalidates Cache**: Calls `revalidatePath("/captain/new-calendar")` after successful update

#### Example Usage

```typescript
// Set to custom schedule (Monday-Friday)
const result = await updateCharterSchedule(
  "charter-123",
  "CUSTOM",
  [1, 2, 3, 4, 5]
);
if (result.success) {
  console.log("Schedule updated:", result.data);
}

// Set to everyday
const result = await updateCharterSchedule("charter-123", "EVERYDAY");

// Set to weekdays only
const result = await updateCharterSchedule("charter-123", "WEEKDAYS");

// Set to weekends only (Saturday & Sunday)
const result = await updateCharterSchedule("charter-123", "WEEKENDS");
```

## Data Model

The `CharterSchedule` model in Prisma has the following structure:

```prisma
model CharterSchedule {
  id              String       @id @default(cuid())
  charterId       String       @unique
  scheduleType    ScheduleType @default(EVERYDAY)
  operationalDays Int[]        @default([])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  charter         Charter      @relation(fields: [charterId], references: [id], onDelete: Cascade)

  @@index([charterId])
  @@map("charter_schedules")
}

enum ScheduleType {
  EVERYDAY
  WEEKDAYS
  WEEKENDS
  CUSTOM
}
```

## Error Handling

All server actions follow a consistent error response pattern:

```typescript
// Success response
{ success: true, data: ChartSchedule }

// Error response (never throws)
{ success: false, error: "Human-readable error message" }
```

Errors are logged using the structured logger at `@/lib/logger`:

- Info level: Successful operations
- Warn level: Validation failures, authorization issues
- Error level: Unexpected exceptions

## Security & Validation

1. **Authentication Required**: All actions check `getServerSession()` first
2. **Charter Ownership Verified**: Captain profile is fetched and matched against charter's captainId
3. **Input Validation**: All parameters validated before database operations
4. **Upsert for Safe Updates**: Uses Prisma upsert to handle both create and update atomically

## Testing Verification Checklist

- ✅ getCharterSchedule returns error if not authenticated
- ✅ getCharterSchedule returns error if captain doesn't own charter
- ✅ getCharterSchedule returns schedule data if exists
- ✅ getCharterSchedule returns undefined data if no schedule exists
- ✅ updateCharterSchedule returns error if not authenticated
- ✅ updateCharterSchedule returns error if captain doesn't own charter
- ✅ updateCharterSchedule validates scheduleType enum values
- ✅ updateCharterSchedule validates operationalDays array (0-6 only)
- ✅ updateCharterSchedule requires operationalDays for CUSTOM type
- ✅ updateCharterSchedule creates new schedule if doesn't exist
- ✅ updateCharterSchedule updates existing schedule
- ✅ updateCharterSchedule clears operationalDays for non-CUSTOM types
- ✅ updateCharterSchedule calls revalidatePath after successful update

## Integration Points

### Used By

- Calendar views (Month/Week/Day) to fetch and display schedules
- Schedule editor modal to fetch current schedule for editing
- Sidebar display to show operational days

### Related Features

- `CharterUnavailability`: Separate model for specific date blackouts
- Calendar components in `src/components/captain/calendar/`
- Charter detail views

## Performance Considerations

- Direct database queries (no N+1 issues)
- Indexes on `charterId` for fast lookups
- Single upsert operation for atomic updates
- Cache revalidation only for calendar route
