"use client";

import type { CharterPerformance } from "@/lib/charter-service";
import { AlertCircle, Calendar, Check, Star } from "lucide-react";

/**
 * Props for CharterPerformanceCard
 *
 * @property charterPerformance - Array of charter performance metrics
 */
interface CharterPerformanceCardProps {
  charterPerformance: CharterPerformance[];
}

/**
 * CharterPerformanceCard - Charter health and performance metrics
 *
 * Displays performance data for all active charters:
 * - Rating: Average guest rating (0-5 stars)
 * - Booking Count: Total completed bookings
 * - Media Count: Photos and videos uploaded
 * - Active Status: Whether charter is published
 *
 * Layouts:
 * - Single Charter: Vertical stats with icons
 * - Multiple Charters: Compact list format
 *
 * Styling:
 * - Active charter badge: Green
 * - Inactive charter badge: Gray
 * - Star ratings with gold color
 *
 * @example
 * ```tsx
 * <CharterPerformanceCard
 *   charterPerformance={[
 *     {
 *       id: "charter-1",
 *       name: "Sea Explorer",
 *       isActive: true,
 *       rating: 4.8,
 *       bookingCount: 12,
 *       mediaCount: 8,
 *       lastUpdated: new Date(),
 *     },
 *   ]}
 * />
 * ```
 */
export function CharterPerformanceCard({
  charterPerformance,
}: CharterPerformanceCardProps) {
  if (charterPerformance.length === 0) {
    return (
      <div
        className="p-5 bg-white border border-slate-200 rounded-2xl"
        role="region"
        aria-label="Charter performance"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-indigo-50 p-2.5">
            <Star className="w-5 h-5 text-indigo-600" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-600">
            Performance
          </h3>
        </div>
        <div className="py-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">No charters available</p>
        </div>
      </div>
    );
  }

  const isSingleCharter = charterPerformance.length === 1;
  const charter = charterPerformance[0];

  return (
    <div
      className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-[#ec2227] focus-within:ring-offset-2"
      role="region"
      aria-label="Charter performance"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-indigo-50 p-2.5">
          <Star className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        </div>
        <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-600">
          Performance
        </h3>
      </div>

      {isSingleCharter ? (
        // Single charter: Vertical stats layout
        <div className="space-y-3">
          {/* Charter Name with Status */}
          <div className="flex items-center justify-between">
            <p className="font-semibold truncate text-slate-900">
              {charter.name}
            </p>
            {charter.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full border border-green-200">
                <Check className="w-3 h-3" aria-hidden="true" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full border border-slate-200">
                Inactive
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between pt-3 text-sm border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-600">
              <Star
                className="w-4 h-4 text-amber-500 fill-amber-500"
                aria-hidden="true"
              />
              <span>Rating</span>
            </div>
            <span className="font-bold text-slate-900">
              {charter.rating ? charter.rating.toFixed(1) : "N/A"}
            </span>
          </div>

          {/* Booking Count */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>Bookings</span>
            </div>
            <span className="font-bold text-slate-900">
              {charter.bookingCount}
            </span>
          </div>
        </div>
      ) : (
        // Multiple charters: Compact list format
        <div className="space-y-2">
          {charterPerformance.slice(0, 3).map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200 focus-within:ring-2 focus-within:ring-[#ec2227]"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold truncate text-slate-900">
                  {c.name}
                </p>
                {c.isActive ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-50 rounded-full border border-green-200"
                    aria-label="Active"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-slate-300"
                    aria-label="Inactive"
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Star
                    className="w-4 h-4 text-amber-500 fill-amber-500"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">
                    {c.rating ? c.rating.toFixed(1) : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span className="font-semibold">{c.bookingCount}</span>
                </div>
              </div>
            </div>
          ))}

          {charterPerformance.length > 3 && (
            <p className="pt-2 text-xs font-medium text-center text-slate-500">
              +{charterPerformance.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
