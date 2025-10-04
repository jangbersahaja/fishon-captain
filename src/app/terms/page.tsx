import type { Metadata } from "next";
import TermsInteractive from "./TermsInteractive";

export const metadata: Metadata = {
  title: "Terms of Service | Fishon",
  robots: { index: false, follow: false },
  description:
    "Terms of Service for Fishon.my – Malaysia's fishing charter booking platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="relative isolate">
      {/* Hero / Header */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Last updated: 1 October 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-12 prose prose-slate dark:prose-invert prose-headings:scroll-mt-24">
        <p className="not-prose text-sm text-slate-500 mb-8">
          Welcome to Fishon.my, Malaysia’s first online fishing charter booking
          platform. Fishon.my is owned and operated by Kartel Motion Venture
          (Business Registration No: 202203267096 (003441013-T))
          (&quot;Fishon&quot;, &quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;). By using our website, mobile app, or any related
          services (collectively, the &quot;Platform&quot;), you agree to be
          bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree to these Terms, please do not access or use Fishon.my.
        </p>

        <hr className="my-10 border-slate-200" />
        <TermsInteractive />
      </div>
    </div>
  );
}
