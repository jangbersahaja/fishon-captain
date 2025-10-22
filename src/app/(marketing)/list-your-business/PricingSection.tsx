import { Plan } from "./ListYourBusinessUI";

export default function PricingSection() {
  return (
    <section className="w-full px-4 mx-auto max-w-7xl py-15 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full mx-auto mb-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-center md:text-3xl lg:text-4xl">
          Pricing
        </h2>
        <p className="mt-2 text-base text-neutral-700 md:text-lg">
          Free to list. 10% commission on successful bookings.
        </p>
        <p className="mt-1 text-sm text-neutral-500">More tiers coming soon.</p>
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
