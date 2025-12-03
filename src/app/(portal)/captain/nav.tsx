"use client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import {
  BarChart3,
  Bell,
  BookCheck,
  Calendar,
  DollarSign,
  Gift,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Settings as SettingsIcon,
  Ship,
  Sliders,
  Star,
  Store,
  User,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export type NavLink = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export type NavSection = {
  label: string;
  links: NavLink[];
};

export const navSections: NavSection[] = [
  {
    label: "Dashboard",
    links: [{ href: "/captain", label: "Overview", Icon: LayoutDashboard }],
  },
  {
    label: "Configuration",
    links: [
      { href: "/captain/charters", label: "Charters", Icon: Ship },
      { href: "/captain/boats", label: "Boats", Icon: Ship },
      { href: "/captain/trips", label: "Trips", Icon: Sliders },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/captain/bookings", label: "Bookings", Icon: BookCheck },
      { href: "/captain/calendar", label: "Calendar", Icon: Calendar },
    ],
  },
  {
    label: "Inbox",
    links: [
      { href: "/captain/messages", label: "Messages", Icon: MessageCircle },
      { href: "/captain/notifications", label: "Notifications", Icon: Bell },
    ],
  },
  {
    label: "Business",
    links: [
      { href: "/captain/earnings", label: "Earnings", Icon: DollarSign },
      { href: "/captain/referrals", label: "Referrals", Icon: Gift },
      { href: "/captain/reviews", label: "Reviews", Icon: Star },
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

// Helper to build href with adminUserId preserved
function buildHref(baseHref: string, adminUserId: string | null): string {
  if (adminUserId) {
    return `${baseHref}?adminUserId=${adminUserId}`;
  }
  return baseHref;
}

export function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAdminMode, adminUserId } = useEffectiveUser();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);
  const isNewCharterRegistration =
    active === "/captain/form" && !searchParams?.get("editCharterId");

  // Show minimal navigation during new charter registration
  if (isNewCharterRegistration) {
    return (
      <nav className="flex flex-col h-full text-sm">
        {/* Profile Section */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-10 h-10 overflow-hidden border rounded-full border-slate-200 bg-slate-100 shrink-0">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "Captain"}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-full h-full p-2 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900">
                {user?.name || "Captain"}
              </p>
              <p className="text-xs truncate text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Minimal Navigation for New Registration */}
        <div className="flex-1 px-5 py-2 overflow-y-auto">
          <div className="px-4 pb-2 text-xs font-semibold tracking-wider uppercase text-slate-400">
            Registration
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href="/list-your-business"
              className="rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 text-slate-600 hover:bg-slate-100"
            >
              <Store className="w-4 h-4" aria-hidden />
              Back to Landing Page
            </Link>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 mt-auto border-t border-slate-200">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 text-red-600 hover:bg-red-50 w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex flex-col h-full text-sm">
      {/* Admin Mode Banner */}
      {isAdminMode && (
        <div className="px-4 py-2 text-xs font-medium text-center text-orange-800 bg-orange-100 border-b border-orange-200">
          🛡️ Admin Mode
        </div>
      )}

      {/* Profile Section */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-10 h-10 overflow-hidden border rounded-full border-slate-200 bg-slate-100 shrink-0">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name || "Captain"}
                fill
                className="object-cover"
              />
            ) : (
              <User className="w-full h-full p-2 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-900">
              {user?.name || "Captain"}
            </p>
            <p className="text-xs truncate text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-5 py-2 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex > 0 ? "mt-6" : ""}>
            <div className="px-4 pb-2 text-xs font-semibold tracking-wider uppercase text-slate-400">
              {section.label}
            </div>
            <div className="flex flex-col gap-1">
              {section.links.map(({ href, label, Icon }) => {
                const isActive = active === href;
                const finalHref = buildHref(href, adminUserId);
                return (
                  <Link
                    key={href}
                    href={finalHref}
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
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-4 mt-auto border-t border-slate-200">
        <div className="flex flex-col gap-1">
          {isAdminMode ? (
            <Link
              href="/staff"
              className="rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 text-orange-600 hover:bg-orange-50"
            >
              <LogOut className="w-4 h-4" />
              Exit Admin Mode
            </Link>
          ) : (
            <>
              <Link
                href="https://www.fishon.my"
                target="_blank"
                className="rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 text-slate-600 hover:bg-slate-100"
              >
                <Store className="w-4 h-4" />
                Marketplace
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full px-4 py-1.5 font-medium transition whitespace-nowrap inline-flex items-center gap-2 text-red-600 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
