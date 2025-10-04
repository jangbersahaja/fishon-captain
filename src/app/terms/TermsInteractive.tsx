"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface SectionDef {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: SectionDef[] = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <p>
        Fishon.my is an online platform that connects anglers
        (&quot;Users&quot;) with captains or charter operators
        (&quot;Operators&quot;) for recreational fishing trips and related
        experiences. Fishon does not own, manage, or operate the boats or trips
        listed on the Platform. We act solely as an intermediary to facilitate
        discovery, booking, and secure payment.
      </p>
    ),
  },
  {
    id: "account-registration",
    title: "Account Registration",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          To access certain features, you must create a Fishon.my account and
          provide accurate, complete, and current information.
        </li>
        <li>
          You are responsible for safeguarding your login credentials and any
          activity under your account.
        </li>
        <li>You must be at least 18 years old to register.</li>
        <li>
          Fishon reserves the right to suspend or terminate accounts that
          provide false information or violate these Terms.
        </li>
      </ul>
    ),
  },
  {
    id: "bookings-payments",
    title: "Bookings & Payments",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Users may browse, compare, and book fishing charters through the
          Platform.
        </li>
        <li>
          Payments are processed through Fishon’s secure payment gateway or
          authorized third-party partners.
        </li>
        <li>
          Upon successful payment, you will receive booking confirmation and
          trip details via email or the Platform.
        </li>
        <li>
          Operators are solely responsible for fulfilling their services as
          described.
        </li>
        <li>
          Fishon does not guarantee trip availability, quality, or outcomes of
          any charter experience.
        </li>
      </ul>
    ),
  },
  {
    id: "cancellations-refunds",
    title: "Cancellations & Refunds",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Cancellation and refund policies vary by Operator and are displayed
          during booking.
        </li>
        <li>
          In cases of trip cancellation due to weather, safety, or force
          majeure, Fishon will assist in coordinating refunds or rescheduling.
        </li>
        <li>Processing fees may apply depending on payment method.</li>
        <li>
          Fishon reserves the right to cancel any booking that violates our
          policies or involves fraudulent activity.
        </li>
      </ul>
    ),
  },
  {
    id: "usage-rules",
    title: "Platform Usage Rules",
    content: (
      <>
        <p>You agree not to:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            Use the Platform for unlawful, fraudulent, or harmful purposes.
          </li>
          <li>
            Upload, post, or transmit any offensive, defamatory, or misleading
            content.
          </li>
          <li>
            Interfere with the Platform’s operation, attempt unauthorized
            access, or disrupt servers.
          </li>
          <li>
            Copy, reproduce, or redistribute any part of the website without
            written consent.
          </li>
        </ol>
        <p>
          Fishon may remove content or suspend accounts that breach these rules.
        </p>
      </>
    ),
  },
  {
    id: "operator-listings",
    title: "Operator Listings",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Operators are independent service providers.</li>
        <li>
          They must ensure the accuracy of all listing information (price,
          location, packages, availability).
        </li>
        <li>
          Operators must hold valid licenses, permits, and insurance as required
          by law.
        </li>
        <li>
          Fishon is not responsible for any acts, omissions, or negligence by
          Operators.
        </li>
      </ul>
    ),
  },
  {
    id: "reviews-ratings",
    title: "Reviews & Ratings",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          After a trip, Users may leave ratings and reviews based on their
          experience.
        </li>
        <li>
          Reviews must be honest, respectful, and free of offensive content.
        </li>
        <li>
          Fishon reserves the right to moderate or remove reviews that violate
          these guidelines.
        </li>
      </ul>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          All trademarks, logos, text, graphics, images, and other content on
          Fishon.my are owned or licensed by Kartel Motion Venture.
        </li>
        <li>
          You may not use our brand elements or copy any content without prior
          written permission.
        </li>
        <li>
          Operators grant Fishon a non-exclusive license to use their photos,
          videos, and listing content for marketing purposes.
        </li>
      </ul>
    ),
  },
  {
    id: "limitation-liability",
    title: "Limitation of Liability",
    content: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Fishon.my acts only as an intermediary between Users and Operators.
        </li>
        <li>
          We are not liable for any accident, injury, property damage, loss, or
          dispute arising from a trip booked through the Platform.
        </li>
        <li>
          Fishon provides the Platform “as is”, without warranty of any kind.
        </li>
        <li>
          To the maximum extent permitted by law, our liability is limited to
          the amount of service fees paid to Fishon for the specific booking in
          question.
        </li>
      </ul>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    content: (
      <>
        <p>
          You agree to indemnify and hold harmless Kartel Motion Venture, its
          directors, employees, and partners from any claim, loss, damage, or
          expense arising from:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your use of the Platform,</li>
          <li>Your violation of these Terms, or</li>
          <li>Your infringement of another party’s rights.</li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    content: (
      <p>
        Your personal data will be collected, used, and protected in accordance
        with our Privacy Policy, available at{" "}
        <a
          href="https://www.fishon.my/privacy"
          target="_blank"
          rel="noreferrer"
          className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-500"
        >
          https://www.fishon.my/privacy
        </a>
        . By using the Platform, you consent to our data practices.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>Fishon may suspend or terminate your account at any time if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You breach these Terms,</li>
          <li>Engage in fraudulent activity, or</li>
          <li>Harm the Platform’s integrity or other users’ safety.</li>
        </ul>
        <p>
          You may also delete your account at any time via the user dashboard or
          by contacting{" "}
          <a
            href="mailto:support@fishon.my"
            className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-500"
          >
            support@fishon.my
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "modifications",
    title: "Modifications",
    content: (
      <p>
        Fishon may update or modify these Terms from time to time. Continued use
        of the Platform after changes are posted constitutes your acceptance of
        the updated Terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law",
    content: (
      <p>
        These Terms are governed by and construed in accordance with the laws of
        Malaysia. Any dispute arising under these Terms shall be subject to the
        exclusive jurisdiction of the Malaysian courts.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>Kartel Motion Venture</p>
        <p>
          Email:{" "}
          <a
            href="mailto:support@fishon.my"
            className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-500"
          >
            support@fishon.my
          </a>
        </p>
        <p>
          Website:{" "}
          <a
            href="https://www.fishon.my"
            target="_blank"
            rel="noreferrer"
            className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-500"
          >
            https://www.fishon.my
          </a>
        </p>
      </>
    ),
  },
];

export default function TermsInteractive() {
  // Collapse state with persistence
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined")
      return sections.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.id] = true;
        return acc;
      }, {});
    try {
      const raw = localStorage.getItem("fishon:terms:collapse");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        // ensure any new sections default to true
        sections.forEach((s) => {
          if (typeof parsed[s.id] !== "boolean") parsed[s.id] = true;
        });
        return parsed;
      }
    } catch {
      /* ignore parse errors */
    }
    return sections.reduce<Record<string, boolean>>((acc, s) => {
      acc[s.id] = true;
      return acc;
    }, {});
  });
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [showTop, setShowTop] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Persist collapse changes
  useEffect(() => {
    try {
      localStorage.setItem("fishon:terms:collapse", JSON.stringify(openStates));
    } catch {
      /* noop */
    }
  }, [openStates]);

  // Scrollspy with tuned thresholds and root margin (accounting for header height ~80px + spacing)
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>("[data-term-heading]")
    );
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry closest to top that is intersecting
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          // sort by boundingClientRect.top
          visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          const id = visible[0].target.getAttribute("data-term-heading-id");
          if (id) setActiveId(id);
        }
      },
      {
        // Start tracking a bit before the heading reaches top (offset -96px)
        rootMargin: "-96px 0px -70% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = (id: string) => {
    setOpenStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollWithOffset = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 96; // approximate combined navbar + spacing height
    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    window.scrollTo({ top: absoluteTop - headerOffset, behavior: "smooth" });
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
        {/* Main sections */}
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggle(s.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${s.id}-content`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#ec2227]/40"
                    >
                      {isOpen ? i + 1 : "+"}
                    </button>
                    <h2
                      data-term-heading
                      data-term-heading-id={s.id}
                      className="text-xl font-semibold text-slate-900 flex items-start gap-2"
                    >
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
            <p className="mb-2 font-medium text-slate-800">Disclaimer</p>
            <p>
              This Terms of Service page is provided for informational purposes
              and does not constitute legal advice. For specific legal concerns,
              please consult a qualified attorney.
            </p>
          </div>
        </div>

        {/* Aside TOC */}
        <aside className="hidden lg:block sticky top-28 h-fit self-start">
          <nav
            aria-label="Table of contents"
            className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Contents
            </p>
            <ol className="list-none pl-5 space-y-2 text-sm">
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

      {/* Mobile floating TOC trigger */}
      <details className="lg:hidden group mt-10 border border-slate-200 rounded-lg bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Contents</span>
          <span className="text-xs text-slate-500 group-open:hidden">Show</span>
          <span className="text-xs text-slate-500 hidden group-open:inline">
            Hide
          </span>
        </summary>
        <div className="px-4 pb-4">
          <ol className="list-none pl-5 space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-slate-600 hover:text-slate-900"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollWithOffset(s.id);
                    const details =
                      (e.currentTarget.closest(
                        "details"
                      ) as HTMLDetailsElement) || null;
                    if (details) details.open = false;
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

      {/* Back to top button */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#ec2227] px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-[#ec2227]/40 hover:bg-[#d41e22] focus:outline-none focus:ring-4 focus:ring-[#ec2227]/30"
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
