import type { Metadata } from "next";

import Footer from "@/components/Footer";
import CtaSection from "./CtaSection";
import HeroSection from "./HeroSection";
import OverviewSection from "./OverviewSection";
import RequirementsSection from "./RequirementsSection";
import StepsSection from "./StepsSection";
import TipsSection from "./TipsSection";

export const metadata: Metadata = {
  title: "How to Register Your Charter | Fishon.my",
  description:
    "Step-by-step guide to registering your fishing charter on Fishon.my - Malaysia's first charter booking platform.",
  alternates: { canonical: "https://www.fishon.my/tutorial" },
  openGraph: {
    title: "How to Register Your Charter | Fishon.my",
    description:
      "Learn how to list your charter on Malaysia's premier fishing charter booking platform.",
    url: "https://www.fishon.my/tutorial",
    type: "website",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Register Your Charter | Fishon.my",
    description:
      "Step-by-step guide to registering your fishing charter on Fishon.my",
  },
  robots: { index: true, follow: true },
};

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
