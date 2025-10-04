"use client";
import { useEffect, useState } from "react";

interface SectionDef {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: SectionDef[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: (
      <div className="space-y-6">
        <p>
          We collect personal and non-personal data in the following ways. This
          section describes what you provide, what we collect automatically, and
          what we receive from third parties.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
              <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
                1.1
              </span>
              <span>Information You Provide</span>
            </h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              When you create an account, book a charter, or register as an
              operator, we may collect:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Identification details (e.g., IC or license number)</li>
              <li>
                Business registration (SSM) or permit documents (for
                captains/operators)
              </li>
              <li>
                Payment information (e.g., transaction IDs, bank account for
                payouts)
              </li>
              <li>Any communications or feedback submitted to Fishon.my</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
              <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
                1.2
              </span>
              <span>Automatically Collected Information</span>
            </h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              When you browse our website or app, we may automatically collect:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>Device and browser information</li>
              <li>IP address and geolocation data</li>
              <li>Access times and pages viewed</li>
              <li>Cookies and tracking data (see Section 7)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
              <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
                1.3
              </span>
              <span>Third-Party Data</span>
            </h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              We may receive information from:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>Payment gateways (e.g., SenangPay)</li>
              <li>Marketing partners or analytics tools</li>
              <li>Social login providers (Google, Facebook, Apple)</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "how-we-use",
    title: "How We Use Your Information",
    content: (
      <div className="space-y-4">
        <p>We use your personal data to:</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Create and manage your Fishon.my account</li>
          <li>Facilitate booking and payment transactions</li>
          <li>Verify captain/operator eligibility and documentation</li>
          <li>Communicate important updates or promotional offers</li>
          <li>Improve our services and user experience</li>
          <li>Handle inquiries, complaints, or disputes</li>
          <li>Comply with legal or regulatory obligations</li>
        </ol>
        <p className="text-sm text-slate-600">
          We will only use your personal data for the purposes stated above or
          for purposes directly related to them.
        </p>
      </div>
    ),
  },
  {
    id: "data-sharing",
    title: "Data Sharing & Disclosure",
    content: (
      <div className="space-y-4">
        <p>We may share your information with:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <span className="font-medium">Operators (Captains/Charters):</span>{" "}
            to process your booking and communicate trip details
          </li>
          <li>
            <span className="font-medium">Payment Providers:</span> to process
            transactions securely
          </li>
          <li>
            <span className="font-medium">Marketing Partners:</span> for
            advertising or promotional campaigns (with your consent)
          </li>
          <li>
            <span className="font-medium">Law Enforcement or Regulators:</span>{" "}
            if required by law or for fraud prevention
          </li>
        </ul>
        <p className="text-sm text-slate-600">
          We will never sell your personal data to any third party.
        </p>
      </div>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    content: (
      <div className="space-y-4">
        <p>
          We retain your data only as long as necessary to fulfill the purposes
          outlined in this Policy, or as required by law. When your data is no
          longer needed, we will securely delete or anonymize it.
        </p>
      </div>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    content: (
      <div className="space-y-4">
        <p>
          We implement appropriate technical and organizational safeguards to
          protect your information against:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Unauthorized access</li>
          <li>Accidental loss or damage</li>
          <li>Misuse or disclosure</li>
        </ul>
        <p className="text-sm leading-relaxed">
          Examples include encrypted payment processing, secure data
          transmission (HTTPS), and restricted staff access. However, no
          internet-based service can guarantee absolute security, and you agree
          to use the Platform at your own risk.
        </p>
      </div>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: (
      <div className="space-y-4">
        <p>Under the Malaysian PDPA, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Access your personal data held by us</li>
          <li>Correct any inaccurate or incomplete information</li>
          <li>
            Withdraw consent to data processing (which may affect your use of
            the Platform)
          </li>
          <li>Request deletion of your account and associated data</li>
        </ul>
        <p className="text-sm">
          You may exercise these rights by contacting us at{" "}
          <a
            href="mailto:support@fishon.my"
            className="underline decoration-slate-300 hover:decoration-slate-500"
          >
            support@fishon.my
          </a>
          . We may require verification to confirm your identity before
          processing such requests.
        </p>
      </div>
    ),
  },
  {
    id: "cookies-tracking",
    title: "Cookies & Tracking",
    content: (
      <div className="space-y-4">
        <p>Fishon.my uses cookies and similar technologies to:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Remember user preferences</li>
          <li>Improve website performance</li>
          <li>Analyze traffic and behavior for better service</li>
        </ul>
        <p className="text-sm">
          You may disable cookies in your browser settings, but certain features
          of the Platform may not function properly.
        </p>
      </div>
    ),
  },
  {
    id: "third-party-links",
    title: "Third-Party Links",
    content: (
      <div className="space-y-4">
        <p>
          Our Platform may contain links to third-party websites or services. We
          are not responsible for the privacy practices or content of these
          external sites. We encourage you to review their privacy policies
          separately.
        </p>
      </div>
    ),
  },
  {
    id: "international-transfer",
    title: "International Data Transfer",
    content: (
      <div className="space-y-4">
        <p>
          Although Fishon.my primarily operates in Malaysia, certain data may be
          processed or stored on servers outside Malaysia by our trusted service
          providers. We take reasonable steps to ensure all such transfers
          comply with PDPA standards for data protection.
        </p>
      </div>
    ),
  },
  {
    id: "policy-updates",
    title: "Updates to This Policy",
    content: (
      <div className="space-y-4">
        <p>
          We may revise this Privacy Policy from time to time. Any updates will
          be posted on this page with a new “Last Updated” date. Your continued
          use of the Platform after any changes constitutes your acceptance of
          the updated Policy.
        </p>
      </div>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    content: (
      <div className="space-y-2">
        <p>Kartel Motion Venture</p>
        <p>
          Email:{" "}
          <a
            href="mailto:support@fishon.my"
            className="underline decoration-slate-300 hover:decoration-slate-500"
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
            className="underline decoration-slate-300 hover:decoration-slate-500"
          >
            https://www.fishon.my
          </a>
        </p>
      </div>
    ),
  },
];

export default function PrivacyInteractive() {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined")
      return sections.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.id] = true;
        return acc;
      }, {});
    try {
      const raw = localStorage.getItem("fishon:privacy:collapse");
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
        "fishon:privacy:collapse",
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
      document.querySelectorAll<HTMLElement>("[data-privacy-heading]")
    );
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          const id = visible[0].target.getAttribute("data-privacy-heading-id");
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
      <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
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
                      data-privacy-heading
                      data-privacy-heading-id={s.id}
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
            <p className="mb-2 font-medium text-slate-800">Note</p>
            <p>
              This Privacy Policy is provided for transparency and does not
              constitute legal advice. For legal interpretation, please consult
              a qualified professional.
            </p>
          </div>
        </div>
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
