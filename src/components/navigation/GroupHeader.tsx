"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

type NavLink = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type NavSection = {
  label: string;
  links: NavLink[];
};

interface GroupHeaderProps {
  navSections: NavSection[];
}

export function GroupHeader({ navSections }: GroupHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useMemo(() => pathname?.replace(/\/$/, "") || "", [pathname]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNewCharterRegistration =
    active === "/captain/form" && !searchParams?.get("editCharterId");

  // Find the current active group based on pathname
  const activeGroup = useMemo(() => {
    for (const section of navSections) {
      const hasActiveLink = section.links.some((link) => {
        if (link.href === "/captain") {
          return active === "/captain";
        }
        return active.startsWith(link.href);
      });
      if (hasActiveLink) {
        return section;
      }
    }
    return null;
  }, [active, navSections]);

  // Scroll active item into view on mount/change
  useEffect(() => {
    if (scrollRef.current) {
      const activeItem = scrollRef.current.querySelector(
        '[data-active="true"]'
      );
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [active]);

  // Hide group header during new charter registration
  if (isNewCharterRegistration) {
    return null;
  }

  if (!activeGroup) {
    return null;
  }

  if (activeGroup.links.length < 2) {
    return null;
  }

  return (
    <div className="bg-[#ec2227] md:hidden rounded-b-2xl mx-1">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-2 py-2 overflow-x-auto scrollbar-hide"
      >
        {activeGroup.links.map(({ href, label, Icon }) => {
          const isActive =
            active === href || (href !== "/captain" && active.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-active={isActive}
              className={
                "flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all " +
                (isActive
                  ? "bg-white text-[#ec2227] shadow-md"
                  : "text-white/90 hover:text-white hover:bg-white/10")
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
