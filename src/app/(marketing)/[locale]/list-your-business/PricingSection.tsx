"use client";

import { useTranslations } from "next-intl";
import { Plan } from "./ListYourBusinessUI";

export default function PricingSection() {
  const t = useTranslations("marketing.pricing");
  return (
    <section className="w-full px-4 mx-auto max-w-7xl py-15 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full mx-auto mb-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-center md:text-3xl lg:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-2 text-base text-neutral-700 md:text-lg">
          {t("subtitle")}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{t("comingSoon")}</p>
      </div>
      <div className="mt-6">
        <Plan
          percent={t("plan.percent")}
          name={t("plan.name")}
          highlight
          points={[
            t("plan.features.0"),
            t("plan.features.1"),
            t("plan.features.2"),
            t("plan.features.3"),
            t("plan.features.4"),
            t("plan.features.5"),
            t("plan.features.6"),
            t("plan.features.7"),
            t("plan.features.8"),
          ]}
        />
      </div>
    </section>
  );
}
