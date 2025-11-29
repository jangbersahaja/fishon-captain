"use client";

import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  MousePointerClick,
  Plus,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";

const STEPS_COUNT = 6;

const stepIcons = [
  MousePointerClick,
  Layers,
  FileText,
  CalendarDays,
  Clock,
  Save,
];

export default function StepsSection() {
  const t = useTranslations("tutorialCalendar.steps");

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
            {t("subtitle")}
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="mt-12 space-y-0">
          {Array.from({ length: STEPS_COUNT }).map((_, index) => {
            const Icon = stepIcons[index];
            return (
              <div key={index} className="relative flex gap-4 md:gap-6">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EC2227] text-lg font-bold text-white shadow-lg md:h-12 md:w-12">
                    {t(`list.${index}.step`)}
                  </div>
                  {index < STEPS_COUNT - 1 && (
                    <div className="h-full w-0.5 bg-gradient-to-b from-[#EC2227] to-[#EC2227]/20" />
                  )}
                </div>

                {/* Content */}
                <div className="group flex-1 pb-8 md:pb-10">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#EC2227]/30 hover:shadow-md md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EC2227]/10">
                        <Icon className="h-5 w-5 text-[#EC2227]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 md:text-xl">
                          {t(`list.${index}.title`)}
                        </h3>
                        <p className="mt-2 text-gray-600">
                          {t(`list.${index}.description`)}
                        </p>

                        {/* Modal Preview / Visual Aid */}
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                            {t(`list.${index}.visualLabel`)}
                          </p>
                          <div className="text-sm text-gray-700 space-y-2">
                            {/* Render visual content based on step */}
                            {index === 0 && (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm">
                                  <Plus className="h-4 w-4 text-[#EC2227]" />
                                  <span className="font-medium">
                                    {t(`list.${index}.visual.button`)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                  {t(`list.${index}.visual.hint`)}
                                </p>
                              </div>
                            )}
                            {index === 1 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded-full border-2 border-[#EC2227] flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-[#EC2227]" />
                                  </div>
                                  <span>
                                    {t(`list.${index}.visual.option1`)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                  <span>
                                    {t(`list.${index}.visual.option2`)}
                                  </span>
                                </div>
                              </div>
                            )}
                            {index === 2 && (
                              <div className="space-y-2">
                                <div className="rounded-md bg-white border border-gray-200 px-3 py-2">
                                  <select
                                    className="w-full bg-transparent text-sm text-gray-700 outline-none"
                                    disabled
                                  >
                                    <option>
                                      {t(`list.${index}.visual.placeholder`)}
                                    </option>
                                  </select>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <span
                                      key={i}
                                      className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs"
                                    >
                                      {t(`list.${index}.visual.reasons.${i}`)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {index === 3 && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-md bg-white border border-gray-200 px-3 py-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {t(`list.${index}.visual.startLabel`)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm">
                                        15/12/2025
                                      </span>
                                    </div>
                                  </div>
                                  <div className="rounded-md bg-white border border-gray-200 px-3 py-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {t(`list.${index}.visual.endLabel`)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm">
                                        17/12/2025
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded border border-[#EC2227] bg-[#EC2227] flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-sm">
                                    {t(`list.${index}.visual.multiDay`)}
                                  </span>
                                </div>
                              </div>
                            )}
                            {index === 4 && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-md bg-white border border-gray-200 px-3 py-2">
                                  <span className="text-sm">
                                    {t(`list.${index}.visual.toggle`)}
                                  </span>
                                  <div className="h-5 w-9 rounded-full bg-[#EC2227] relative">
                                    <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-md bg-white border border-gray-200 px-3 py-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {t(`list.${index}.visual.startTime`)}
                                    </p>
                                    <span className="text-sm font-medium">
                                      08:00
                                    </span>
                                  </div>
                                  <div className="rounded-md bg-white border border-gray-200 px-3 py-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {t(`list.${index}.visual.endTime`)}
                                    </p>
                                    <span className="text-sm font-medium">
                                      14:00
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {index === 5 && (
                              <div className="space-y-3">
                                <div className="flex justify-end">
                                  <div className="inline-flex items-center gap-2 rounded-md bg-[#EC2227] px-4 py-2 text-white text-sm font-medium">
                                    <Save className="h-4 w-4" />
                                    {t(`list.${index}.visual.button`)}
                                  </div>
                                </div>
                                <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-green-700 text-sm flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t(`list.${index}.visual.success`)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
