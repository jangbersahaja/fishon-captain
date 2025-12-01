"use client";

import {
  Anchor,
  BarChart3,
  Building,
  Calendar,
  DollarSign,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  Shield,
  Tag,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    links: [
      { href: "/staff", label: "Dashboard", Icon: LayoutDashboard },
      { href: "/staff/analytics", label: "Analytics", Icon: BarChart3 },
    ],
  },
  {
    title: "Users",
    links: [
      { href: "/staff/users", label: "Captain Users", Icon: Users },
      { href: "/staff/market-users", label: "Market Users", Icon: UserCircle },
      { href: "/staff/security", label: "Security", Icon: Shield },
    ],
  },
  {
    title: "Charters",
    links: [
      { href: "/staff/charters", label: "Charters", Icon: Anchor },
      { href: "/staff/registrations", label: "Registrations", Icon: IdCard },
      { href: "/staff/verification", label: "Verification", Icon: IdCard },
      { href: "/staff/media", label: "Media", Icon: ImageIcon },
    ],
  },
  {
    title: "Bookings & Sales",
    links: [
      { href: "/staff/bookings", label: "Bookings", Icon: Calendar },
      { href: "/staff/promo-codes", label: "Promo Codes", Icon: Tag },
      { href: "/staff/campaigns", label: "Campaigns", Icon: Megaphone },
    ],
  },
  {
    title: "Finance",
    links: [
      { href: "/staff/finance", label: "Finance", Icon: Building },
      { href: "/staff/pricing", label: "Pricing Plans", Icon: DollarSign },
    ],
  },
];

export default function StaffNav() {
  const pathname = usePathname();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);

  return (
    <nav className="flex gap-2 p-4 overflow-x-auto text-sm md:py-6 md:px-5 md:flex-col md:overflow-visible md:gap-1">
      {navGroups.map((group, groupIndex) => (
        <Fragment key={group.title}>
          {/* Group title - hidden on mobile */}
          <div className="hidden md:block">
            {groupIndex > 0 && (
              <div className="my-3 border-t border-slate-200" />
            )}
            <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
          </div>

          {/* Links */}
          {group.links.map(({ href, label, Icon }) => {
            const isActive =
              active === href || (href !== "/staff" && active.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={
                  "rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 " +
                  (isActive
                    ? "bg-[#ec2227] text-white shadow"
                    : "text-slate-600 hover:bg-slate-100")
                }
                aria-current={isActive ? "page" : undefined}
                prefetch={false}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
