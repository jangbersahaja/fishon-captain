"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HeroSection() {
  const t = useTranslations("tutorial.hero");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#EC2227] to-[#B91C1C] py-16 md:py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <BookOpen className="h-4 w-4" />
            {t("badge")}
          </div>

          {/* Title */}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {t("title")}
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 md:text-xl">
            {t("subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}
