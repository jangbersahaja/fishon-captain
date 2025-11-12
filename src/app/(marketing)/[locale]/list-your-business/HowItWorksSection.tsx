"use client";

import { useTranslations } from "next-intl";
import { Step } from "./ListYourBusinessUI";

export default function HowItWorksSection() {
  const t = useTranslations("marketing.howItWorks");

  return (
    <section className="w-full px-4 pb-5 mx-auto max-w-7xl pt-15 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-center md:text-3xl lg:text-4xl">
        {t("title")}
      </h2>
      <ol className="grid gap-4 mt-6 sm:grid-cols-3">
        <Step
          n={1}
          title={t("steps.0.title")}
          desc={t("steps.0.description")}
        />
        <Step
          n={2}
          title={t("steps.1.title")}
          desc={t("steps.1.description")}
        />
        <Step
          n={3}
          title={t("steps.2.title")}
          desc={t("steps.2.description")}
        />
      </ol>
    </section>
  );
}
