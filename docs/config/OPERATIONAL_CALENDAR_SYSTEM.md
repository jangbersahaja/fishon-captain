# Operational Calendar System - Complete Guide

**Last Updated**: November 21, 2025  
**Status**: ✅ Production Ready  
**Applies To**: fishon-captain

---

## System Overview

The Operational Calendar System allows captains to manage their charter availability through a visual calendar interface with daily operational settings, unavailable dates, and special scheduling rules.

### Key Features

- ✅ **Visual calendar editor**: Interactive date selection with color-coded status
- ✅ **Daily operations**: Set operating hours per day of week
- ✅ **Unavailable dates**: Block specific dates or date ranges
- ✅ **Recurring schedules**: Weekly patterns for regular operations
- ✅ **Seasonal availability**: Different schedules for different seasons
- ✅ **Visual indicators**: Color-coded status (available/booked/unavailable)
- ✅ **Conflict detection**: Prevents double-booking

---

## Architecture

### Components

**OperationalScheduleEditor** (`src/components/captain/OperationalScheduleEditor.tsx`)
- Calendar view with date selection
- Operating hours configuration
- Day-of-week toggles
- Save/reset functionality

**Calendar Integration**
- Links to charter availability API
- Updates fishon-market availability data
- Syncs with booking system

### Database Schema

```prisma
model Charter {
  // Operating schedule
  operatingDays    String[]  // ["MONDAY", "TUESDAY", ...]
  operatingHours   Json?     // { "MONDAY": { "start": "07:00", "end": "18:00" } }
  seasonalSchedule Json?     // Optional seasonal variations
  
  // Unavailable dates
  unavailableDates UnavailableDate[]
}

model UnavailableDate {
  id        String   @id @default(cuid())
  charterId String
  date      DateTime
  reason    String?
  isAllDay  Boolean  @default(true)
  charter   Charter  @relation(fields: [charterId], references: [id])
}
```

---

## Configuration

### API Endpoints

**GET `/api/charters/:id/schedule`** - Get charter operating schedule  
**PATCH `/api/charters/:id/schedule`** - Update operating schedule  
**GET `/api/charters/:id/unavailability`** - Get unavailable dates  
**POST `/api/charters/:id/unavailability`** - Add unavailable date  
**DELETE `/api/charters/:id/unavailability/:dateId`** - Remove unavailable date

### Usage Example

```typescript
// Update operating schedule
await fetch(`/api/charters/${charterId}/schedule`, {
  method: "PATCH",
  body: JSON.stringify({
    operatingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    operatingHours: {
      MONDAY: { start: "07:00", end: "18:00" },
      TUESDAY: { start: "07:00", end: "18:00" },
      // ...
    },
  }),
});

// Add unavailable date
await fetch(`/api/charters/${charterId}/unavailability`, {
  method: "POST",
  body: JSON.stringify({
    date: "2025-12-25",
    reason: "Christmas Day",
    isAllDay: true,
  }),
});
```

---

## Visual Indicators

### Calendar Color Coding

- **Green**: Available (no bookings)
- **Blue**: Booked (has confirmed bookings)
- **Red**: Unavailable (blocked by captain)
- **Gray**: Non-operating day (day of week disabled)
- **Yellow**: Partially booked (some time slots available)

### Status Icons

- ✅ Available
- 📅 Booked
- 🚫 Unavailable
- ⏰ Partial

---

## Testing

**Manual Testing Checklist**:

- [ ] Select operating days (checkboxes)
- [ ] Set operating hours per day
- [ ] Block specific dates
- [ ] Verify calendar colors update
- [ ] Check booking system respects unavailability
- [ ] Test date range blocking
- [ ] Verify seasonal schedule switching

---

## Related Documentation

- **Charter Configuration**: `docs/config/CHARTER_REGISTRATION_SYSTEM.md`
- **Booking System**: `docs/config/BOOKING_SYSTEM.md`

---

**Document Maintained By**: Development Team  
**Last Review**: November 21, 2025
