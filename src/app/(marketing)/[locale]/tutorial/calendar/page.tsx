import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import Footer from "@/components/Footer";
import CtaSection from "./CtaSection";
import ExamplesSection from "./ExamplesSection";
import HeroSection from "./HeroSection";
import InteractionSection from "./InteractionSection";
import OverviewSection from "./OverviewSection";
import StepsSection from "./StepsSection";
import TipsSection from "./TipsSection";

type CalendarTutorialPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: CalendarTutorialPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "tutorialCalendar.meta",
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "https://www.fishon.my/tutorial/calendar" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://www.fishon.my/tutorial/calendar",
      type: "website",
      siteName: "Fishon.my",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: { index: true, follow: true },
  };
}

export default function CalendarTutorialPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      <HeroSection />
      <OverviewSection />
      <InteractionSection />
      <StepsSection />
      <ExamplesSection />
      <TipsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
