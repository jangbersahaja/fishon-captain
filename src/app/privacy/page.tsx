import type { Metadata } from "next";
import PrivacyInteractive from "./PrivacyInteractive";

export const metadata: Metadata = {
  title: "Privacy Policy | Fishon",
  robots: { index: false, follow: false },
  description:
    "Privacy Policy for Fishon.my – how we collect, use, and protect your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="relative isolate">
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Last updated: 1 October 2025
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12 prose prose-slate dark:prose-invert prose-headings:scroll-mt-24">
        <p className="not-prose text-sm text-slate-500 mb-8">
          Fishon.my (&quot;Fishon&quot;, &quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) is operated by Kartel Motion Venture (Business
          Registration No: 202203267096 (003441013-T)). We respect your privacy
          and are committed to protecting your personal information in
          accordance with the Personal Data Protection Act 2010 (PDPA) of
          Malaysia. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your data when you use our website, mobile app, or
          related services (collectively, the &quot;Platform&quot;).
        </p>
        <hr className="my-10 border-slate-200" />
        <PrivacyInteractive />
      </div>
    </div>
  );
}
