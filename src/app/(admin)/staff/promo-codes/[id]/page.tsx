/**
 * Promo Code Detail Page
 * View and edit existing promo code with usage statistics
 */

import authOptions from "@/lib/auth";
import { ArrowLeft, Clock, CreditCard, TrendingUp, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PromoCodeStatusBadge } from "../../_components/PromoCodeStatusBadge";
import { PromoCodeTypeBadge } from "../../_components/PromoCodeTypeBadge";
import { PromoCodeForm } from "../_components/PromoCodeForm";

interface PromoCodeStats {
  promoCode: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: "PERCENTAGE" | "FIXED";
    percentage: number | null;
    fixedAmount: number | null;
    scope: "UNIVERSAL" | "REGISTRATION";
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
    startDate: string;
    endDate: string;
    maxUses: number | null;
    usesCount: number;
    maxUsesPerUser: number;
    newUsersOnly: boolean;
    minPurchase: number | null;
    maxDiscount: number | null;
    specificCharters: string[];
  };
  statistics: {
    totalBookings: number;
    totalDiscountGiven: number;
    totalSales: number;
    fishonRevenue: number;
    totalServiceFee: number;
    totalTax: number;
    bookingsByStatus: Record<string, number>;
    assignmentsTotal: number;
    assignmentsUsed: number;
    assignmentsUnused: number;
    conversionRate: number;
  };
  recentBookings: Array<{
    id: string;
    status: string;
    finalPrice: number;
    discount: { amount: number } | null;
    createdAt: string;
    userName: string | null;
    userEmail: string;
  }>;
}

async function getPromoCodeStats(id: string): Promise<PromoCodeStats | null> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http")
      ? (host as string)
      : `${proto}://${host}`;

    const url = `${base}/api/admin/promo-codes/${id}/stats`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" },
    });

    if (!res.ok) {
      console.error(
        "Failed to fetch promo code stats:",
        res.status,
        await res.text()
      );
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch promo code stats:", error);
    return null;
  }
}

export default async function PromoCodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/promo-codes");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const { id } = await params;
  const data = await getPromoCodeStats(id);

  if (!data) {
    return (
      <div className="min-h-screen p-6 bg-slate-50/60">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 text-center border border-red-200 rounded-lg bg-red-50">
            <p className="text-red-800">Promo code not found</p>
            <Link
              href="/staff/promo-codes"
              className="mt-4 inline-block text-[#ec2227] hover:underline"
            >
              Back to promo codes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { promoCode, statistics } = data;
  const isExpired = new Date(promoCode.endDate) < new Date();

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/staff/promo-codes"
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
                {promoCode.code}
              </h1>
              <PromoCodeStatusBadge
                status={isExpired ? "EXPIRED" : promoCode.status}
              />
              <PromoCodeTypeBadge
                type={promoCode.type}
                value={
                  promoCode.type === "PERCENTAGE"
                    ? promoCode.percentage || undefined
                    : promoCode.fixedAmount
                      ? Number(promoCode.fixedAmount)
                      : undefined
                }
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">{promoCode.name}</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Total Bookings</div>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {statistics.totalBookings}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {promoCode.maxUses
                ? `${promoCode.usesCount}/${promoCode.maxUses} uses`
                : `${promoCode.usesCount} uses`}
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Total Discount</div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              RM {statistics.totalDiscountGiven.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Given to users</div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Total Sales</div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-blue-700">
              RM {statistics.totalSales.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Angler payments received
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Fishon Revenue</div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              RM {statistics.fishonRevenue.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Platform fee - discount
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Service Fee</div>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-700">
              RM {statistics.totalServiceFee.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-500">SenangPay 1.5%</div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Tax Collected</div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-700">
              RM {statistics.totalTax.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Held for govt</div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {promoCode.scope === "REGISTRATION"
                  ? "Conversion Rate"
                  : "Usage Rate"}
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            {promoCode.scope === "REGISTRATION" ? (
              <>
                <div className="mt-2 text-2xl font-semibold text-purple-700">
                  {statistics.conversionRate}%
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {statistics.assignmentsUsed}/{statistics.assignmentsTotal}{" "}
                  users redeemed
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 text-2xl font-semibold text-purple-700">
                  {statistics.totalBookings}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {promoCode.maxUses
                    ? `${promoCode.usesCount}/${promoCode.maxUses} total uses`
                    : `${promoCode.usesCount} times used`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Details and Form */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Details Sidebar */}
          <div className="space-y-4">
            <div className="p-6 space-y-4 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-900">Details</h3>

              <div>
                <div className="text-xs uppercase text-slate-500">Scope</div>
                <div className="mt-1 text-sm text-slate-900">
                  {promoCode.scope === "UNIVERSAL"
                    ? "Universal (Public)"
                    : "Registration (Assigned)"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {promoCode.scope === "UNIVERSAL"
                    ? "Anyone can use this code"
                    : "Assigned to specific users"}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase text-slate-500">
                  Valid Period
                </div>
                <div className="mt-1 space-y-1 text-sm text-slate-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(promoCode.startDate).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(promoCode.endDate).toLocaleString()}
                  </div>
                </div>
              </div>

              {promoCode.minPurchase && (
                <div>
                  <div className="text-xs uppercase text-slate-500">
                    Minimum Purchase
                  </div>
                  <div className="mt-1 text-sm text-slate-900">
                    RM {Number(promoCode.minPurchase).toFixed(2)}
                  </div>
                </div>
              )}

              {promoCode.maxDiscount && (
                <div>
                  <div className="text-xs uppercase text-slate-500">
                    Max Discount
                  </div>
                  <div className="mt-1 text-sm text-slate-900">
                    RM {Number(promoCode.maxDiscount).toFixed(2)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs uppercase text-slate-500">
                  Restrictions
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {promoCode.newUsersOnly ? (
                    <span className="text-amber-700">New users only</span>
                  ) : (
                    <span className="text-slate-600">All users</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            {data.recentBookings.length > 0 && (
              <div className="p-6 bg-white border border-slate-200 rounded-xl">
                <h3 className="mb-4 font-semibold text-slate-900">
                  Recent Bookings
                </h3>
                <div className="space-y-3">
                  {data.recentBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between pb-2 text-xs border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {booking.userName || booking.userEmail}
                        </div>
                        <div className="text-slate-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-900">
                          RM {booking.finalPrice.toFixed(2)}
                        </div>
                        <div className="text-emerald-600">
                          -{booking.discount?.amount || 0} saved
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <PromoCodeForm
              mode="edit"
              promoId={promoCode.id}
              initialData={{
                code: promoCode.code,
                name: promoCode.name,
                description: promoCode.description || undefined,
                type: promoCode.type,
                percentage: promoCode.percentage || undefined,
                fixedAmount: promoCode.fixedAmount
                  ? Number(promoCode.fixedAmount)
                  : undefined,
                scope: promoCode.scope,
                startDate: new Date(promoCode.startDate)
                  .toISOString()
                  .slice(0, 16),
                endDate: new Date(promoCode.endDate).toISOString().slice(0, 16),
                maxUses: promoCode.maxUses || null,
                maxUsesPerUser: promoCode.maxUsesPerUser,
                minPurchase: promoCode.minPurchase
                  ? Number(promoCode.minPurchase)
                  : null,
                maxDiscount: promoCode.maxDiscount
                  ? Number(promoCode.maxDiscount)
                  : null,
                newUsersOnly: promoCode.newUsersOnly,
                specificCharters: promoCode.specificCharters || [],
                status: promoCode.status,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
