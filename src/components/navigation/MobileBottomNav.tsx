"use client";

import {
  BookCheck,
  Calendar,
  Inbox,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type BottomNavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

// Helper to build href with adminUserId preserved
function buildHref(baseHref: string, adminUserId: string | null): string {
  if (adminUserId) {
    return `${baseHref}?adminUserId=${adminUserId}`;
  }
  return baseHref;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname?.replace(/\/$/, "") || "";
  const isNewCharterRegistration =
    active === "/captain/form" && !searchParams?.get("editCharterId");

  // Get adminUserId from search params to preserve across navigation
  const adminUserId = searchParams?.get("adminUserId") || null;
  const isAdminMode = !!adminUserId;

  const isActive = (href: string) => {
    if (href === "/captain") {
      return active === "/captain";
    }
    return active.startsWith(href);
  };

  // Show minimal navigation during new charter registration (only Menu button)
  if (isNewCharterRegistration) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#ec2227] md:hidden pb-safe">
        <div className="flex justify-center px-2 py-1">
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center gap-1 px-4 py-1 transition-colors rounded-lg text-white/90 hover:text-white hover:bg-white/10"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-xs">Menu</span>
          </button>
        </div>
      </nav>
    );
  }

  // In admin mode, show Exit button instead of More
  const items: BottomNavItem[] = isAdminMode
    ? [
        {
          href: "/captain",
          label: "Home",
          icon: <LayoutDashboard className="w-6 h-6" />,
        },
        {
          href: "/captain/bookings",
          label: "Bookings",
          icon: <BookCheck className="w-6 h-6" />,
        },
        {
          href: "/captain/calendar",
          label: "Calendar",
          icon: <Calendar className="w-6 h-6" />,
        },
        {
          href: "/captain/messages",
          label: "Inbox",
          icon: <Inbox className="w-6 h-6" />,
        },
        {
          href: "/staff",
          label: "Exit",
          icon: <LogOut className="w-6 h-6" />,
        },
      ]
    : [
        {
          href: "/captain",
          label: "Home",
          icon: <LayoutDashboard className="w-6 h-6" />,
        },
        {
          href: "/captain/bookings",
          label: "Bookings",
          icon: <BookCheck className="w-6 h-6" />,
        },
        {
          href: "/captain/calendar",
          label: "Calendar",
          icon: <Calendar className="w-6 h-6" />,
        },
        {
          href: "/captain/messages",
          label: "Inbox",
          icon: <Inbox className="w-6 h-6" />,
        },
        {
          label: "More",
          icon: <MoreHorizontal className="w-6 h-6" />,
          onClick: onMoreClick,
        },
      ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe ${isAdminMode ? "bg-orange-500" : "bg-[#ec2227]"}`}
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-1">
        {items.map((item) => {
          const itemActive = item.href ? isActive(item.href) : false;
          // Don't add adminUserId to Exit link (which goes to /staff)
          const finalHref =
            item.href === "/staff"
              ? "/staff"
              : item.href
                ? buildHref(item.href, adminUserId)
                : undefined;
          const className = `flex flex-col items-center gap-1 py-1 px-1 rounded-lg transition-colors ${
            itemActive
              ? isAdminMode
                ? "bg-white text-orange-600"
                : "bg-white text-[#ec2227]"
              : "text-white/90 hover:text-white hover:bg-white/10"
          }`;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={className}
              >
                {item.icon}
                <span
                  className={`text-xs ${itemActive ? "font-semibold" : ""}`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link key={item.href} href={finalHref!} className={className}>
              {item.icon}
              <span className={`text-xs ${itemActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
