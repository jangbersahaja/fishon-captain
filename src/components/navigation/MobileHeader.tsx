"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface MobileHeaderProps {
  onMenuClick: () => void;
  unreadNotifications?: number;
}

const PAGE_TITLES: Record<string, string> = {
  "/captain": "Overview",
  "/captain/charter": "Charter",
  "/captain/bookings": "Bookings",
  "/captain/bookings/calendar": "Calendar",
  "/captain/reviews": "Reviews",
  "/captain/notifications": "Notifications",
  "/captain/media": "Media",
  "/captain/documents": "Documents",
  "/captain/settings": "Settings",
  "/captain/support": "Support",
  "/captain/analytics": "Analytics",
  "/captain/messages": "Messages",
  "/captain/pricing": "Pricing",
};

export function MobileHeader({
  onMenuClick,
  unreadNotifications = 0,
}: MobileHeaderProps) {
  const pathname = usePathname();
  const active = pathname?.replace(/\/$/, "") || "";

  const pageTitle = useMemo(() => {
    // Check for dynamic routes
    if (
      active.startsWith("/captain/bookings/") &&
      active !== "/captain/bookings/calendar"
    ) {
      return "Booking Details";
    }
    if (active.startsWith("/captain/edit")) {
      return "Edit Charter";
    }
    if (active.startsWith("/captain/form")) {
      return "Create Charter";
    }
    return PAGE_TITLES[active] || "Captain Dashboard";
  }, [active]);

  return (
    <header className="sticky left-0 right-0 z-50 bg-white border-b top-16 border-slate-200 md:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Hamburger Menu */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 transition-colors rounded-lg hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-slate-700" />
        </button>

        {/* Page Title */}
        <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>

        {/* Notifications */}
        <Link
          href="/captain/notifications"
          className="relative p-2 -mr-2 transition-colors rounded-lg hover:bg-slate-100"
          aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
        >
          <Bell className="w-6 h-6 text-slate-700" />
          {unreadNotifications > 0 && (
            <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-semibold text-white rounded-full top-1 right-1 bg-[#ec2227]">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
