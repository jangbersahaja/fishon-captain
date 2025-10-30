/**
 * Calendar Legend Component
 *
 * Shows color-coded status meanings for calendar view.
 * Colors match the actual calendar day rendering.
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  {
    color: "bg-blue-500/10",
    label: "Operational",
    description: "Available for bookings",
  },
  {
    color: "bg-slate-300/40",
    label: "Non-operational",
    description: "Not operating on this day",
  },
  {
    color: "bg-red-500/20",
    label: "Unavailable",
    description: "Blocked by captain",
  },
  {
    color: "bg-green-500/20",
    label: "Booked",
    description: "Has confirmed bookings",
  },
  {
    color: "bg-yellow-500/20",
    label: "Pending",
    description: "Has pending bookings",
  },
];

export function CalendarLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legend</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:flex-wrap">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-8 w-8 rounded border border-slate-200 ${item.color}`}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">
                {item.label}
              </div>
              <div className="text-xs text-slate-500">{item.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
