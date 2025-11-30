"use client";

import { BarChart3, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    href: "/staff/finance",
    label: "Overview",
    icon: BarChart3,
  },
  {
    href: "/staff/finance/bookings",
    label: "Bookings",
    icon: FileText,
  },
  {
    href: "/staff/finance/payouts",
    label: "Payouts",
    icon: CreditCard,
  },
];

export function FinanceNav() {
  const pathname = usePathname();

  // Check if current path matches exactly or is a subpath
  const isActive = (href: string) => {
    if (href === "/staff/finance") {
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
