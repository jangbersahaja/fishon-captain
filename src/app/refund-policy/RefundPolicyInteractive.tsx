"use client";
import { useEffect, useState } from "react";

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
      <div className="space-y-4">
        <p>
          Fishon.my acts as an online booking platform that connects anglers
          (customers) with captains and charter operators. All bookings are made
          directly between the customer and the operator, but Fishon.my
          facilitates secure payment and booking management.
        </p>
        <p>
          We aim to ensure transparency and fairness for both parties when
          cancellations or changes occur.
        </p>
      </div>
    ),
  },
  {
    id: "customer-cancellations",
    title: "Customer Cancellations",
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
            <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
              2.1
            </span>
            <span>Standard Cancellation</span>
          </h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
            <li>
              Customers may cancel a booking up to 7 days before the trip date
              for a full refund, minus any payment gateway or processing fees.
            </li>
            <li>
              Cancellations made within 7 days but more than 48 hours before the
              trip are eligible for a 50% refund.
            </li>
            <li>
              Cancellations made less than 48 hours before the trip are
              non-refundable.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
            <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
              2.2
            </span>
            <span>Last-Minute Emergencies</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            If cancellation is due to serious illness, accident, or other
            emergency, customers may submit proof (medical certificate, police
            report, etc.). Fishon will review such cases individually and may
            issue a partial refund or credit voucher at our discretion.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
            <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
              2.3
            </span>
            <span>No-Show Policy</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Failure to appear at the meeting location or time without notice is
            considered a no-show, and no refund will be provided.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "operator-cancellations",
    title: "Operator Cancellations",
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
            <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
              3.1
            </span>
            <span>Cancellation by Captain / Operator</span>
          </h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
            <li>
              The customer will receive a full refund, including service fees.
            </li>
            <li>
              Fishon may assist in rescheduling with the same or a comparable
              charter.
            </li>
            <li>
              Repeated cancellations by an operator may lead to suspension or
              removal from the platform.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2">
            <span className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200">
              3.2
            </span>
            <span>Weather & Safety Cancellations</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Trips cancelled due to bad weather, unsafe sea conditions, or force
            majeure (e.g., storms, government restrictions, natural disasters)
            will be treated as follows:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
            <li>
              Customers may choose to reschedule the trip (subject to
              availability), or
            </li>
            <li>
              Request a full refund of the trip amount (excluding optional
              add-ons already used or consumed).
            </li>
          </ul>
          <p className="mt-2 text-sm text-slate-600">
            Operators are responsible for informing customers and Fishon as
            early as possible if such cancellations are necessary.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "refund-processing",
    title: "Refund Processing",
    content: (
      <div className="space-y-4">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Refunds will be processed using the original payment method.</li>
          <li>
            Please allow 5–10 working days for the refund to appear in your
            account (depending on your bank or payment provider).
          </li>
          <li>
            All refunds are subject to verification and may include minor
            deductions for processing or transaction fees imposed by payment
            gateways.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "changes-rescheduling",
    title: "Changes & Rescheduling",
    content: (
      <div className="space-y-4">
        <p>
          Customers may request date changes directly through the Fishon
          platform or by contacting the operator.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            Requests made at least 72 hours before the trip are typically
            allowed without penalty.
          </li>
          <li>
            Changes made less than 72 hours before the trip depend on the
            operator’s availability and discretion.
          </li>
          <li>
            Each booking may be rescheduled only once unless otherwise agreed.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "dispute-resolution",
    title: "Dispute Resolution",
    content: (
      <div className="space-y-4">
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            Fishon will mediate between both parties to reach a fair solution.
          </li>
          <li>
            Evidence such as chat history, payment receipts, and trip photos may
            be reviewed.
          </li>
          <li>
            Fishon’s final decision, after fair assessment, will be binding for
            refunds processed through our platform.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "non-refundable-fees",
    title: "Non-Refundable Fees",
    content: (
      <div className="space-y-4">
        <p>The following are non-refundable once paid:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Payment gateway and processing fees</li>
          <li>Promotional vouchers or coupon value</li>
          <li>
            Add-on services already fulfilled (e.g., catering, fuel surcharge,
            tackle rental)
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "force-majeure",
    title: "Force Majeure",
    content: (
      <div className="space-y-4">
        <p>
          Neither Fishon nor the Operator shall be liable for cancellations or
          delays caused by circumstances beyond their control, including but not
          limited to:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Natural disasters</li>
          <li>Severe weather</li>
          <li>Government restrictions</li>
          <li>War or strikes</li>
        </ul>
        <p>
          In such cases, customers will be entitled to a refund or reschedule as
          outlined in Section 3.2.
        </p>
      </div>
    ),
  },
  {
    id: "policy-changes",
    title: "Policy Changes",
    content: (
      <div className="space-y-4">
        <p>
          Fishon reserves the right to update or modify this Refund &
          Cancellation Policy at any time. Changes will be effective once
          published on{" "}
          <a
            href="https://www.fishon.my/refund-policy"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-slate-300 hover:decoration-slate-500"
          >
            https://www.fishon.my/refund-policy
          </a>
          . We encourage users to review this page regularly.
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

export default function RefundPolicyInteractive() {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined")
      return sections.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.id] = true;
        return acc;
      }, {});
    try {
      const raw = localStorage.getItem("fishon:refund:collapse");
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
        "fishon:refund:collapse",
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
      document.querySelectorAll<HTMLElement>("[data-refund-heading]")
    );
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          const id = visible[0].target.getAttribute("data-refund-heading-id");
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
                      className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#ec2227]/40"
                    >
                      {isOpen ? i + 1 : "+"}
                    </button>
                    <h2
                      data-refund-heading
                      data-refund-heading-id={s.id}
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
              This Refund & Cancellation Policy is provided for transparency and
              does not constitute legal advice. For legal interpretation, please
              consult a qualified professional.
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
