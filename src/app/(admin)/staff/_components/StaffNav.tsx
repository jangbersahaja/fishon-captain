"use client";

import {
  Anchor,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const links = [
  { href: "/staff", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/staff/registrations", label: "Registrations", Icon: Users },
  { href: "/staff/verification", label: "Verification", Icon: IdCard },
  { href: "/staff/charters", label: "Charters", Icon: Anchor },
  { href: "/staff/media", label: "Media", Icon: ImageIcon },
  { href: "/staff/security", label: "Security", Icon: Shield },
];

export default function StaffNav() {
  const pathname = usePathname();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);

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
