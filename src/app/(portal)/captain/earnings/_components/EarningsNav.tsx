"use client";

import { Clock, DollarSign, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navItems: NavItem[] = [
  {
    href: "/captain/earnings",
    label: "Overview",
    icon: DollarSign,
    description: "Summary & recent earnings",
  },
  {
    href: "/captain/earnings/pending",
    label: "Pending",
    icon: Clock,
    description: "Awaiting payout",
  },
  {
    href: "/captain/earnings/history",
    label: "Payout History",
    icon: History,
    description: "Completed payouts",
  },
];

export function EarningsNav() {
  const pathname = usePathname();

  // Check if current path matches exactly or is a subpath (for [id] routes)
  const isActive = (href: string) => {
    if (href === "/captain/earnings") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="flex gap-1 p-1 overflow-x-auto border rounded-lg bg-slate-100 border-slate-200">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap
              ${
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
