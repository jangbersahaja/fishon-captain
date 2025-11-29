/**
 * Google Calendar API Client
 *
 * Provides functions for:
 * - OAuth token management with auto-refresh
 * - Creating/updating/deleting calendar events
 * - Fetching events from Google Calendar
 * - Listing user's calendars
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Google Calendar API base URL
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Scopes required for calendar integration
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", // Read/write events
  "https://www.googleapis.com/auth/calendar.readonly", // List calendars
].join(" ");

// Types
export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string; // ISO 8601 format for timed events
    date?: string; // YYYY-MM-DD format for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  status?: "confirmed" | "tentative" | "cancelled";
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface TokenRefreshResult {
  accessToken: string;
  expiresAt: Date;
}

/**
 * Refresh Google OAuth access token using refresh token
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error("[google-calendar] Token refresh failed", { error });
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens: GoogleTokens = await response.json();

  return {
    accessToken: tokens.access_token,
    expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
  };
}

/**
 * Get valid access token for a user, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const settings = await prisma.googleCalendarSettings.findUnique({
    where: { userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiresAt: true,
      isConnected: true,
    },
  });

  if (!settings?.isConnected || !settings.googleAccessToken) {
    throw new Error("Google Calendar not connected");
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = settings.googleTokenExpiresAt;
  const isExpired =
    expiresAt && now >= new Date(expiresAt.getTime() - 5 * 60 * 1000);

  if (!isExpired) {
    return settings.googleAccessToken;
  }

  // Token expired, refresh it
  if (!settings.googleRefreshToken) {
    throw new Error(
      "No refresh token available. Please reconnect Google Calendar."
    );
  }

  logger.info("[google-calendar] Refreshing expired token", { userId });

  const { accessToken, expiresAt: newExpiresAt } = await refreshAccessToken(
    settings.googleRefreshToken
  );

  // Update stored tokens
  await prisma.googleCalendarSettings.update({
    where: { userId },
    data: {
      googleAccessToken: accessToken,
      googleTokenExpiresAt: newExpiresAt,
    },
  });

  return accessToken;
}

/**
 * Make authenticated request to Google Calendar API
 */
async function googleCalendarRequest<T>(
  userId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(`${GOOGLE_CALENDAR_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error("[google-calendar] API request failed", {
      endpoint,
      status: response.status,
      error,
    });

    // Handle specific error cases
    if (response.status === 401) {
      // Token might be revoked, mark as disconnected
      await prisma.googleCalendarSettings.update({
        where: { userId },
        data: { isConnected: false },
      });
      throw new Error("Google Calendar access revoked. Please reconnect.");
    }

    throw new Error(`Google Calendar API error: ${response.status} ${error}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// Calendar Operations
// ============================================================================

/**
 * List all calendars the user has access to
 */
export async function listCalendars(userId: string): Promise<GoogleCalendar[]> {
  const response = await googleCalendarRequest<{
    items: GoogleCalendar[];
  }>(userId, "/users/me/calendarList");

  return response.items || [];
}

/**
 * Get the user's primary calendar
 */
export async function getPrimaryCalendar(
  userId: string
): Promise<GoogleCalendar | null> {
  const calendars = await listCalendars(userId);
  return calendars.find((c) => c.primary) || null;
}

// ============================================================================
// Event Operations
// ============================================================================

/**
 * Create an event in Google Calendar
 */
export async function createEvent(
  userId: string,
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<GoogleCalendarEvent> {
  return googleCalendarRequest<GoogleCalendarEvent>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify(event),
    }
  );
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> {
  return googleCalendarRequest<GoogleCalendarEvent>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(event),
    }
  );
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  await googleCalendarRequest<void>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
    }
  );
}

/**
 * List events from Google Calendar within a date range
 */
export async function listEvents(
  userId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
  options: {
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
  } = {}
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: String(options.singleEvents ?? true),
    orderBy: options.orderBy ?? "startTime",
    maxResults: String(options.maxResults ?? 250),
  });

  const response = await googleCalendarRequest<{
    items: GoogleCalendarEvent[];
  }>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );

  return response.items || [];
}

// ============================================================================
// Helper Functions for Fishon Integration
// ============================================================================

/**
 * Format a booking or blocked date as a Google Calendar event
 */
export function formatAsGoogleEvent(params: {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  timeZone?: string;
}): GoogleCalendarEvent {
  const {
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    startTime,
    endTime,
    timeZone = "Asia/Kuala_Lumpur",
  } = params;

  if (isAllDay) {
    // All-day events use date format (YYYY-MM-DD)
    // End date should be the day AFTER for Google Calendar (exclusive end)
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

    return {
      summary: title,
      description,
      start: {
        date: formatDateOnly(startDate),
      },
      end: {
        date: formatDateOnly(endDatePlusOne),
      },
    };
  }

  // Timed events
  const startDateTime = combineDateAndTime(startDate, startTime || "00:00");
  const endDateTime = combineDateAndTime(endDate, endTime || "23:59");

  return {
    summary: title,
    description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone,
    },
  };
}

/**
 * Format date as YYYY-MM-DD for all-day events
 */
function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Combine a date with a time string (HH:MM)
 */
function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Generate OAuth URL for Google Calendar authorization
 */
export function generateOAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: "offline", // Required for refresh token
    prompt: "consent", // Force consent to get refresh token every time
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens & { email?: string }> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error("[google-calendar] Code exchange failed", { error });
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const tokens: GoogleTokens = await response.json();

  // Get user email from userinfo endpoint
  let email: string | undefined;
  try {
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email;
    }
  } catch (e) {
    logger.warn("[google-calendar] Failed to fetch user email", { error: e });
  }

  return { ...tokens, email };
}

/**
 * Revoke Google Calendar access
 */
export async function revokeAccess(accessToken: string): Promise<void> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
      { method: "POST" }
    );
  } catch (e) {
    logger.warn("[google-calendar] Revoke request failed", { error: e });
    // Continue anyway - we'll clear local tokens
  }
}

/**
 * Check if a user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const settings = await prisma.googleCalendarSettings.findUnique({
    where: { userId },
    select: { isConnected: true },
  });

  return settings?.isConnected ?? false;
}

/**
 * Get Google Calendar settings for a user
 */
export async function getCalendarSettings(userId: string) {
  return prisma.googleCalendarSettings.findUnique({
    where: { userId },
    select: {
      isConnected: true,
      connectedAt: true,
      googleEmail: true,
      selectedCalendarId: true,
      selectedCalendarName: true,
      syncBookingsToGoogle: true,
      syncBlockedToGoogle: true,
      importFromGoogle: true,
      autoImportAllDay: true,
      autoImportKeywords: true,
      lastSyncAt: true,
    },
  });
}
