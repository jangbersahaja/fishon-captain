"use client";
import { useEffect, useState } from "react";

interface SectionDef {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: SectionDef[] = [
  {
    id: "introduction",
    title: "Introduction",
    content: (
      <p>
        These Terms and Conditions (&quot;Agreement&quot;) govern the
        registration and participation of Captains and Charter Operators
        (&quot;You&quot; or &quot;Operator&quot;) on the Fishon.my platform,
        owned and operated by Kartel Motion Venture (Company Registration No:
        [insert no.]) (&quot;We&quot;, &quot;Us&quot;, or &quot;Fishon&quot;).
        By registering as an Operator, you agree to comply with these terms, our
        platform policies, and all applicable Malaysian laws and regulations.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>
          You must be at least 18 years old and hold all valid licenses required
          by local maritime authorities.
        </li>
        <li>You must submit verifiable documents, including:</li>
        <li className="ml-4 list-[circle]">Business Registration (SSM)</li>
        <li className="ml-4 list-[circle]">
          Boat Registration Certificate (if applicable)
        </li>
        <li className="ml-4 list-[circle]">Seafarer’s ID or equivalent</li>
        <li className="ml-4 list-[circle]">
          Any supporting permits or competency certificates
        </li>
      </ul>
    ),
  },
  {
    id: "services-responsibilities",
    title: "Services & Responsibilities",
    content: (
      <div className="space-y-4">
        <p>
          Fishon.my provides an online booking and marketing platform that
          connects anglers with registered captains and operators.
        </p>
        <p>You are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>The safety and conduct of all passengers during trips.</li>
          <li>
            Accuracy of information submitted (pricing, packages, photos,
            availability).
          </li>
          <li>Compliance with maritime and insurance regulations.</li>
          <li>Timely response to booking requests and communications.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "commission-payment",
    title: "Commission & Payment",
    content: (
      <div className="space-y-4">
        <p>
          Fishon.my charges a commission per confirmed booking, according to
          your chosen package:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>10% — Standard Listing</li>
          <li>20% — Competitive Listing</li>
          <li>
            30% — Premium Listing (includes top listing, ad promotion, and
            content support)
          </li>
        </ul>
        <p>
          Payment from customers will be collected through Fishon’s secure
          payment gateway. Fishon will remit the remaining balance to you (after
          deduction of commission and applicable fees) within 3–5 working days
          after trip completion.
        </p>
      </div>
    ),
  },
  {
    id: "cancellation-refund",
    title: "Cancellation & Refund Policy",
    content: (
      <div className="space-y-4">
        <p>Cancellations by the Operator without valid reason may result in:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Deduction of deposit,</li>
          <li>Temporary suspension, or</li>
          <li>Permanent delisting from the platform.</li>
        </ul>
        <p>
          Refunds to customers are processed according to Fishon’s cancellation
          policy and may vary by situation (weather, safety, or force majeure).
        </p>
      </div>
    ),
  },
  {
    id: "safety-liability",
    title: "Safety & Liability",
    content: (
      <div className="space-y-4">
        <p>
          Safety of all participants is the Operator’s primary responsibility.
          You must ensure:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Proper safety equipment is onboard.</li>
          <li>The vessel is seaworthy and insured.</li>
          <li>Crew are trained for emergency and first aid situations.</li>
        </ul>
        <p>
          Fishon.my is not liable for any accident, injury, property loss, or
          dispute arising from trips arranged through the platform.
        </p>
      </div>
    ),
  },
  {
    id: "marketing-content",
    title: "Marketing & Content Rights",
    content: (
      <div className="space-y-4">
        <p>
          By registering, you grant Fishon.my the right to use your business
          name, images, videos, and trip details for marketing and promotional
          purposes. Operators may be featured in editorial articles,
          advertisements, and social media content.
        </p>
      </div>
    ),
  },
  {
    id: "reviews-ratings",
    title: "Reviews & Ratings",
    content: (
      <div className="space-y-4">
        <p>
          Fishon.my reserves the right to publish verified customer reviews.
          Repeated poor ratings or customer complaints may result in delisting
          after investigation.
        </p>
      </div>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <div className="space-y-4">
        <p>Fishon.my may suspend or terminate your account if you:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Breach these terms,</li>
          <li>Submit false information, or</li>
          <li>
            Engage in any conduct harmful to users or the platform’s reputation.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "legal-jurisdiction",
    title: "Legal Jurisdiction",
    content: (
      <p>
        This Agreement is governed by the laws of Malaysia, and any disputes
        shall be subject to the jurisdiction of the Malaysian courts.
      </p>
    ),
  },
];

export default function CaptainTermsInteractive() {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined")
      return sections.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.id] = true;
        return acc;
      }, {});
    try {
      const raw = localStorage.getItem("fishon:captain-terms:collapse");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        sections.forEach((s) => {
          if (typeof parsed[s.id] !== "boolean") parsed[s.id] = true;
        });
        return parsed;
      }
    } catch {}
    return sections.reduce<Record<string, boolean>>((acc, s) => {
      acc[s.id] = true;
      return acc;
    }, {});
  });
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        "fishon:captain-terms:collapse",
        JSON.stringify(openStates)
      );
    } catch {}
  }, [openStates]);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>("[data-captain-terms-heading]")
    );
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          const id = visible[0].target.getAttribute(
            "data-captain-terms-heading-id"
          );
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  const toggle = (id: string) =>
    setOpenStates((prev) => ({ ...prev, [id]: !prev[id] }));
  const scrollWithOffset = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 96;
    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    window.scrollTo({ top: absoluteTop - headerOffset, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="grid gap-12 xl:grid-cols-[1fr_260px]">
        <div>
          <ol className="space-y-10 list-none">
            {sections.map((s, i) => {
              const isOpen = openStates[s.id];
              return (
                <li
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-28 border-b border-slate-200 pb-6 last:border-none last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggle(s.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${s.id}-content`}
                      className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#ec2227]/40"
                    >
                      {isOpen ? "−" : "+"}
                    </button>
                    <h2
                      data-captain-terms-heading
                      data-captain-terms-heading-id={s.id}
                      className="text-xl font-semibold text-slate-900 flex items-start gap-2"
                    >
                      <span className="inline-block rounded bg-slate-900/5 px-2 py-0.5 text-xs font-medium tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200 min-w-[2ch] text-center">
                        {i + 1}
                      </span>
                      <span>{s.title}</span>
                    </h2>
                  </div>
                  <div
                    id={`${s.id}-content`}
                    className={`mt-4 overflow-hidden transition-all duration-300 ${
                      isOpen
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="prose-sm sm:prose-base text-slate-700 leading-relaxed">
                      {s.content}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            <p className="mb-2 font-medium text-slate-800">Note</p>
            <p>
              This Captain & Charter Operator Agreement is provided for clarity
              and does not replace formal legal advice. For legal
              interpretation, please consult a qualified professional.
            </p>
          </div>
        </div>
        <aside className="hidden xl:block sticky top-28 h-fit self-start">
          <nav
            aria-label="Table of contents"
            className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Contents
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id} className="marker:text-slate-400">
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollWithOffset(s.id);
                    }}
                    className={`group inline-flex items-start gap-2 transition-colors ${
                      activeId === s.id
                        ? "text-[#ec2227] font-medium"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="font-medium tabular-nums">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
      <details className="xl:hidden group mt-10 border border-slate-200 rounded-lg bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Contents</span>
          <span className="text-xs text-slate-500 group-open:hidden">Show</span>
          <span className="text-xs text-slate-500 hidden group-open:inline">
            Hide
          </span>
        </summary>
        <div className="px-4 pb-4">
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-slate-600 hover:text-slate-900"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollWithOffset(s.id);
                    const d =
                      (e.currentTarget.closest(
                        "details"
                      ) as HTMLDetailsElement) || null;
                    if (d) d.open = false;
                  }}
                >
                  <span className="font-medium tabular-nums mr-1">
                    {i + 1}.
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </details>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#ec2227] px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-[#ec2227]/40 hover:bg-[#d41e22] focus:outline-none focus:ring-4 focus:ring-[#ec2227]/30"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
