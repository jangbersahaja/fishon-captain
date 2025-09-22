import type { Metadata } from "next";
import FormSection from "./_components/FormSection";

export const metadata: Metadata = {
  title: "Register Your Charter | FishOn.my",
  description:
    "List your fishing charter on FishOn.my. Add trips, pricing, photos, boat details, policies, and more.",
  alternates: { canonical: "https://www.fishon.my/captains/register" },
  openGraph: {
    title: "Register Your Charter | FishOn.my",
    description:
      "Add your listing with trips, photos, boat details, and policies. Start getting bookings today.",
    url: "https://www.fishon.my/captains/register",
    type: "website",
    siteName: "FishOn.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "Register Your Charter | FishOn.my",
    description:
      "Add your listing with trips, photos, boat details, and policies.",
  },
};

export default function CharterRegisterPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Become Our First <span className="text-[#EC2227]">Charter</span>
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-700">
            Captain, get ready to set sail. Our website is almost here. Register
            you interest now and get paid as soon as we launch out website.
          </p>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-lg mb-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">
              FishOn Charter Partner Program
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Share your charter details in minutes
            </h1>
            <p className="text-sm sm:text-base sm:leading-7 text-white/80">
              We&apos;ll review your submission, craft a listing, and connect
              you with anglers when we launch. All information is kept private
              until you approve the final listing.
            </p>
          </div>
        </section>

        <FormSection />
      </div>
    </main>
  );
}
