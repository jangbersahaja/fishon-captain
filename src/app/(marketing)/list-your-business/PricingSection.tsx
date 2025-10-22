import { Plan } from "./ListYourBusinessUI";

export default function PricingSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-15 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Pricing
          </h2>
          <p className="mt-2 text-neutral-700 text-base md:text-lg">
            Free to list. 10% commission on successful bookings.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            More tiers coming soon.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-green-600" />
          Currently Available
        </div>
      </div>
      <div className="mt-6">
        <Plan
          percent="10%"
          name="Basic"
          highlight
          points={[
            "Google and Facebook Ads",
            "Dedicated account manager",
            "Listing charter",
            "24/7 support team",
            "Reviews to build online reputation",
            "Calendar to track booking",
            "Direct communication with client",
            "Tools to monitor performance",
            "Apps to manage business on the go (coming soon)",
          ]}
        />
      </div>
    </section>
  );
}
