import { Step } from "./ListYourBusinessUI";

export default function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-15 pb-5 sm:px-6 lg:px-8">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
        How it works
      </h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        <Step
          n={1}
          title="Tell us about your charter"
          desc="Location, boat/capacity, trip types, photos and pricing."
        />
        <Step
          n={2}
          title="Verification & go live"
          desc="Basic checks (business/boat docs, insurance) for trust."
        />
        <Step
          n={3}
          title="Get enquiries & bookings"
          desc="Manage leads via WhatsApp/phone/email. Calendar is coming soon."
        />
      </ol>
    </section>
  );
}
