"use client";

import {
  BookCheck,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  Wallet,
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

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname?.replace(/\/$/, "") || "";
  const isNewCharterRegistration =
    active === "/captain/form" && !searchParams?.get("editCharterId");

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

  const items: BottomNavItem[] = [
    {
      href: "/captain",
      label: "Home",
      icon: <LayoutDashboard className="w-6 h-6" />,
    },
    {
      href: "/captain/earnings",
      label: "Earnings",
      icon: <Wallet className="w-6 h-6" />,
    },
    {
      href: "/captain/bookings",
      label: "Bookings",
      icon: <BookCheck className="w-6 h-6" />,
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#ec2227] md:hidden pb-safe">
      <div className="grid grid-cols-5 gap-1 px-2 py-1">
        {items.map((item) => {
          const active = item.href ? isActive(item.href) : false;
          const className = `flex flex-col items-center gap-1 py-1 px-1 rounded-lg transition-colors ${
            active
              ? "bg-white text-[#ec2227]"
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
                <span className={`text-xs ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href!} className={className}>
              {item.icon}
              <span className={`text-xs ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
