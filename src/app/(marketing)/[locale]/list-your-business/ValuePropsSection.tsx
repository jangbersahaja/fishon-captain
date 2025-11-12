"use client";

import { AppWindow, Globe2, Megaphone, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Feature } from "./ListYourBusinessUI";

export default function ValuePropsSection() {
  const t = useTranslations("marketing.valueProps");

  return (
    <section className="bg-[#ec2227]">
      <div className="w-full px-4 mx-auto max-w-7xl py-15 sm:px-6 lg:px-8 ">
        <h2 className="text-2xl font-extrabold tracking-tight text-center text-white md:text-3xl lg:text-4xl">
          {t("title")}
        </h2>
        <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            Icon={Globe2}
            title={t("cards.0.title")}
            desc={t("cards.0.description")}
          />
          <Feature
            Icon={Megaphone}
            title={t("cards.1.title")}
            desc={t("cards.1.description")}
          />
          <Feature
            Icon={AppWindow}
            title={t("cards.2.title")}
            desc={t("cards.2.description")}
          />
          <Feature
            Icon={Users}
            title={t("cards.3.title")}
            desc={t("cards.3.description")}
          />
        </div>
      </div>
    </section>
  );
}
