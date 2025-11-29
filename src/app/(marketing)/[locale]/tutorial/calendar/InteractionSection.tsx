"use client";

import {
  CalendarCheck,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  List,
  Mouse,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";

const interactionIcons = [
  Mouse,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  CalendarCheck,
  CalendarX,
];

export default function InteractionSection() {
  const t = useTranslations("tutorialCalendar.interactions");

  return (
    <section className="bg-white py-16 md:py-20">
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

        {/* Interactions Grid */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interactionIcons.map((Icon, index) => (
            <div
              key={index}
              className="group relative flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#EC2227]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EC2227]/10">
                <Icon className="h-5 w-5 text-[#EC2227]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {t(`list.${index}.title`)}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {t(`list.${index}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
