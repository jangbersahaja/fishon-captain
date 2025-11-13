"use client";
import {
  BarChart3,
  Bell,
  Calendar,
  DollarSign,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Settings as SettingsIcon,
  Ship,
  Star,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type NavLink = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type NavSection = {
  label: string;
  links: NavLink[];
};

const navSections: NavSection[] = [
  {
    label: "Dashboard",
    links: [{ href: "/captain", label: "Overview", Icon: LayoutDashboard }],
  },
  {
    label: "Business",
    links: [
      { href: "/captain/charters", label: "Charters", Icon: Ship },
      { href: "/captain/boats", label: "Boats", Icon: Ship },
      { href: "/captain/trips", label: "Trips", Icon: Calendar },
      { href: "/captain/bookings", label: "Bookings", Icon: Calendar },
      { href: "/captain/bookings/calendar", label: "Calendar", Icon: Calendar },
      { href: "/captain/payouts", label: "Payouts", Icon: DollarSign },
      { href: "/captain/reviews", label: "Reviews", Icon: Star },
    ],
  },
  {
    label: "Communication",
    links: [
      { href: "/captain/messages", label: "Messages", Icon: MessageCircle },
      { href: "/captain/notifications", label: "Notifications", Icon: Bell },
    ],
  },
  {
    label: "Analytics",
    links: [
      { href: "/captain/analytics", label: "Analytics", Icon: BarChart3 },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/captain/media", label: "Media", Icon: ImageIcon },
      { href: "/captain/documents", label: "Documents", Icon: IdCard },
    ],
  },
  {
    label: "Team",
    links: [
      { href: "/captain/profile", label: "Profile", Icon: User },
      { href: "/captain/crew", label: "Crew", Icon: Users },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/captain/settings", label: "Settings", Icon: SettingsIcon },
      { href: "/captain/support", label: "Support", Icon: LifeBuoy },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);
  const hideNav =
    active === "/captain/form" && !searchParams?.get("editCharterId");
  if (hideNav) {
    return null;
  }
  return (
    <nav className="flex gap-2 p-4 overflow-x-auto text-sm md:py-8 md:px-5 md:flex-col md:overflow-visible">
      {navSections.map((section, sectionIndex) => (
        <div key={section.label} className={sectionIndex > 0 ? "md:mt-6" : ""}>
          {/* Section Header - Hidden on mobile */}
          <div className="hidden px-4 pb-2 text-xs font-semibold tracking-wider uppercase md:block text-slate-400">
            {section.label}
          </div>
          {/* Section Links */}
          <div className="flex gap-2 md:flex-col">
            {section.links.map(({ href, label, Icon }) => {
              const isActive = active === href;
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
          </div>
        </div>
      ))}
    </nav>
  );
}
