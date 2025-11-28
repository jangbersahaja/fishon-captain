"use client";

import { Camera, FileText, Tag, Calendar, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const tipIcons = [Camera, FileText, Tag, Calendar, Zap];

export default function TipsSection() {
  const t = useTranslations("tutorial.tips");

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
        </div>

        {/* Tips Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tipIcons.map((Icon, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-[#EC2227]/50 hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EC2227]/10">
                  <Icon className="h-5 w-5 text-[#EC2227]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {t(`list.${index}.title`)}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
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
