"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StaffNav() {
  const pathname = usePathname();
  const items = [
    { href: "/staff", label: "Dashboard" },
    { href: "/staff/verification", label: "Verification" },
    { href: "/staff/charters", label: "Charters" },
    // Future: { href: "/staff/media", label: "Media" },
    // Future: { href: "/staff/reports", label: "Reports" },
  ];

  return (
    <nav className="flex items-center gap-4">
      {items.map((it) => {
        const active =
          pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              active
                ? "text-slate-900 font-medium"
                : "text-slate-600 hover:text-slate-900"
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
