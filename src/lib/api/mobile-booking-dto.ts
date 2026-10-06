/**
 * Serializer that maps a server-side EnrichedMarketBooking into the flat JSON
 * shape expected by the Fishon mobile app (`Booking.fromJson` in
 * fishon-mobile-android/lib/models/booking.dart).
 *
 * The mobile model expects camelCase enum values and a few renamed fields
 * (e.g. `tripDate` instead of `date`, `guests` as a flat integer), so this
 * mapper exists to keep the mobile contract decoupled from the DB shape.
 */

import type { EnrichedMarketBooking } from "../enrich-booking";

/** Market DB BookingStatus (UPPER_SNAKE) -> mobile enum value (camelCase). */
const STATUS_MAP: Record<string, string> = {
  PENDING: "pending",
  AWAITING_PAYMENT: "awaitingPayment",
  PAYMENT_AUTHORIZED: "paymentAuthorized",
  PAID: "paid",
  COMPLETED: "completed",
  REJECTED: "rejected",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  UNDER_REVIEW: "underReview",
};

/** Market DB paymentMethod -> mobile enum value. */
const PAYMENT_METHOD_MAP: Record<string, string> = {
  CARD: "card",
  FPX: "fpx",
  EWALLET: "ewallet",
  MOCK: "mock",
};

/** Market DB paymentFlow -> mobile enum value. */
const PAYMENT_FLOW_MAP: Record<string, string> = {
  TOKENIZED: "tokenized",
  DIRECT: "direct",
};

/**
 * The flat booking shape consumed by the mobile client.
 * Field names and nullability intentionally mirror the Dart model.
 */
export interface MobileBookingDto {
  id: string;
  charterId: string;
  tripId: string;
  charterName: string | null;
  tripName: string | null;
  status: string;
  tripDate: string; // ISO-8601
  startTime: string | null;
  guests: number;
  tripPrice: number;
  finalPrice: number | null;
  platformFee: number | null;
  serviceFee: number | null;
  captainEarnings: number | null;
  discount: number | null;
  paymentMethod: string | null;
  paymentFlow: string | null;
  paymentIntentId: string | null;
  createdAt: string; // ISO-8601
  coverImageUrl: string | null;
  captainName: string | null;
  conversationId: string | null;
  // Captain-facing extras (angler contact) — ignored by the Dart model today
  // but useful for the captain booking screens.
  anglerName: string | null;
  anglerEmail: string | null;
  anglerPhone: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
}

/** Total guest count from the booking's guests JSON ({ adults, children }). */
function guestCount(booking: EnrichedMarketBooking): number {
  const adults = typeof booking.adults === "number" ? booking.adults : 0;
  const children = typeof booking.children === "number" ? booking.children : 0;
  const total = adults + children;
  return total > 0 ? total : 1;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Discount JSON ({ amount }) -> flat number the mobile model expects. */
function discountAmount(booking: EnrichedMarketBooking): number | null {
  const discount = booking.discount as { amount?: unknown } | null | undefined;
  if (discount && typeof discount.amount === "number") return discount.amount;
  return null;
}

/** Optional angler contact details, resolved by the caller from the market User. */
export interface AnglerContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Map a single enriched booking to the mobile DTO.
 * @param coverImageUrl - optional charter cover image, resolved by the caller
 *   (kept out of this function so a single CharterMedia query can serve a page
 *   of bookings without an N+1 lookup per booking).
 * @param angler - optional angler contact details. When omitted, name/phone fall
 *   back to the booking's primary participant and email is left null. Detail
 *   endpoints should pass the resolved market User so email is populated.
 */
export function toMobileBookingDto(
  booking: EnrichedMarketBooking,
  coverImageUrl: string | null = null,
  angler: AnglerContact | null = null
): MobileBookingDto {
  return {
    id: booking.id,
    charterId: booking.charterId,
    tripId: booking.tripId,
    charterName: booking.charterName ?? null,
    tripName: booking.tripName ?? null,
    status: STATUS_MAP[booking.status] ?? booking.status.toLowerCase(),
    tripDate: toIso(booking.date) ?? new Date(0).toISOString(),
    startTime: booking.startTime ?? null,
    guests: guestCount(booking),
    tripPrice: Number(booking.tripPrice ?? 0),
    finalPrice:
      booking.finalPrice != null ? Number(booking.finalPrice) : null,
    platformFee:
      booking.platformFee != null ? Number(booking.platformFee) : null,
    serviceFee:
      booking.serviceFee != null ? Number(booking.serviceFee) : null,
    captainEarnings:
      booking.captainEarnings != null
        ? Number(booking.captainEarnings)
        : null,
    discount: discountAmount(booking),
    paymentMethod: booking.paymentMethod
      ? PAYMENT_METHOD_MAP[booking.paymentMethod] ??
        booking.paymentMethod.toLowerCase()
      : null,
    paymentFlow: booking.paymentFlow
      ? PAYMENT_FLOW_MAP[booking.paymentFlow] ??
        booking.paymentFlow.toLowerCase()
      : null,
    paymentIntentId: booking.paymentIntentId ?? null,
    createdAt: toIso(booking.createdAt) ?? new Date(0).toISOString(),
    coverImageUrl,
    captainName: booking.captainName ?? null,
    conversationId: booking.conversationId ?? null,
    anglerName: angler?.name ?? booking.primaryBooker?.name ?? null,
    anglerEmail: angler?.email ?? null,
    anglerPhone: angler?.phone ?? booking.primaryBooker?.phone ?? null,
    rejectionReason: booking.rejectionReason ?? null,
    cancellationReason: booking.cancellationReason ?? null,
    expiresAt: toIso(booking.expiresAt),
  };
}
