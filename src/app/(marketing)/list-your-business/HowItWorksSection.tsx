import { Step } from "./ListYourBusinessUI";

export default function HowItWorksSection() {
  return (
    <section className="w-full px-4 pb-5 mx-auto max-w-7xl pt-15 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-center md:text-3xl lg:text-4xl">
        How it works
      </h2>
      <ol className="grid gap-4 mt-6 sm:grid-cols-3">
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
