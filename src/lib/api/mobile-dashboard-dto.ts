/**
 * Serializer that maps the server-side DashboardData aggregate into a flat,
 * JSON-safe shape for the Fishon mobile app's captain dashboard.
 *
 * DashboardData embeds Prisma rows (CaptainProfile) and a full
 * EnrichedMarketBooking inside each PriorityBooking. This mapper flattens those
 * and reuses toMobileBookingDto so the mobile `Booking` model can parse priority
 * items directly.
 */

import type { DashboardData } from "../dashboard-service";
import { type MobileBookingDto, toMobileBookingDto } from "./mobile-booking-dto";

export interface MobileDashboardStats {
  // Earnings (from EarningsSummary)
  totalEarnings: number; // currentPeriod
  previousEarnings: number;
  earningsPercentChange: number;
  pendingEarnings: number;
  nextPayoutDate: string | null;
  commissionRate: number;
  // Booking stats (from BookingStats)
  requests: number;
  upcoming: number;
  completed: number;
  cancellations: number;
  totalBookings: number; // requests + upcoming + completed (active + done)
  totalValue: number;
}

export interface MobilePriorityBooking {
  id: string;
  type: string; // new-request | upcoming-trip | payment-pending
  urgency: string; // high | medium | low
  action: string;
  countdown: string | null;
  booking: MobileBookingDto;
}

export interface MobileCharterPerformance {
  id: string;
  name: string;
  isActive: boolean;
  rating: number | null;
  bookingCount: number;
  mediaCount: number;
}

export interface MobileSystemMessage {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  actionUrl: string | null;
  cta: string | null;
  isDismissible: boolean;
}

export interface MobileDashboardDto {
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    phone: string | null;
  } | null;
  stats: MobileDashboardStats;
  priorityBookings: MobilePriorityBooking[];
  charterPerformance: MobileCharterPerformance[];
  systemMessages: MobileSystemMessage[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toMobileDashboardDto(data: DashboardData): MobileDashboardDto {
  const { profile, bookingStats, earningsData, charterPerformance } = data;

  const stats: MobileDashboardStats = {
    totalEarnings: Number(earningsData.currentPeriod ?? 0),
    previousEarnings: Number(earningsData.previousPeriod ?? 0),
    earningsPercentChange: Number(earningsData.percentChange ?? 0),
    pendingEarnings: Number(earningsData.pending ?? 0),
    nextPayoutDate: toIso(earningsData.nextPayoutDate),
    commissionRate: Number(earningsData.commissionRate ?? 0),
    requests: bookingStats.requests,
    upcoming: bookingStats.upcoming,
    completed: bookingStats.completed,
    cancellations: bookingStats.cancellations,
    totalBookings:
      bookingStats.requests + bookingStats.upcoming + bookingStats.completed,
    totalValue: Number(bookingStats.totalValue ?? 0),
  };

  const priorityBookings: MobilePriorityBooking[] = data.priorityBookings.map(
    (p) => ({
      id: p.id,
      type: p.type,
      urgency: p.urgency,
      action: p.action,
      countdown: p.countdown ?? null,
      booking: toMobileBookingDto(p.booking),
    })
  );

  const charters: MobileCharterPerformance[] = charterPerformance.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
    rating: c.rating,
    bookingCount: c.bookingCount,
    mediaCount: c.mediaCount,
  }));

  const systemMessages: MobileSystemMessage[] = data.systemMessages.map(
    (m) => ({
      id: m.id,
      type: m.type,
      severity: m.severity,
      title: m.title,
      description: m.description,
      actionUrl: m.actionUrl ?? null,
      cta: m.cta ?? null,
      isDismissible: m.isDismissible,
    })
  );

  return {
    profile: profile
      ? {
          displayName: profile.displayName ?? null,
          avatarUrl: profile.avatarUrl ?? null,
          phone: profile.phone ?? null,
        }
      : null,
    stats,
    priorityBookings,
    charterPerformance: charters,
    systemMessages,
  };
}
