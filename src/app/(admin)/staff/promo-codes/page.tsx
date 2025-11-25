/**
 * Promo Codes Management Page
 * Staff/Admin interface for managing promotional codes
 */

import authOptions from "@/lib/auth";
import { Plus, Search } from "lucide-react";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PromoCodeStatusBadge } from "../_components/PromoCodeStatusBadge";
import { PromoCodeTypeBadge } from "../_components/PromoCodeTypeBadge";

interface PromoCode {
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
  bookingsCount: number;
  assignmentsCount: number;
  createdAt: string;
}

async function getPromoCodes(
  status?: string,
  scope?: string,
  search?: string
): Promise<PromoCode[]> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http")
      ? (host as string)
      : `${proto}://${host}`;

    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (scope && scope !== "all") params.set("scope", scope);
    if (search) params.set("search", search);

    const url = `${base}/api/admin/promo-codes?${params.toString()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" },
    });

    if (!res.ok) {
      console.error(
        "Failed to fetch promo codes:",
        res.status,
        await res.text()
      );
      return [];
    }

    const data = await res.json();
    return data.promoCodes || [];
  } catch (error) {
    console.error("Failed to fetch promo codes:", error);
    return [];
  }
}

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; scope?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/promo-codes");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const params = await searchParams;
  const promoCodes = await getPromoCodes(
    params.status,
    params.scope,
    params.search
  );

  const activeCount = promoCodes.filter((p) => p.status === "ACTIVE").length;
  const totalBookings = promoCodes.reduce((sum, p) => sum + p.bookingsCount, 0);
  const totalAssignments = promoCodes.reduce(
    (sum, p) => sum + p.assignmentsCount,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Promo Codes
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage promotional codes and track usage
            </p>
          </div>
          <Link
            href="/staff/promo-codes/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[#ec2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#d41f23] transition"
          >
            <Plus className="w-4 h-4" />
            Create Promo Code
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-sm text-slate-600">Active Codes</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {activeCount}
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-sm text-slate-600">Total Bookings</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">
              {totalBookings}
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-sm text-slate-600">Total Assignments</div>
            <div className="mt-1 text-2xl font-semibold text-blue-700">
              {totalAssignments}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or name..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
                defaultValue={params.search}
              />
            </div>
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              defaultValue={params.status || "all"}
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              defaultValue={params.scope || "all"}
            >
              <option value="all">All Scopes</option>
              <option value="UNIVERSAL">Universal</option>
              <option value="REGISTRATION">Registration</option>
            </select>
          </div>
        </div>

        {/* Promo Codes Table */}
        <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
          {promoCodes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-sm text-slate-400">
                No promo codes found. Create your first promo code to get
                started.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Code
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {promoCodes.map((promo) => {
                    const isExpired = new Date(promo.endDate) < new Date();
                    const usage = promo.maxUses
                      ? `${promo.usesCount}/${promo.maxUses}`
                      : `${promo.usesCount}`;

                    return (
                      <tr key={promo.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm font-medium text-slate-900">
                            {promo.code}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {promo.name}
                          </div>
                          {promo.description && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {promo.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PromoCodeTypeBadge
                            type={promo.type}
                            value={
                              promo.type === "PERCENTAGE"
                                ? promo.percentage || undefined
                                : promo.fixedAmount
                                  ? Number(promo.fixedAmount)
                                  : undefined
                            }
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PromoCodeStatusBadge
                            status={
                              isExpired ? "EXPIRED" : (promo.status as any)
                            }
                          />
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                          <div>{usage} uses</div>
                          <div className="text-xs text-slate-500">
                            {promo.bookingsCount} bookings
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                          {new Date(promo.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                          <Link
                            href={`/staff/promo-codes/${promo.id}`}
                            className="text-[#ec2227] hover:text-[#d41f23] font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
