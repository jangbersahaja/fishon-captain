import { Lock, Star, Trophy, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Award } from "./ListYourBusinessUI";

export default function SafetyAwardsSection() {
  return (
    <section className="bg-gradient-to-b from-[#EC2227] to-[#C41A1F]">
      <div className="w-full px-4 py-12 mx-auto text-white max-w-7xl md:py-16 lg:py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          {/* Left: Badges & Recognition */}
          <div className="flex-1">
            <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-right md:text-3xl lg:text-4xl">
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
          <div className="mx-0 my-6 border-t md:my-0 md:border-t-0 md:border-l border-white/30" />

          {/* Right: Safety & Legal Compliance */}
          <div className="flex-1">
            <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:text-3xl lg:text-4xl">
              Safety & Compliance
            </h2>
            <p className="mb-6 text-base leading-relaxed text-white/95">
              Your safety and data protection are paramount. Fishon.my operates
              under strict compliance standards.
            </p>

            {/* Verification Checklist */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-white/80">
                Captain Verification
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>Seafarer ID / Maritime License (where applicable)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>Boat Registration Certificate</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>Vessel & Public Liability Insurance</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0">
                    <Lock />
                  </span>
                  <span>First Aid Certification & Safety Briefing</span>
                </li>
              </ul>
            </div>

            {/* Legal & Data Protection */}
            <div className="pt-6 space-y-3 text-sm border-t border-white/20">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="font-medium">
                  PDPA Compliant (Malaysian Data Protection Act)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  Made by Malaysians, for Malaysian anglers and captains.
                </span>
              </div>
              <div className="mt-4 text-xs text-white/70">
                <p className="mb-2">Learn more:</p>
                <div className="space-y-1">
                  <Link href="/terms" className="block hover:underline">
                    → Terms of Service
                  </Link>
                  <Link href="/privacy" className="block hover:underline">
                    → Privacy Policy
                  </Link>
                  <Link href="/refund-policy" className="block hover:underline">
                    → Refund & Cancellation Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
