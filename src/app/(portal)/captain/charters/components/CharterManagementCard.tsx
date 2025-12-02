"use client";

import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { MapPin } from "lucide-react";
import { BookingFlowSettings } from "./BookingFlowSettings";
import { CharterQuickActions } from "./CharterQuickActions";
import { MarketplaceStatusCard } from "./MarketplaceStatusCard";

interface CharterManagementCardProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterManagementCard({
  charter,
  adminUserId,
}: CharterManagementCardProps) {
  return (
    <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
      {/* Header Section - Identity Only */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Charter Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-xl font-bold truncate text-slate-900">
                {charter.name}
              </h2>
            </div>
            <p className="text-sm font-medium tracking-wide uppercase text-slate-500">
              {charter.charterType}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>
                {charter.startingPoint} • {charter.city}, {charter.state}
              </span>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {charter.bookingStats.total}
              </p>
              <p className="text-xs text-slate-500">Bookings</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-3 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {charter.trips.count}
              </p>
              <p className="text-xs text-slate-500">Trips</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {charter.bookingStats.thisMonth}
              </p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4">
          <CharterQuickActions charter={charter} adminUserId={adminUserId} />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* MARKETPLACE STATUS - PROMINENTLY DISPLAYED */}
        <MarketplaceStatusCard charter={charter} adminUserId={adminUserId} />

        {/* Booking Flow Settings */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Booking Settings
          </h3>
          <BookingFlowSettings charter={charter} adminUserId={adminUserId} />
        </div>
      </div>
    </div>
  );
}
