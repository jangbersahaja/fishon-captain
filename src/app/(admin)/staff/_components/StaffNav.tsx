"use client";

import {
  Anchor,
  Building,
  DollarSign,
  IdCard,
  Image as ImageIcon,
  LayoutDashboard,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const links = [
  { href: "/staff", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/staff/users", label: "Users & Registrations", Icon: Users },
  { href: "/staff/verification", label: "Verification", Icon: IdCard },
  { href: "/staff/charters", label: "Charters", Icon: Anchor },
  { href: "/staff/media", label: "Media", Icon: ImageIcon },
  { href: "/staff/promo-codes", label: "Promo Codes", Icon: Tag },
  { href: "/staff/finance", label: "Finance", Icon: Building },
  { href: "/staff/pricing", label: "Pricing", Icon: DollarSign },
  { href: "/staff/security", label: "Security", Icon: Shield },
];

export default function StaffNav() {
  const pathname = usePathname();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);

  return (
    <nav className="flex gap-2 p-4 overflow-x-auto text-sm md:py-8 md:px-5 md:flex-col md:overflow-visible">
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
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
