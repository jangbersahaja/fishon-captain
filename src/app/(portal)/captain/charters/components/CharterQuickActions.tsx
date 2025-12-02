"use client";

import { Button } from "@/components/ui/button";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { Calendar, Copy, Edit2, ImageIcon, List, Ship } from "lucide-react";
import Link from "next/link";

interface CharterQuickActionsProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterQuickActions({
  charter,
  adminUserId,
}: CharterQuickActionsProps) {
  const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";
  const editHref = `/captain/form?editCharterId=${charter.id}${editQuery}`;
  const marketplaceUrl = `https://www.fishon.my/charters/${charter.id}`;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Primary Actions - Always Visible */}
      <Link
        href={editHref}
        className="inline-flex items-center gap-2 rounded-lg bg-[#ec2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#d81e23] transition-colors"
      >
        <Edit2 className="w-4 h-4" />
        Edit Charter
      </Link>

      <Link
        href={`/captain/bookings?charterId=${charter.id}`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <List className="w-4 h-4" />
        Bookings
      </Link>

      <Link
        href={`/captain/calendar?charterId=${charter.id}`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <Calendar className="w-4 h-4" />
        Calendar
      </Link>

      <Link
        href={`/captain/trips?charterId=${charter.id}`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <Ship className="w-4 h-4" />
        Trips
      </Link>

      <Link
        href={`/captain/media?charterId=${charter.id}`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <ImageIcon className="w-4 h-4" />
        Media
      </Link>

      <Button
        variant="outline"
        size="sm"
        className="hidden h-auto px-4 py-2"
        onClick={() => {
          // TODO: Implement duplicate charter functionality
          console.log("Duplicate charter:", charter.id);
        }}
      >
        <Copy className="w-4 h-4 mr-2" />
        Duplicate
      </Button>
    </div>
  );
}

interface CharterQuickLinksProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterQuickLinks({ charter }: CharterQuickLinksProps) {
  const links = [
    {
      label: "Bookings",
      href: `/captain/bookings?charterId=${charter.id}`,
      icon: List,
      count: charter.bookingStats.total,
    },
    {
      label: "Calendar",
      href: `/captain/calendar?charterId=${charter.id}`,
      icon: Calendar,
    },
    {
      label: "Trips",
      href: `/captain/trips?charterId=${charter.id}`,
      icon: Ship,
      count: charter.trips.count,
    },
    {
      label: "Media",
      href: `/captain/media?charterId=${charter.id}`,
      icon: ImageIcon,
      count: charter.media.count,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="flex items-center gap-2 p-3 transition-colors bg-white border rounded-lg border-slate-200 hover:bg-slate-50 hover:border-slate-300 group"
        >
          <link.icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
              {link.label}
            </p>
          </div>
          {link.count !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
              {link.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
