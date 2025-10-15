import CaptainShowcase from "@/components/CaptainShowcase";
import HeroWallpaper from "@/components/HeroWallpaper";
import {
  CheckCircle2,
  Cog,
  FilePenLine,
  Lock,
  Megaphone,
  MessageCircle,
  Receipt,
  Star,
  Trophy,
  UserRoundCheck,
  Users,
  Zap,
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

/* FAQ schema - updated with current platform info */
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
  {
    q: "What's included in each pricing tier?",
    a: "Basic (10%): Google & Facebook ads, listing management, 24/7 support, reviews, performance tools. Silver (20%, coming soon): Everything in Basic plus premium placement and additional marketing tools.",
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

      <section className="mx-auto w-full max-w-7xl px-4 py-15 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Malaysia’s #1 online fishing charter booking platform
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            List your <span style={{ color: BRAND }}>charter</span> on Fishon.my
          </h1>
          <p className="mt-3 text-neutral-700 text-base md:text-lg">
            Showcase trips, pricing and boat details. Reach anglers browsing by
            state, lake/river, inshore and offshore destinations across
            Malaysia.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
            <Link
              href="/auth?next=/captain/form"
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
        <HeroWallpaper className="h-[360px] md:h-[420px]" />
        {/* Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,0,0,0.4),transparent_60%)]" />
      </section>

      {/* ==================== VALUE PROPS ==================== */}
      <section className="bg-[#ec2227]">
        <div className="mx-auto w-full max-w-7xl px-4 py-15 sm:px-6 lg:px-8 ">
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

      {/* ==================== CAPTAIN SHOWCASE ==================== */}
      <CaptainShowcase />

      {/* ==================== PRICING ==================== */}
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

      {/* ==================== SAFETY & AWARDS (Brand background) ==================== */}
      <section className="bg-gradient-to-b from-[#EC2227] to-[#C41A1F]">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 md:py-16 lg:py-20 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 md:gap-10">
            {/* Left: Badges & Recognition */}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-8">
                Trusted & Verified
              </h2>
              <div className="grid gap-4 md:grid-cols-1">
                <Award
                  Icon={Trophy}
                  title="Angler's Choice Badge"
                  desc="Captains earning high ratings from verified angler reviews"
                  accent
                />
                <Award
                  Icon={Star}
                  title="Verified Captain Status"
                  desc="Passed comprehensive safety checks and documentation verification"
                  accent
                />
                <Award
                  Icon={Zap}
                  title="Top Responder Recognition"
                  desc="Fast, professional communication with customers gets featured placement"
                  accent
                />
              </div>
            </div>
            {/* Divider */}
            <div className="my-6 md:my-0 mx-0 border-t md:border-t-0 md:border-l border-white/30" />

            {/* Right: Safety & Legal Compliance */}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4">
                Safety & Compliance
              </h2>
              <p className="mb-6 text-white/95 text-base leading-relaxed">
                Your safety and data protection are paramount. Fishon.my
                operates under strict compliance standards.
              </p>

              {/* Verification Checklist */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-4 text-white/80">
                  Captain Verification
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>
                      Seafarer ID / Maritime License (where applicable)
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Boat Registration Certificate</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Vessel & Public Liability Insurance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>First Aid Certification & Safety Briefing</span>
                  </li>
                </ul>
              </div>

              {/* Legal & Data Protection */}
              <div className="space-y-3 text-sm border-t border-white/20 pt-6">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">
                    PDPA Compliant (Malaysian Data Protection Act)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    Made by Malaysians, for Malaysian anglers and captains.
                  </span>
                </div>
                <div className="text-xs text-white/70 mt-4">
                  <p className="mb-2">Learn more:</p>
                  <div className="space-y-1">
                    <Link href="/terms" className="block hover:underline">
                      → Terms of Service
                    </Link>
                    <Link href="/privacy" className="block hover:underline">
                      → Privacy Policy
                    </Link>
                    <Link
                      href="/refund-policy"
                      className="block hover:underline"
                    >
                      → Refund & Cancellation Policy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
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

      {/* ==================== FINAL CTA (Brand background) ==================== */}
      <section className="bg-[#EC2227]">
        <div className="mx-auto w-full max-w-7xl px-4 pt-25 pb-64 text-white sm:px-6 lg:px-8">
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
                href="/auth?next=/captain/form"
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
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 transition-all hover:border-[#EC2227]/50 hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative text-sm font-semibold">{value}</div>
      <div className="relative text-xs text-neutral-500">{label}</div>
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
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-[#EC2227]/50 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex gap-3 items-center">
        <Icon className="text-2xl text-[#ec2227] flex-shrink-0" />
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="relative mt-1 text-sm md:text-base text-neutral-700">
        {desc}
      </p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 md:p-7 lg:p-8 transition-all hover:border-[#EC2227]/50 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-[#EC2227]/10 text-sm md:text-base font-semibold text-[#EC2227]">
        {n}
      </div>
      <div className="relative mt-2 flex items-center gap-2">
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="relative mt-1 text-sm md:text-base text-neutral-700">
        {desc}
      </p>
    </li>
  );
}

function Plan({
  percent,
  name,
  points,
  highlight = false,
  disabled = false,
}: {
  percent: string;
  name: string;
  points: string[];
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 md:p-7 lg:p-8 transition-all",
        highlight
          ? "border-[#EC2227] bg-[#EC2227]/5 hover:border-[#EC2227]/70 hover:shadow-lg"
          : "border-neutral-200 bg-white hover:border-[#EC2227]/50 hover:shadow-lg",
        disabled ? "opacity-40 bg-gray-600" : "",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex justify-between items-end">
        {disabled ? (
          <h1 className="text-lg md:text-xl font-bold">COMING SOON</h1>
        ) : (
          <h3 className="text-lg md:text-xl font-semibold">{name}</h3>
        )}
        {!disabled && (
          <div className="flex flex-col items-center">
            <div
              className="text-2xl md:text-3xl font-extrabold"
              style={{ color: highlight ? BRAND : "inherit" }}
            >
              {percent}
            </div>

            <span className="text-[10px] uppercase">Commission</span>
          </div>
        )}
      </div>
      <ul className="relative mt-3 space-y-2 text-sm md:text-base text-neutral-700">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-[#EC2227] flex-shrink-0" />
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
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 md:p-7 transition-all",
        accent
          ? "border-white/20 bg-white/10 hover:border-white/40 hover:shadow-lg"
          : "border-neutral-200 bg-white hover:border-[#EC2227]/50 hover:shadow-lg",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center gap-2">
        <Icon
          className={
            "h-5 w-5 md:h-6 md:w-6 flex-shrink-0" +
            (accent ? " text-white" : " text-[#EC2227]")
          }
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
          "relative mt-1 text-sm md:text-base" +
          (accent ? " text-white/90" : " text-neutral-700")
        }
      >
        {desc}
      </p>
    </div>
  );
}
