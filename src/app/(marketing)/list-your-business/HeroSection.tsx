import HeroWallpaper from "@/components/HeroWallpaper";
import { FilePenLine, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Stat } from "./ListYourBusinessUI";

const BRAND = "#EC2227";
const WHATSAPP_NUMBER = "60165304304"; // TODO: replace with production number

export default function HeroSection() {
  return (
    <section className="flex flex-col w-full h-screen -mt-16">
      {/* Top: Text on white bg */}
      <div className="z-20 flex flex-col items-start justify-start w-full px-4 pt-10 pb-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="max-w-4xl mt-20">
          <p className="text-xs font-semibold tracking-wide uppercase md:text-sm text-neutral-600">
            Malaysia’s #1 online fishing charter booking platform
          </p>
          <h1 className="mt-2 text-5xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            List your <span style={{ color: BRAND }}>charter</span> on Fishon.my
          </h1>
          <p className="mt-3 text-base md:text-lg text-neutral-700">
            Showcase trips, pricing and boat details. Reach anglers browsing by
            state, lake/river, inshore and offshore destinations across
            Malaysia.
          </p>
          <div className="flex flex-col items-start justify-start w-full gap-3 mt-6 pointer-events-auto sm:flex-row">
            <Link
              href="/auth?next=/captain/form"
              className="inline-flex items-center gap-2 rounded-xl bg-[#EC2227] px-5 py-3 font-semibold text-white shadow hover:opacity-95 text-base"
            >
              <FilePenLine className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Register your charter
            </Link>
            <Link
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Nak%20Fishon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 text-base font-semibold bg-white border rounded-xl border-neutral-300 text-neutral-900 hover:bg-neutral-50"
            >
              <MessageCircle className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Chat on WhatsApp
            </Link>
          </div>
          {/* Stat Showcase Row (restored) */}
          <div className="hidden w-full max-w-lg grid-cols-3 gap-4 mt-8 sm:grid ">
            <Stat value="Malaysia‑first" label="Audience" />
            <Stat value="RM0" label="Free to list" />
            <Stat value="Verified" label="Trust & safety" />
            {/* Add more Stat cards here as needed */}
          </div>
        </div>
      </div>
      {/* Bottom: HeroWallpaper image */}
      <div className="relative flex-1 w-full -mt-20 sm:-mt-40">
        <div className="absolute top-0 z-10 w-full h-2/7 bg-gradient-to-b from-white to-white-10"></div>
        <HeroWallpaper className="h-full min-h-[240px] md:min-h-[320px] lg:min-h-[400px]" />
      </div>
    </section>
  );
}
