"use client";

import { useTranslations } from "next-intl";

export default function FAQSection() {
  const t = useTranslations("marketing.faq");

  const faq = [
    { q: t("items.0.q"), a: t("items.0.a") },
    { q: t("items.1.q"), a: t("items.1.a") },
    { q: t("items.2.q"), a: t("items.2.a") },
    { q: t("items.3.q"), a: t("items.3.a") },
    { q: t("items.4.q"), a: t("items.4.a") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="w-full px-4 py-12 mx-auto max-w-7xl md:py-16 lg:py-20 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-center md:text-3xl lg:text-4xl">
        {t("title")}
      </h2>
      <div className="mt-6 border divide-y rounded-2xl border-neutral-200">
        {faq.map((f) => (
          <details
            key={f.q}
            className="p-4 transition-colors group hover:bg-neutral-50"
          >
            <summary className="flex items-center justify-between text-base font-medium list-none cursor-pointer md:text-lg">
              <span>{f.q}</span>
              <span
                aria-hidden
                className="transition-transform text-neutral-400 group-open:rotate-90"
              >
                ›
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed md:text-base text-neutral-700">
              {f.a}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
