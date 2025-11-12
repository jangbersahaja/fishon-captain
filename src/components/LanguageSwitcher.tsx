"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Only show on marketing pages - detect by pathname
  // With [locale] structure, pathname will be like "/list-your-business" or "/en/list-your-business"
  const isMarketingPage =
    pathname === "/list-your-business" ||
    pathname.startsWith("/en/list-your-business") ||
    pathname.startsWith("/ms/list-your-business");

  if (!isMarketingPage) {
    return null;
  }

  // Determine current locale from pathname
  const locale = pathname.startsWith("/en") ? "en" : "ms";

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Set cookie for locale preference
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // Handle path transformation based on current and target locale
      let newPath = pathname;

      // If currently on /en/*, remove the prefix
      if (pathname.startsWith("/en")) {
        newPath = pathname.slice(3) || "/";
      }

      // If switching to English, add /en prefix
      if (newLocale === "en" && !newPath.startsWith("/en")) {
        newPath = `/en${newPath}`;
      }

      router.push(newPath);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2 py-1">
      <button
        onClick={() => switchLocale("ms")}
        disabled={isPending || locale === "ms"}
        className={`px-2 py-0.5 text-xs font-medium rounded-full transition ${
          locale === "ms"
            ? "bg-white text-[#ec2227]"
            : "text-white hover:bg-white/20"
        }`}
        aria-label="Switch to Malay"
      >
        MS
      </button>
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending || locale === "en"}
        className={`px-2 py-0.5 text-xs font-medium rounded-full transition ${
          locale === "en"
            ? "bg-white text-[#ec2227]"
            : "text-white hover:bg-white/20"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
