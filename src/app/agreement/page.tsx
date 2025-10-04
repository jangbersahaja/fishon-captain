import type { Metadata } from "next";
import AgreementInteractive from "./AgreementInteractive";

export const metadata: Metadata = {
  title: "Captain & Charter Operator Agreement | Fishon",
  description:
    "Public Captain & Charter Operator Agreement governing participation on Fishon.my.",
  robots: { index: true, follow: true },
};

export default function AgreementPage() {
  return (
    <div className="relative isolate">
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <span role="img" aria-label="contract">📄</span>
            Captain & Operator Agreement
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Last updated: 4 October 2025
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 text-sm text-slate-500 leading-relaxed">
          <p>
            This publicly accessible Agreement sets out the obligations and
            standards for Captains and Charter Operators using Fishon.my. It
            supplements our core Platform Terms of Service and related policies
            (Privacy, Refund & Cancellation). Operators should review all
            documents to ensure full compliance.
          </p>
        </div>
        <AgreementInteractive />
      </div>
    </div>
  );
}
