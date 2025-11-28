import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import Footer from "@/components/Footer";
import CtaSection from "./CtaSection";
import HeroSection from "./HeroSection";
import OverviewSection from "./OverviewSection";
import RequirementsSection from "./RequirementsSection";
import StepsSection from "./StepsSection";
import TipsSection from "./TipsSection";

type TutorialPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: TutorialPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutorial.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "https://www.fishon.my/tutorial" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://www.fishon.my/tutorial",
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

export default function TutorialPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      <HeroSection />
      <OverviewSection />
      <StepsSection />
      <TipsSection />
      <RequirementsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
