"use client";

import FishonLogo from "@/assets/img/logo/fishon-logo-white.png";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavbarProps = {
  /** When true, navbar is transparent at the top and becomes solid on scroll. */
  transparentOnTop?: boolean;
};

export default function Navbar({ transparentOnTop = false }: NavbarProps) {
  const [open] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparentOnTop) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // initialize on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparentOnTop]);

  // Always fixed; choose color based on variant/state
  const base = "top-0 z-40 w-full text-white transition-colors duration-300";
  const solid =
    "bg-[#ec2227] backdrop-blur supports-[backdrop-filter]:bg-[#ec2227]";

  // If transparentOnTop is true, stay transparent at very top, become solid once scrolled or when menu is open.
  // If transparentOnTop is false, stay solid always.
  const headerClass = !transparentOnTop
    ? `${base} ${solid} `
    : open || scrolled
    ? `${base} ${solid} `
    : `${base} bg-transparent absolute`;

  return (
    <header className={headerClass}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Fishon.my home"
        >
          <span className="relative h-14 w-28">
            <Image
              src={FishonLogo}
              alt="Fishon"
              fill
              className="object-contain"
              priority
            />
          </span>
        </Link>
      </div>
    </header>
  );
}
