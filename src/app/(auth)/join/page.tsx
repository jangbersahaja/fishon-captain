import { AuthSwitcher } from "@/components/auth";
import { oauthProviders as authOauthProviders, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateReferralCode } from "@/lib/services/referral-service";
import { Gift, Ship, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Join Fishon Captain | Referral Invitation",
  description:
    "You've been invited to join Fishon Captain! Register now and start managing your fishing charter business.",
  openGraph: {
    title: "Join Fishon Captain | Referral Invitation",
    description:
      "You've been invited to join Fishon Captain! Register now and start managing your fishing charter business.",
    type: "website",
  },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;
  const referralCode = resolvedSearchParams.ref?.toUpperCase();

  // If no referral code provided, redirect to regular auth page
  if (!referralCode) {
    redirect("/auth?mode=signup");
  }

  // If already logged in, redirect to dashboard
  if (session?.user?.email) {
    const userId = (session.user as { id?: string } | undefined)?.id;
    if (userId) {
      const profile = await prisma.captainProfile.findUnique({
        where: { userId },
        select: { id: true, charters: { select: { id: true }, take: 1 } },
      });
      if (profile && profile.charters.length > 0) {
        redirect("/captain");
      }
    }
    redirect("/captain/form");
  }

  // Validate referral code
  const validation = await validateReferralCode(referralCode);
  const referralInfo = {
    valid: validation.valid,
    invitorName: validation.invitor?.name,
    charterCount: validation.invitor?.charterCount,
    error: validation.error,
  };

  // If referral code is invalid, redirect to auth with the code (will show warning there)
  if (!referralInfo.valid) {
    redirect(`/auth?mode=signup&ref=${referralCode}`);
  }

  const oauthProviders = authOauthProviders.map((provider) =>
    ["facebook", "apple"].includes(provider.id)
      ? { ...provider, configured: false }
      : provider
  );

  return (
    <main className="flex items-center justify-center bg-gradient-to-br from-[#ec2227] to-[#b3171b] min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-2xl px-4 pb-16 sm:px-6">
        {/* Referral Banner - Always shown on this page (only valid codes reach here) */}
        <div className="p-4 mb-6 border shadow-lg rounded-2xl border-emerald-200 bg-emerald-50 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-emerald-100">
              <Gift className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-800">
                You&apos;ve been invited!
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {referralInfo.invitorName}
                </span>{" "}
                has invited you to join Fishon Captain.
                {referralInfo.charterCount && referralInfo.charterCount > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    • {referralInfo.charterCount} active charter
                    {referralInfo.charterCount > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden bg-white border shadow-2xl rounded-3xl border-white/20">
          <div className="border-b border-[#ec2227]/15 bg-gradient-to-r from-[#ec2227]/10 to-[#ec2227]/5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
              Fishon captain portal
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Complete your registration
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Join Malaysia&apos;s leading fishing charter platform and start
              accepting bookings today.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="mx-auto w-8 h-8 rounded-full bg-[#ec2227]/10 flex items-center justify-center">
                  <Ship className="w-4 h-4 text-[#ec2227]" />
                </div>
                <p className="text-xs font-medium text-slate-700">
                  List Your Charter
                </p>
              </div>
              <div className="space-y-1">
                <div className="mx-auto w-8 h-8 rounded-full bg-[#ec2227]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#ec2227]" />
                </div>
                <p className="text-xs font-medium text-slate-700">
                  Reach More Anglers
                </p>
              </div>
              <div className="space-y-1">
                <div className="mx-auto w-8 h-8 rounded-full bg-[#ec2227]/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#ec2227]" />
                </div>
                <p className="text-xs font-medium text-slate-700">
                  Grow Your Business
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            <AuthSwitcher
              next="/captain/form"
              oauthProviders={oauthProviders}
              defaultMode="signup"
              referralCode={referralCode}
            />
          </div>
        </div>

        {/* Already have an account */}
        <p className="mt-6 text-sm text-center text-white/80">
          Already have an account?{" "}
          <a
            href="/auth?mode=signin"
            className="font-medium text-white underline hover:no-underline"
          >
            Sign in here
          </a>
        </p>
      </div>
    </main>
  );
}
