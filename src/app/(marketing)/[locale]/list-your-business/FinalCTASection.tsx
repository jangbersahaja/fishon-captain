"use client";

import {
  BadgeCheck,
  FilePenLine,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const WHATSAPP_NUMBER = "60165304304";

export default function FinalCTASection() {
  const t = useTranslations("marketing.finalCta");
  return (
    <section className="relative bg-[#EC2227] overflow-hidden">
      {/* Subtle pattern background */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-20"
        aria-hidden
      >
        <svg
          width="100%"
          height="100%"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      <div className="relative flex flex-col items-center justify-between w-full gap-20 px-4 pb-64 mx-auto text-white max-w-7xl pt-44 sm:px-6 lg:px-8 sm:flex-row">
        {/* Stat Showcase Row - tweaked for more contrast and icons */}
        <div className="grid flex-1 w-full grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <Users className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">
              {t("stats.0.value")}
            </div>
            <div className="text-xs font-medium text-neutral-700">
              {t("stats.0.label")}
            </div>
          </div>
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <BadgeCheck className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">
              {t("stats.1.value")}
            </div>
            <div className="text-xs font-medium text-neutral-700">
              {t("stats.1.label")}
            </div>
          </div>
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <ShieldCheck className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">
              {t("stats.2.value")}
            </div>
            <div className="text-xs font-medium text-neutral-700">
              {t("stats.2.label")}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center flex-1 gap-6 sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold md:text-3xl drop-shadow-lg">
              {t("title")}
            </h3>
            <p className="mt-1 text-base text-white/90 md:text-lg">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/auth?next=/captain/form"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#EC2227] shadow-lg hover:bg-white/90 text-base transition"
            >
              <FilePenLine className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              {t("ctaPrimary")}
            </Link>
            <Link
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Saya%20nak%20join%20Fishon%20Captain`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 text-base font-semibold text-white transition border shadow-lg rounded-xl border-white/40 hover:bg-white/10"
            >
              <MessageCircle className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
