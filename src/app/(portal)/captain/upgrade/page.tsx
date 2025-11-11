import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, Check, HeadphonesIcon, Ship, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId = resolvedSearchParams?.adminUserId;

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  // Get user's current role and charter count
  const user = await prisma.user.findUnique({
    where: { id: effectiveUserId },
    select: { role: true, email: true, name: true },
  });

  if (!user) redirect("/auth?mode=signin");

  // If already an OPERATOR, redirect back to dashboard
  if (user.role === "OPERATOR") {
    redirect("/captain");
  }

  const charterCount = await prisma.charter.count({
    where: { ownerId: effectiveUserId },
  });

  const features = [
    {
      icon: Ship,
      title: "Unlimited Charter Listings",
      description: "Create and manage multiple charter operations with ease.",
    },
    {
      icon: Users,
      title: "Crew Management System",
      description:
        "Add, assign, and track crew members across all your charters.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Get detailed insights into performance, bookings, and revenue.",
    },
    {
      icon: HeadphonesIcon,
      title: "Priority Support",
      description:
        "Get faster response times and dedicated account assistance.",
    },
  ];

  const benefits = [
    "Scale your fishing business with multiple charters",
    "Professional crew management tools",
    "Consolidated dashboard for all operations",
    "Advanced reporting and analytics",
    "Priority customer support",
    "Early access to new features",
    "Dedicated account manager (Enterprise)",
  ];

  return (
    <div className="px-6 py-8 mx-auto">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
          <Ship className="w-8 h-8 text-white" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-slate-900">
          Upgrade to Operator
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600">
          Take your fishing charter business to the next level with powerful
          tools designed for professional operators managing multiple vessels.
        </p>
      </div>

      {/* Current Status */}
      <div className="p-6 mb-8 bg-white border shadow-sm rounded-2xl border-slate-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Your Current Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Captain Plan</p>
            <p className="text-sm text-slate-600">
              {charterCount} of 1 charter used
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">Free</p>
            <p className="text-xs text-slate-500">Forever</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          What You&apos;ll Get
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 transition-shadow bg-white border shadow-sm rounded-2xl border-slate-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits List */}
      <div className="p-8 mb-8 border rounded-2xl border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Operator Benefits
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm text-slate-700">{benefit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="p-8 mb-8 bg-white border-2 border-blue-200 shadow-lg rounded-2xl">
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm font-semibold tracking-wide text-blue-600 uppercase">
            Operator Plan
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-bold text-slate-900">RM 299</span>
            <span className="text-lg text-slate-600">/month</span>
          </div>
          <p className="text-sm text-slate-600">
            or RM 2,990/year (save 2 months!)
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="mailto:support@fishon.my?subject=Upgrade%20to%20Operator&body=Hello%2C%0A%0AI%20would%20like%20to%20upgrade%20my%20account%20to%20the%20Operator%20plan.%0A%0AUser%20Email%3A%20${user.email}%0A%0AThank%20you!"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold text-white rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Contact Sales
          </Link>
          <Link
            href="/captain"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold border-2 rounded-full border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Maybe Later
          </Link>
        </div>
      </div>

      {/* FAQ */}
      <div className="p-6 bg-white border shadow-sm rounded-2xl border-slate-200">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 font-semibold text-slate-900">
              Can I switch back to Captain plan?
            </h3>
            <p className="text-sm text-slate-600">
              Yes, you can downgrade anytime. You&apos;ll keep access until the
              end of your billing period, but additional charters beyond 1 will
              be archived.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-slate-900">
              Is there a free trial?
            </h3>
            <p className="text-sm text-slate-600">
              We offer a 14-day free trial for new Operator accounts. Contact
              our sales team to get started.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-slate-900">
              What payment methods do you accept?
            </h3>
            <p className="text-sm text-slate-600">
              We accept bank transfers, credit cards, and online banking.
              Contact us for invoice-based billing for annual plans.
            </p>
          </div>
        </div>
      </div>

      {/* Support Contact */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-600">
          Have questions? Contact us at{" "}
          <a
            href="mailto:support@fishon.my"
            className="font-medium text-blue-600 hover:underline"
          >
            support@fishon.my
          </a>
        </p>
      </div>
    </div>
  );
}
