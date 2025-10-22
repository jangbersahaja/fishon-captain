const faq = [
  {
    q: "Do I need to pay to join?",
    a: "No. It's 100% free to list your charter. We only take a commission on successful bookings. Choose between Basic (10% commission) or Silver (20% commission) tier based on your needs.",
  },
  {
    q: "What verification do I need?",
    a: "We verify captains to build trust. You'll need: Maritime license/Seafarer ID (where applicable), boat registration certificate, vessel/public liability insurance, and first aid certification. This typically takes 3-5 business days.",
  },
  {
    q: "How will customers contact me?",
    a: "Customers reach you directly via WhatsApp, phone, or email—your choice. You manage communications directly without platform intermediaries. Full details on booking and cancellation policies are available in our Refund & Cancellation Policy.",
  },
  {
    q: "Can I manage my availability and bookings?",
    a: "Yes. Our platform lets you manage your availability and bookings. For detailed information on rescheduling and cancellations, check our Refund & Cancellation Policy and Terms of Service.",
  },
  {
    q: "How do you protect my data?",
    a: "We take data security seriously. All personal information is protected under Malaysia's Personal Data Protection Act (PDPA). See our Privacy Policy for complete details on how we collect, use, and safeguard your data.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 md:py-16 lg:py-20 sm:px-6 lg:px-8">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
        FAQs
      </h2>
      <div className="mt-6 divide-y rounded-2xl border border-neutral-200">
        {faq.map((f) => (
          <details
            key={f.q}
            className="group p-4 transition-colors hover:bg-neutral-50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-base md:text-lg font-medium">
              <span>{f.q}</span>
              <span
                aria-hidden
                className="text-neutral-400 transition-transform group-open:rotate-90"
              >
                ›
              </span>
            </summary>
            <p className="mt-3 text-sm md:text-base text-neutral-700 leading-relaxed">
              {f.a}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
