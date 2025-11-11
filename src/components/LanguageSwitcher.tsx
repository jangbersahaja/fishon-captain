"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Set cookie for locale preference
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // Handle URL updates
      let newPath = pathname;

      // Remove existing locale prefix if present
      if (pathname.startsWith("/en")) {
        newPath = pathname.slice(3) || "/";
      }

      // Add locale prefix for English only
      if (newLocale === "en") {
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
