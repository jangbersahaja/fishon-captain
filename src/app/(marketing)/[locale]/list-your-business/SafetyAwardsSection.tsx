"use client";

import { Lock, Star, Trophy, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Award } from "./ListYourBusinessUI";

export default function SafetyAwardsSection() {
  const t = useTranslations("marketing.safety");
  return (
    <section className="bg-gradient-to-b from-[#EC2227] to-[#C41A1F]">
      <div className="w-full px-4 py-12 mx-auto text-white max-w-7xl md:py-16 lg:py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          {/* Left: Badges & Recognition */}
          <div className="flex-1">
            <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-right md:text-3xl lg:text-4xl">
              {t("badges.title")}
            </h2>
            <div className="grid gap-4 md:grid-cols-1">
              <Award
                Icon={Trophy}
                title={t("badges.items.0.title")}
                desc={t("badges.items.0.desc")}
                accent
              />
              <Award
                Icon={Star}
                title={t("badges.items.1.title")}
                desc={t("badges.items.1.desc")}
                accent
              />
              <Award
                Icon={Zap}
                title={t("badges.items.2.title")}
                desc={t("badges.items.2.desc")}
                accent
              />
            </div>
          </div>
          {/* Divider */}
          <div className="mx-0 my-6 border-t md:my-0 md:border-t-0 md:border-l border-white/30" />

          {/* Right: Safety & Legal Compliance */}
          <div className="flex-1">
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl">
              {t("compliance.title")}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/95">
              {t("compliance.description")}
            </p>

            {/* Verification Checklist */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-white/80">
                {t("compliance.verification.title")}
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-end gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>{t("compliance.verification.items.0")}</span>
                </li>
                <li className="flex items-end gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>{t("compliance.verification.items.1")}</span>
                </li>
                <li className="flex items-end gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>{t("compliance.verification.items.2")}</span>
                </li>
                <li className="flex items-end gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>{t("compliance.verification.items.3")}</span>
                </li>
                <li className="flex items-end gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>{t("compliance.verification.items.4")}</span>
                </li>
              </ul>
            </div>

            {/* Legal & Data Protection */}
            <div className="pt-6 space-y-3 text-sm border-t border-white/20">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="font-medium">{t("compliance.legal.0")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">{t("compliance.legal.1")}</span>
              </div>
              <div className="mt-4 text-xs text-white/70">
                <p className="mb-2">{t("compliance.learnMore")}</p>
                <div className="space-y-1">
                  <Link href="/terms" className="block hover:underline">
                    → Terms of Service
                  </Link>
                  <Link href="/privacy" className="block hover:underline">
                    → Privacy Policy
                  </Link>
                  <Link href="/refund-policy" className="block hover:underline">
                    → Refund & Cancellation Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
