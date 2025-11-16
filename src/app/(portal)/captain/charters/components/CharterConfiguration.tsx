"use client";

import { Badge } from "@/components/ui/badge";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { formatCurrency } from "@/lib/helpers/booking-helpers";
import { format } from "date-fns";
import { Anchor, Clock, DollarSign, Users } from "lucide-react";
import Link from "next/link";
import { BookingFlowSettings } from "./BookingFlowSettings";

interface CharterConfigurationProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterConfiguration({
  charter,
  adminUserId,
}: CharterConfigurationProps) {
  const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";

  return (
    <div className="space-y-4">
      {/* Booking Flow Settings - Interactive */}
      <BookingFlowSettings charter={charter} adminUserId={adminUserId} />

      {/* Boat Information */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Anchor className="w-4 h-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-900">Boat</h4>
        </div>
        {charter.boat ? (
          <div className="p-3 space-y-2 border rounded-lg bg-slate-50 border-slate-200">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Name:</span>
              <span className="text-sm font-medium text-slate-900">
                {charter.boat.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Type:</span>
              <span className="text-sm text-slate-700">
                {charter.boat.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Length:</span>
              <span className="text-sm text-slate-700">
                {charter.boat.lengthFt} ft
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Capacity:</span>
              <span className="text-sm text-slate-700">
                {charter.boat.capacity} pax
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 text-sm text-center border border-dashed rounded-lg text-slate-500 bg-slate-50 border-slate-300">
            No boat assigned.{" "}
            <Link
              href={`/captain/form?editCharterId=${charter.id}${editQuery}#boat`}
              className="font-medium underline text-slate-700 hover:text-slate-900"
            >
              Add boat
            </Link>
          </div>
        )}
      </div>

      {/* Captain Information */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-900">
            Captain & Crew
          </h4>
        </div>
        <div className="p-3 space-y-2 border rounded-lg bg-slate-50 border-slate-200">
          <div className="pb-2 border-b border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">
                CAPTAIN
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {charter.captain.name}
            </p>
            {charter.captain.email && (
              <p className="text-xs text-slate-600">{charter.captain.email}</p>
            )}
          </div>

          {charter.crew.count > 0 ? (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500">
                  CREW ({charter.crew.count})
                </span>
              </div>
              <div className="space-y-1">
                {charter.crew.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">{member.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <p className="text-xs text-slate-500">
                No crew members assigned.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-900">
            Trips ({charter.trips.count})
          </h4>
        </div>
        {charter.trips.active.length > 0 ? (
          <div className="space-y-2">
            {charter.trips.active.map((trip) => (
              <div
                key={trip.id}
                className="p-3 border rounded-lg bg-slate-50 border-slate-200"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {trip.name}
                    </p>
                    <p className="text-xs text-slate-500">{trip.type}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(trip.price)}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-slate-600">
                  <span>⏱️ {trip.duration}h</span>
                  <span>👥 Max {trip.maxPax} pax</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-sm text-center border border-dashed rounded-lg text-slate-500 bg-slate-50 border-slate-300">
            No active trips.{" "}
            <Link
              href={`/captain/form?editCharterId=${charter.id}${editQuery}#trips`}
              className="font-medium underline text-slate-700 hover:text-slate-900"
            >
              Add trip
            </Link>
          </div>
        )}
      </div>

      {/* Last Booking Info */}
      {charter.lastBooking && (
        <div className="p-3 border rounded-lg bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-green-900">
              Last Booking
            </h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Guest:</span>
              <span className="font-medium text-green-900">
                {charter.lastBooking.guestName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Trip Date:</span>
              <span className="text-green-900">
                {format(charter.lastBooking.tripDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Amount:</span>
              <span className="font-medium text-green-900">
                {formatCurrency(charter.lastBooking.totalPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Status:</span>
              <Badge variant="outline" className="text-xs">
                {charter.lastBooking.status}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Booking Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 text-center border rounded-lg bg-slate-50 border-slate-200">
          <p className="text-2xl font-bold text-slate-900">
            {charter.bookingStats.total}
          </p>
          <p className="text-xs text-slate-600">Total Bookings</p>
        </div>
        <div className="p-3 text-center border rounded-lg bg-blue-50 border-blue-200">
          <p className="text-2xl font-bold text-blue-900">
            {charter.bookingStats.thisMonth}
          </p>
          <p className="text-xs text-blue-700">This Month</p>
        </div>
      </div>
    </div>
  );
}
