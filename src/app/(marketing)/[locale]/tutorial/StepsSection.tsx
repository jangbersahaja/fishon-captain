"use client";

import { useTranslations } from "next-intl";

const STEPS_COUNT = 8;

export default function StepsSection() {
  const t = useTranslations("tutorial.steps");

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            {t("title")}
          </h2>
        </div>

        {/* Steps Timeline */}
        <div className="mt-12 space-y-0">
          {Array.from({ length: STEPS_COUNT }).map((_, index) => (
            <div key={index} className="relative flex gap-6">
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
              <div className="group pb-10">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#EC2227]/30 hover:shadow-md md:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 md:text-xl">
                    {t(`list.${index}.title`)}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {t(`list.${index}.description`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
