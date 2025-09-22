import HeroWallpaper from "@/components/HeroWallpaper";
import {
  CheckCircle2,
  Cog,
  FilePenLine,
  Megaphone,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

/* -------------------- SEO -------------------- */
export const metadata: Metadata = {
  title: "List Your Charter | Fishon.my",
  description:
    "Malaysia’s #1 fishing charter booking platform. Publish your trips, reach local anglers, and start receiving high‑intent enquiries.",
  alternates: { canonical: "https://www.fishon.my/list-your-business" },
  openGraph: {
    title: "List Your Charter | Fishon.my",
    description:
      "Showcase your boat, trips, and prices to Malaysian anglers. Free to list. Verification for trust.",
    url: "https://www.fishon.my/list-your-business",
    type: "website",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "List Your Charter | Fishon.my",
    description:
      "Publish trips, showcase your boat, and get bookings from Malaysian anglers.",
  },
  robots: { index: true, follow: true },
};

const BRAND = "#EC2227";
const WHATSAPP_NUMBER = "60165304304"; // TODO: replace with production number

/* FAQ schema (can extend later) */
const faq = [
  {
    q: "Do I need to pay to join?",
    a: "No. It’s free to create a listing. Optional premium placement and advanced tools may be offered later.",
  },
  {
    q: "How will customers contact me?",
    a: "Leads come via WhatsApp, phone or email, based on the preference you set during registration.",
  },
  {
    q: "Can I manage my availability?",
    a: "Calendar & online booking tools are on the roadmap. For now, manage dates directly with customers.",
  },
  {
    q: "Is there verification?",
    a: "Yes. We do basic checks (business/boat documents, insurance) before a listing goes live to help build angler trust.",
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

export default function ListYourBusinessPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* ==================== HERO ==================== */}

      <section className="mx-auto w-full max-w-6xl px-4 py-15 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Malaysia’s #1 online fishing charter booking platform
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            List your <span style={{ color: BRAND }}>charter</span> on Fishon.my
          </h1>
          <p className="mt-3 text-neutral-700 text-base md:text-lg">
            Showcase trips, pricing and boat details. Reach anglers browsing by
            state, lake/river, inshore and offshore destinations across
            Malaysia.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
            <Link
              href="/captains/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#EC2227] px-5 py-3 font-semibold text-white shadow hover:opacity-95 text-base"
            >
              <FilePenLine className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
              Register your charter
            </Link>
            <Link
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Nak%20Fishon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 font-semibold text-neutral-900 hover:bg-neutral-50 text-base"
            >
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
              Chat on WhatsApp
            </Link>
          </div>
          {/* Proof / Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center max-w-lg">
            <Stat value="Malaysia‑first" label="Audience" />
            <Stat value="RM0" label="Free to list" />
            <Stat value="Verified" label="Trust & safety" />
          </div>
        </div>
      </section>

      <section className="relative">
        <HeroWallpaper className="h-[320px] md:h-[360px]" />
        {/* Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,0,0,0.4),transparent_60%)]" />
      </section>

      {/* ==================== VALUE PROPS ==================== */}
      <section className="bg-[#ec2227]">
        <div className="mx-auto w-full max-w-6xl px-4 py-15 sm:px-6 lg:px-8 ">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            What you get
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              Icon={UserRoundCheck}
              title="Malaysia‑first audience"
              desc="Reach anglers browsing by state, lake/river and near‑shore/offshore."
            />
            <Feature
              Icon={Megaphone}
              title="Marketing push"
              desc="Destination guides & seasonal promos to get discovered."
            />
            <Feature
              Icon={Receipt}
              title="Simple pricing"
              desc="Free to list; pick a commission tier that fits your needs."
            />
            <Feature
              Icon={Cog}
              title="Lead‑ready tools"
              desc="WhatsApp/phone/email leads + calendar tools (coming soon)."
            />
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-15 pb-5 sm:px-6 lg:px-8">
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

      {/* ==================== PRICING ==================== */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-5 pb-15 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
          Pricing
        </h2>
        <p className="mt-2 text-neutral-700 text-base md:text-lg">
          Choose a commission tier that matches your goals. Free to list; fees
          apply on successful bookings.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Plan
            percent="10%"
            name="Basic"
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
          <Plan
            percent="20%"
            name="Silver"
            highlight
            points={[
              "Everything in Basic",
              "Top listing optimization",
              "Charter ads",
            ]}
          />
          <Plan
            percent="30%"
            name="Gold"
            points={["Everything in Silver", "Video ads shooting every month"]}
          />
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Final pricing may vary by category and season. We’ll confirm before
          your listing goes live.
        </p>
      </section>

      {/* ==================== SAFETY & AWARDS (Brand background) ==================== */}
      <section className="bg-[#EC2227]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16 lg:py-20 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Awards & Badges */}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Awards & Badges
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-1">
                <Award
                  Icon={Trophy}
                  title="Angler’s Choice"
                  desc="High‑rating badge based on verified reviews."
                  accent
                />
                <Award
                  Icon={ShieldCheck}
                  title="Best Spots"
                  desc="Seasonally recognized destinations and charters."
                  accent
                />
                <Award
                  Icon={CheckCircle2}
                  title="Top Response"
                  desc="Fast replies to leads; improved placement."
                  accent
                />
              </div>
            </div>
            {/* Divider */}
            <div className="my-10 md:my-0 mx-0 border-t md:border-t-0 md:border-l border-white/20" />
            {/* Safety & Verification */}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Safety & Verification
              </h2>
              <p className="mt-2 text-white/90 text-base md:text-lg">
                To help anglers book with confidence, we run basic checks before
                listings go live.
              </p>
              <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 md:h-6 md:w-6" />{" "}
                  Seafarer ID / maritime license (where applicable)
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 md:h-6 md:w-6" /> Boat
                  registration certificate
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 md:h-6 md:w-6" />{" "}
                  Insurance (vessel / public liability)
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 md:h-6 md:w-6" />{" "}
                  First aid readiness & safety brief
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16 lg:py-20 sm:px-6 lg:px-8">
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

      {/* ==================== FINAL CTA (Brand background) ==================== */}
      <section className="bg-[#EC2227]">
        <div className="mx-auto w-full max-w-6xl px-4 pt-25 pb-64 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold">
                Ready to reach more anglers?
              </h3>
              <p className="mt-1 text-white/90 text-base md:text-lg">
                Create your listing in minutes. It’s free to start.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/captains/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#EC2227] shadow hover:bg-white/90 text-base"
              >
                <FilePenLine className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
                Register your charter
              </Link>
              <Link
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Nak%20Fishon`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10 text-base"
              >
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
                Talk to us on WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------- Small UI -------------------- */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function Feature({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex gap-3 items-center">
        <Icon className="text-2xl text-[#ec2227]" />
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="mt-1 text-sm md:text-base text-neutral-700">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-7 lg:p-8">
      <div className="inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-[#EC2227]/10 text-sm md:text-base font-semibold text-[#EC2227]">
        {n}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="mt-1 text-sm md:text-base text-neutral-700">{desc}</p>
    </li>
  );
}

function Plan({
  percent,
  name,
  points,
  highlight = false,
}: {
  percent: string;
  name: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 md:p-7 lg:p-8",
        highlight
          ? "border-[#EC2227] bg-[#EC2227]/5"
          : "border-neutral-200 bg-white",
      ].join(" ")}
    >
      <div className="flex justify-between items-end">
        <h3 className="text-lg md:text-xl font-semibold">{name}</h3>
        <div className="flex flex-col items-center">
          <div
            className="text-2xl md:text-3xl font-extrabold"
            style={{ color: highlight ? BRAND : "inherit" }}
          >
            {percent}
          </div>
          <span className="text-[10px] uppercase">Commission</span>
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-sm md:text-base text-neutral-700">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-[#EC2227]" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Award({
  Icon,
  title,
  desc,
  accent = false,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-white/20 bg-white/10 p-5 md:p-7"
          : "rounded-2xl border border-neutral-200 bg-white p-5 md:p-7"
      }
    >
      <div className="flex items-center gap-2">
        <Icon
          className={"h-5 w-5 md:h-6 md:w-6" + (accent ? " text-white" : "")}
        />
        <h3
          className={
            "font-semibold text-base md:text-lg" + (accent ? " text-white" : "")
          }
        >
          {title}
        </h3>
      </div>
      <p
        className={
          "mt-1 text-sm md:text-base" +
          (accent ? " text-white/90" : " text-neutral-700")
        }
      >
        {desc}
      </p>
    </div>
  );
}
