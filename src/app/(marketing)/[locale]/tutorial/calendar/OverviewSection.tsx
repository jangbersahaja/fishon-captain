"use client";

import { CalendarDays, Eye, Lock, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

const featureIcons = [CalendarDays, Eye, Lock, Settings];

export default function OverviewSection() {
  const t = useTranslations("tutorialCalendar.overview");

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
            {t("description")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureIcons.map((Icon, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-[#EC2227]/50 hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EC2227]/10">
                  <Icon className="h-6 w-6 text-[#EC2227]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {t(`features.${index}.title`)}
                </h3>
                <p className="mt-2 text-gray-600">
                  {t(`features.${index}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
