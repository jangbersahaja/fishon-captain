import {
  BadgeCheck,
  FilePenLine,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const WHATSAPP_NUMBER = "60165304304"; // TODO: replace with production number

export default function FinalCTASection() {
  return (
    <section className="relative bg-[#EC2227] overflow-hidden">
      {/* Subtle pattern background */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-20"
        aria-hidden
      >
        <svg
          width="100%"
          height="100%"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      <div className="relative flex flex-col items-center justify-between w-full gap-10 px-4 mx-auto text-white max-w-7xl py-25 sm:px-6 lg:px-8 sm:flex-row">
        {/* Stat Showcase Row - tweaked for more contrast and icons */}
        <div className="grid w-full max-w-lg grid-cols-3 gap-4 ">
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <Users className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">
              Malaysia‑first
            </div>
            <div className="text-xs font-medium text-neutral-700">Audience</div>
          </div>
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <BadgeCheck className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">RM0</div>
            <div className="text-xs font-medium text-neutral-700">
              Free to list
            </div>
          </div>
          <div className="flex flex-col items-center p-4 border shadow-md bg-white/90 rounded-xl border-white/30">
            <ShieldCheck className="w-6 h-6 text-[#EC2227] mb-1" />
            <div className="text-md font-bold text-[#EC2227]">Verified</div>
            <div className="text-xs font-medium text-neutral-700">
              Trust & safety
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-6 sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold md:text-3xl drop-shadow-lg">
              Ready to reach more anglers?
            </h3>
            <p className="mt-1 text-base text-white/90 md:text-lg">
              Create your listing in minutes. It’s free to start.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth?next=/captain/form"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#EC2227] shadow-lg hover:bg-white/90 text-base transition"
            >
              <FilePenLine className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Register your charter
            </Link>
            <Link
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Nak%20Fishon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 text-base font-semibold text-white transition border shadow-lg rounded-xl border-white/40 hover:bg-white/10"
            >
              <MessageCircle className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Talk to us on WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
