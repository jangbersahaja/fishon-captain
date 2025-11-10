"use client";

import {
  Calendar,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Ship,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const active = pathname?.replace(/\/$/, "") || "";

  const isActive = (href: string) => {
    if (href === "/captain") {
      return active === "/captain";
    }
    return active.startsWith(href);
  };

  const items: BottomNavItem[] = [
    {
      href: "/captain",
      label: "Home",
      icon: <LayoutDashboard className="w-6 h-6" />,
    },
    {
      href: "/captain/charters",
      label: "Charters",
      icon: <Ship className="w-6 h-6" />,
    },
    {
      href: "/captain/bookings",
      label: "Bookings",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      href: "/captain/messages",
      label: "Messages",
      icon: <MessageCircle className="w-6 h-6" />,
    },
    {
      label: "More",
      icon: <MoreHorizontal className="w-6 h-6" />,
      onClick: onMoreClick,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden pb-safe">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => {
          const active = item.href ? isActive(item.href) : false;
          const className = `flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
            active ? "text-[#ec2227]" : "text-slate-600"
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
