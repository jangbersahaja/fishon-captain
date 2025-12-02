"use client";

import { REFERRAL_CONSTANTS } from "@/lib/constants/referral";
import type { ReferralStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle,
  Clock,
  DollarSign,
  MoreHorizontal,
  MousePointer,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ReferralItem {
  id: string;
  invitor: { id: string; name: string | null; email: string };
  invitee: { id: string; name: string | null; email: string } | null;
  code: string;
  status: ReferralStatus;
  tripEarnings: number | null;
  commissionAmount: number | null;
  commissionPaidAt: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  flagReason?: string | null;
}

interface Stats {
  overview: {
    totalReferrals: number;
    totalActiveCodes: number;
    totalClicks: number;
    signupConversionRate: number;
    completionRate: number;
  };
  commissions: {
    total: number;
    pending: number;
    paid: number;
  };
  statusBreakdown: Record<string, number>;
  activity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    completedThisMonth: number;
  };
  topReferrers: Array<{
    invitorId: string;
    name: string;
    email: string;
    completedReferrals: number;
    totalEarnings: number;
  }>;
}

interface ReferralsResponse {
  referrals: ReferralItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    byStatus: Record<string, number>;
    totalEarnings: number;
  };
}

interface SuspiciousData {
  suspicious: {
    duplicateIps: Array<{
      sourceIp: string;
      count: number;
      referralIds: string[];
    }>;
    rapidClicks: Array<{
      referralCodeId: string;
      code: string;
      clicksLastHour: number;
    }>;
  };
  summary: {
    duplicateIpCases: number;
    rapidClickCases: number;
    totalSuspicious: number;
  };
}

const statusConfig: Record<
  ReferralStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  REGISTERED: {
    label: "Registered",
    color: "bg-blue-100 text-blue-800",
    icon: UserCheck,
  },
  CHARTER_CREATED: {
    label: "Charter Created",
    color: "bg-purple-100 text-purple-800",
    icon: TrendingUp,
  },
  FIRST_BOOKING: {
    label: "First Booking",
    color: "bg-indigo-100 text-indigo-800",
    icon: TrendingUp,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  PAID: {
    label: "Paid",
    color: "bg-emerald-100 text-emerald-800",
    icon: DollarSign,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-slate-100 text-slate-600",
    icon: XCircle,
  },
  INVALID: {
    label: "Invalid",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export function AdminReferralsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<ReferralsResponse | null>(null);
  const [suspiciousData, setSuspiciousData] = useState<SuspiciousData | null>(
    null
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
  const [isLoadingSuspicious, setIsLoadingSuspicious] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Fraud prevention state
  const [actionDropdownId, setActionDropdownId] = useState<string | null>(null);
  const [invalidModalOpen, setInvalidModalOpen] = useState(false);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(
    null
  );
  const [invalidReason, setInvalidReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const commissionRatePercent = Math.round(
    REFERRAL_CONSTANTS.COMMISSION_RATE * 100
  );

  // Fetch suspicious referrals
  useEffect(() => {
    async function fetchSuspicious() {
      try {
        const res = await fetch("/api/admin/referrals/bulk");
        if (res.ok) {
          const data = await res.json();
          setSuspiciousData(data);
        }
      } catch (error) {
        console.error("Failed to fetch suspicious data:", error);
      } finally {
        setIsLoadingSuspicious(false);
      }
    }
    fetchSuspicious();
  }, []);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/referrals/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // Fetch referrals
  const fetchReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await fetch(`/api/admin/referrals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReferrals(data);
      }
    } catch (error) {
      console.error("Failed to fetch referrals:", error);
    } finally {
      setIsLoadingReferrals(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReferrals();
  };

  // Mark referral as invalid
  const handleMarkInvalid = async () => {
    if (!selectedReferralId) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/referrals/${selectedReferralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_invalid",
          reason: invalidReason || "Marked as invalid by admin",
        }),
      });

      if (res.ok) {
        // Refresh data
        fetchReferrals();
        setInvalidModalOpen(false);
        setSelectedReferralId(null);
        setInvalidReason("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to mark as invalid");
      }
    } catch (error) {
      console.error("Failed to mark invalid:", error);
      alert("Failed to mark as invalid");
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore invalid referral
  const handleRestore = async (referralId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });

      if (res.ok) {
        fetchReferrals();
        setActionDropdownId(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to restore");
      }
    } catch (error) {
      console.error("Failed to restore:", error);
      alert("Failed to restore referral");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk mark suspicious as invalid
  const handleBulkMarkInvalid = async (referralIds: string[]) => {
    if (!confirm(`Mark ${referralIds.length} referrals as invalid?`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/referrals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_invalid",
          referralIds,
          reason: "Bulk invalidated - suspected duplicate IP abuse",
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`${result.updated} referrals marked as invalid`);
        fetchReferrals();
        // Refresh suspicious data
        const suspRes = await fetch("/api/admin/referrals/bulk");
        if (suspRes.ok) {
          setSuspiciousData(await suspRes.json());
        }
      }
    } catch (error) {
      console.error("Bulk mark invalid failed:", error);
      alert("Failed to process bulk action");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fraud Alert Banner */}
      {suspiciousData && suspiciousData.summary.totalSuspicious > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">
                Suspicious Activity Detected
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {suspiciousData.summary.duplicateIpCases} duplicate IP cases and{" "}
                {suspiciousData.summary.rapidClickCases} rapid click patterns
                detected.
              </p>
              <div className="mt-3 space-y-2">
                {suspiciousData.suspicious.duplicateIps
                  .slice(0, 3)
                  .map((ip) => (
                    <div
                      key={ip.sourceIp}
                      className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-700">
                          IP: {ip.sourceIp.substring(0, 8)}...
                        </span>
                        <span className="text-xs text-red-600 ml-2">
                          {ip.count} pending referrals
                        </span>
                      </div>
                      <button
                        onClick={() => handleBulkMarkInvalid(ip.referralIds)}
                        disabled={isProcessing}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Invalidate All
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Programme Overview */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Programme Overview
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Captains earn {commissionRatePercent}% commission (max RM
          {REFERRAL_CONSTANTS.COMMISSION_CAP}) on their referral&apos;s first
          completed trip.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <Users className="w-4 h-4" />
              Active Codes
            </div>
            <p className="text-xl font-bold text-slate-900">
              {isLoadingStats ? "-" : stats?.overview.totalActiveCodes || 0}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <MousePointer className="w-4 h-4" />
              Total Clicks
            </div>
            <p className="text-xl font-bold text-slate-900">
              {isLoadingStats ? "-" : stats?.overview.totalClicks || 0}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <UserPlus className="w-4 h-4" />
              Total Signups
            </div>
            <p className="text-xl font-bold text-slate-900">
              {isLoadingStats ? "-" : stats?.overview.totalReferrals || 0}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <ArrowUpRight className="w-4 h-4" />
              Signup Rate
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {isLoadingStats
                ? "-"
                : `${stats?.overview.signupConversionRate || 0}%`}
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <CheckCircle className="w-4 h-4" />
              Completion Rate
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {isLoadingStats ? "-" : `${stats?.overview.completionRate || 0}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Commission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Total Commissions
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            RM{" "}
            {isLoadingStats ? "-" : (stats?.commissions.total || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Pending Payout
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            RM{" "}
            {isLoadingStats
              ? "-"
              : (stats?.commissions.pending || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Paid Out</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            RM{" "}
            {isLoadingStats ? "-" : (stats?.commissions.paid || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Activity & Top Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Today</span>
              <span className="font-semibold text-slate-900">
                {isLoadingStats ? "-" : stats?.activity.today || 0} signups
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">This Week</span>
              <span className="font-semibold text-slate-900">
                {isLoadingStats ? "-" : stats?.activity.thisWeek || 0} signups
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">This Month</span>
              <span className="font-semibold text-slate-900">
                {isLoadingStats ? "-" : stats?.activity.thisMonth || 0} signups
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">
                Completed This Month
              </span>
              <span className="font-semibold text-green-600">
                {isLoadingStats ? "-" : stats?.activity.completedThisMonth || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Referrers
          </h3>
          {isLoadingStats ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded" />
              ))}
            </div>
          ) : stats?.topReferrers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No completed referrals yet
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.topReferrers.slice(0, 5).map((referrer, index) => (
                <div
                  key={referrer.invitorId}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                            ? "bg-slate-200 text-slate-700"
                            : index === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {referrer.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {referrer.completedReferrals} referral
                        {referrer.completedReferrals !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    RM {referrer.totalEarnings.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(
            [
              "PENDING",
              "REGISTERED",
              "CHARTER_CREATED",
              "COMPLETED",
              "EXPIRED",
            ] as const
          ).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const count = stats?.statusBreakdown[status] || 0;
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(statusFilter === status ? "all" : status);
                  setCurrentPage(1);
                }}
                className={`rounded-xl p-3 text-left transition ${
                  statusFilter === status
                    ? "ring-2 ring-purple-500 ring-offset-2"
                    : "hover:bg-slate-50"
                } ${config.color.split(" ")[0]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <p className="text-xl font-bold">
                  {isLoadingStats ? "-" : count}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <h3 className="font-semibold text-slate-900">All Referrals</h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {isLoadingReferrals ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        ) : referrals?.referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No referrals found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invitor</th>
                    <th className="px-4 py-3 text-left font-medium">Invitee</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Trip Earnings
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Commission
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Signed Up
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals?.referrals.map((referral) => {
                    const config = statusConfig[referral.status];
                    const canInvalidate = ![
                      "COMPLETED",
                      "PAID",
                      "INVALID",
                    ].includes(referral.status);
                    const canRestore = referral.status === "INVALID";

                    return (
                      <tr key={referral.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {referral.invitor.name || "—"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {referral.invitor.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {referral.invitee?.name || "—"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {referral.invitee?.email || "Not registered"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {referral.code}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
                            >
                              <config.icon className="w-3 h-3" />
                              {config.label}
                            </span>
                            {referral.flagReason && (
                              <p className="text-xs text-red-600 mt-1">
                                {referral.flagReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {referral.tripEarnings !== null
                            ? `RM ${Number(referral.tripEarnings).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {referral.commissionAmount !== null ? (
                            <div>
                              <span className="text-sm font-medium text-emerald-600">
                                RM{" "}
                                {Number(referral.commissionAmount).toFixed(2)}
                              </span>
                              {referral.commissionPaidAt && (
                                <span className="block text-xs text-slate-500">
                                  Paid
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(referral.createdAt).toLocaleDateString(
                            "en-MY",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-4 py-3 text-center relative">
                          {(canInvalidate || canRestore) && (
                            <div className="relative inline-block">
                              <button
                                onClick={() =>
                                  setActionDropdownId(
                                    actionDropdownId === referral.id
                                      ? null
                                      : referral.id
                                  )
                                }
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                              >
                                <MoreHorizontal className="w-4 h-4 text-slate-500" />
                              </button>
                              {actionDropdownId === referral.id && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                  {canInvalidate && (
                                    <button
                                      onClick={() => {
                                        setSelectedReferralId(referral.id);
                                        setInvalidModalOpen(true);
                                        setActionDropdownId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Mark Invalid
                                    </button>
                                  )}
                                  {canRestore && (
                                    <button
                                      onClick={() => handleRestore(referral.id)}
                                      disabled={isProcessing}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Restore
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {referrals && referrals.pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing{" "}
                  {(referrals.pagination.page - 1) *
                    referrals.pagination.limit +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    referrals.pagination.page * referrals.pagination.limit,
                    referrals.pagination.total
                  )}{" "}
                  of {referrals.pagination.total} referrals
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(referrals.pagination.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === referrals.pagination.totalPages}
                    className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mark Invalid Modal */}
      {invalidModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Mark Referral as Invalid
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This will mark the referral as fraudulent or violating programme
              rules. The referral will not count towards commissions.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={invalidReason}
                onChange={(e) => setInvalidReason(e.target.value)}
                placeholder="e.g., Duplicate IP abuse, Self-referral, Fake account..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setInvalidModalOpen(false);
                  setSelectedReferralId(null);
                  setInvalidReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkInvalid}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Mark Invalid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {actionDropdownId && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setActionDropdownId(null)}
        />
      )}
    </div>
  );
}
