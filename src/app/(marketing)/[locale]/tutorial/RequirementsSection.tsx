"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

const REQUIREMENTS_COUNT = 7;

export default function RequirementsSection() {
  const t = useTranslations("tutorial.requirements");

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
              {t("title")}
            </h2>
          </div>

          {/* Requirements List */}
          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
            <ul className="space-y-4">
              {Array.from({ length: REQUIREMENTS_COUNT }).map((_, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#EC2227]" />
                  <span className="text-gray-700">{t(`items.${index}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
