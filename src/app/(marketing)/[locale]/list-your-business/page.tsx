import type { Metadata } from "next";

import Footer from "@/components/Footer";
import CaptainShowcaseSection from "./CaptainShowcaseSection";
import FAQSection from "./FAQSection";
import FinalCTASection from "./FinalCTASection";
import HeroSection from "./HeroSection";
import HowItWorksSection from "./HowItWorksSection";
import PricingSection from "./PricingSection";
import SafetyAwardsSection from "./SafetyAwardsSection";
import ValuePropsSection from "./ValuePropsSection";

export const metadata: Metadata = {
  title: "List Your Charter | Fishon.my",
  description:
    "Malaysia's #1 fishing charter booking platform. Publish your trips, reach local anglers, and start receiving high‑intent enquiries.",
  alternates: { canonical: "https://www.fishon.my/list-your-business" },
  openGraph: {
    title: "List Your Charter | Fishon.my",
    description:
      "Showcase your boat, trips, and prices to Malaysian anglers. Free to list. Verification for trust.",
    url: "https://www.fishon.my/list-your-business",
    type: "website",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "List Your Charter | Fishon.my",
    description:
      "Publish trips, showcase your boat, and get bookings from Malaysian anglers.",
  },
  robots: { index: true, follow: true },
};

export default function ListYourBusinessPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      <HeroSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <CaptainShowcaseSection />
      <PricingSection />
      <SafetyAwardsSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
