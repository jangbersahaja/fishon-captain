import type { Metadata } from "next";
import CaptainTermsInteractive from "./CaptainTermsInteractive";

export const metadata: Metadata = {
  title: "Captain Terms & Conditions | Fishon",
  robots: { index: false, follow: false },
  description:
    "Captain & Charter Operator Terms and Conditions governing participation on Fishon.my.",
};

export default function CaptainTermsPage() {
  return (
    <div className="relative isolate">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 flex items-center gap-2">
            Captain & Operator Terms
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Between Kartel Motion Ventures and Registered Captain / Charter
            Operator
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="mb-10 text-sm text-slate-500 leading-relaxed">
          <p>
            These Terms and Conditions (&quot;Agreement&quot;) govern the
            registration and participation of Captains and Charter Operators
            (&quot;You&quot; or &quot;Operator&quot;) on the Fishon.my platform.
            By registering as an Operator, you agree to comply with these terms,
            our platform policies, and all applicable Malaysian laws and
            regulations.
          </p>
        </div>
        <CaptainTermsInteractive />
      </div>
    </div>
  );
}
