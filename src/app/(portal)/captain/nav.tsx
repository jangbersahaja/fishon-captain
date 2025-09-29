"use client";
import {
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

const links = [
  { href: "/captain/verification", label: "Verification", Icon: IdCard },
  { href: "/captain", label: "Overview", Icon: LayoutDashboard },
  { href: "/captain/media", label: "Media", Icon: ImageIcon },
  { href: "/captain/settings", label: "Settings", Icon: SettingsIcon },
  { href: "/captain/support", label: "Support", Icon: LifeBuoy },
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
    <nav className="p-4 md:py-8 md:px-5 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible text-sm">
      {links.map(({ href, label, Icon }) => {
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
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
