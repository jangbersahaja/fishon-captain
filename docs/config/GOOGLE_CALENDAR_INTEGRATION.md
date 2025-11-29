# Google Calendar Integration System

## Overview

The Google Calendar integration allows captains to sync their Fishon calendar with Google Calendar. This enables:

1. **Push to Google**: Blocked dates and bookings appear in their Google Calendar
2. **Import from Google**: Personal events can be imported as blocked dates in Fishon
3. **Two-way visibility**: Never double-book again

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fishon Captain Calendar                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Bookings   │    │ Blocked Dates│    │  Google Calendar │   │
│  │   (local)    │    │   (local)    │    │   (external)     │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                      │             │
│         ▼                   ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Unified Calendar View                     ││
│  │  • Bookings (blue) • Blocked (gray) • Google Import (green) ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### GoogleCalendarSettings

```prisma
model GoogleCalendarSettings {
  id                   String   @id @default(cuid())
  userId               String   @unique

  // Connection status
  isConnected          Boolean  @default(false)
  connectedAt          DateTime?

  // OAuth tokens
  googleAccessToken    String?  @db.Text
  googleRefreshToken   String?  @db.Text
  googleTokenExpiresAt DateTime?
  googleEmail          String?

  // Sync preferences
  selectedCalendarId   String?  @default("primary")
  selectedCalendarName String?
  syncBookingsToGoogle Boolean  @default(true)
  syncBlockedToGoogle  Boolean  @default(true)
  importFromGoogle     Boolean  @default(false)

  // Auto-import rules
  autoImportAllDay     Boolean  @default(true)
  autoImportKeywords   String[] @default([])

  lastSyncAt           DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user                 User     @relation(...)
}
```

### CharterUnavailability (sync fields)

```prisma
model CharterUnavailability {
  // ... existing fields

  // Google Calendar sync
  googleEventId     String?   // Google Calendar event ID
  googleCalendarId  String?   // Which calendar it's synced to
  googleSyncedAt    DateTime? // Last sync timestamp
  isFromGoogle      Boolean   @default(false) // Imported from Google
  googleEventTitle  String?   // Original title for reference
}
```

## API Endpoints

### OAuth Flow

| Endpoint                          | Method | Description                              |
| --------------------------------- | ------ | ---------------------------------------- |
| `/api/calendar/google/connect`    | GET    | Get OAuth URL for calendar authorization |
| `/api/calendar/google/callback`   | GET    | Handle OAuth callback, store tokens      |
| `/api/calendar/google/disconnect` | POST   | Revoke access and clear tokens           |

### Settings

| Endpoint                         | Method | Description                                  |
| -------------------------------- | ------ | -------------------------------------------- |
| `/api/calendar/google/settings`  | GET    | Get current settings and available calendars |
| `/api/calendar/google/settings`  | PATCH  | Update sync preferences                      |
| `/api/calendar/google/calendars` | GET    | List user's writable calendars               |

### Sync Operations

| Endpoint                      | Method | Description                           |
| ----------------------------- | ------ | ------------------------------------- |
| `/api/calendar/google/events` | GET    | Fetch events from Google Calendar     |
| `/api/calendar/google/sync`   | POST   | Push blocked dates to Google Calendar |
| `/api/calendar/google/import` | POST   | Import Google events as blocked dates |

## OAuth Scopes

We use the minimum required scopes:

- `https://www.googleapis.com/auth/calendar.events` - Read/write calendar events
- `https://www.googleapis.com/auth/calendar.readonly` - List available calendars

We do NOT request:

- `https://www.googleapis.com/auth/calendar` - Full calendar access (overkill)

## User Flow

### Connecting Google Calendar

1. User navigates to `/captain/settings/calendar`
2. Clicks "Connect Google Calendar"
3. Frontend calls `GET /api/calendar/google/connect`
4. User is redirected to Google OAuth consent screen
5. After authorization, Google redirects to `/api/calendar/google/callback`
6. Callback stores tokens and redirects to settings page with `?connected=true`

### Syncing Blocked Dates

1. When captain creates/updates a blocked date:
   - Frontend can call `POST /api/calendar/google/sync` with `action: "push"`
   - Or use background sync on save

2. For full sync:
   - Call `POST /api/calendar/google/sync` with `action: "full"`

### Importing Google Events

1. User clicks "Import from Google Calendar"
2. Frontend calls `GET /api/calendar/google/events` to list events
3. User selects events and target charter
4. Frontend calls `POST /api/calendar/google/import` with selected events

## Security Considerations

1. **Token Storage**: Tokens stored in database (encrypted at rest by Neon)
2. **Token Refresh**: Automatic refresh when access token expires
3. **State Parameter**: CSRF protection with signed state in OAuth flow
4. **Ownership Verification**: All operations verify charter ownership
5. **Incremental Authorization**: Calendar scope requested separately from login

## Environment Variables

No new environment variables required - uses existing:

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXT_PUBLIC_SITE_URL` - Base URL for OAuth redirect

## Event Format

When syncing to Google Calendar, events are formatted as:

```
🚫 {Charter Name} - {Reason}

Blocked date for {Charter Name}
Reason: {Reason}

(Synced from Fishon Captain)
```

## Rate Limits

Google Calendar API limits:

- 1,000,000 queries/day (unlikely to hit)
- Batch requests where possible for full sync

## Error Handling

1. **Token Expired**: Auto-refresh using refresh token
2. **Token Revoked**: Mark as disconnected, prompt reconnection
3. **API Errors**: Log and return user-friendly message
4. **Partial Failures**: Full sync continues on individual failures

## Future Enhancements

1. **Booking Sync**: Push confirmed bookings to Google Calendar
2. **Webhook Support**: Real-time sync via Google Calendar push notifications
3. **Auto-Import Rules**: Automatically import events matching keywords
4. **Conflict Detection**: Warn when Google event conflicts with booking
