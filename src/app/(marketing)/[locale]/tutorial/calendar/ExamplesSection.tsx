"use client";

import { Anchor, Calendar, Clock, Phone, Umbrella, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

const EXAMPLES_COUNT = 4;

const exampleIcons = [Phone, Wrench, Umbrella, Anchor];
const exampleColors = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    iconBg: "bg-blue-100",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    iconBg: "bg-amber-100",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    iconBg: "bg-purple-100",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    iconBg: "bg-green-100",
  },
];

export default function ExamplesSection() {
  const t = useTranslations("tutorialCalendar.examples");

  return (
    <section className="py-16 bg-white md:py-20">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto mt-4 text-lg text-gray-600">
            {t("subtitle")}
          </p>
        </div>

        {/* Examples Grid */}
        <div className="grid gap-6 mt-12 md:grid-cols-2">
          {Array.from({ length: EXAMPLES_COUNT }).map((_, index) => {
            const Icon = exampleIcons[index];
            const colors = exampleColors[index];

            return (
              <div
                key={index}
                className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 md:p-8`}
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t(`list.${index}.title`)}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {t(`list.${index}.scenario`)}
                    </p>
                  </div>
                </div>

                {/* How to block */}
                <div className="p-4 mt-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                  <p className="mb-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    {t(`list.${index}.howToLabel`)}
                  </p>

                  <div className="space-y-3">
                    {/* Block Type */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {t("fields.blockType")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {t(`list.${index}.blockType`)}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {t("fields.reason")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {t(`list.${index}.reason`)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t("fields.date")}</span>
                      <span className="flex items-center gap-1 font-medium text-gray-900">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {t(`list.${index}.date`)}
                      </span>
                    </div>

                    {/* Time (if applicable) */}
                    {t.raw(`list.${index}.time`) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {t("fields.time")}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-gray-900">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {t(`list.${index}.time`)}
                        </span>
                      </div>
                    )}

                    {/* Trip (if applicable) */}
                    {t.raw(`list.${index}.trip`) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {t("fields.trip")}
                        </span>
                        <span className="font-medium text-gray-900">
                          {t(`list.${index}.trip`)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Preview */}
                <div className="p-3 mt-4 text-white bg-gray-900 rounded-lg">
                  <p className="mb-2 text-xs font-medium text-gray-400">
                    {t("calendarPreview")}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-sm">
                      {t(`list.${index}.calendarDisplay`)}
                    </span>
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
