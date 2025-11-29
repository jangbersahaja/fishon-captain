"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function CtaSection() {
  const t = useTranslations("tutorialCalendar.cta");

  return (
    <section className="bg-gradient-to-br from-[#EC2227] to-[#B91C1C] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            {t("subtitle")}
          </p>

          <Link
            href="/captain/calendar"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-[#EC2227] shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
          >
            {t("button")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
