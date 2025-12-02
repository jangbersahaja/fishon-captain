"use client";

import type { ReferralStatus } from "@prisma/client";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ship,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

/**
 * Referral item for display
 */
export interface ReferralItem {
  id: string;
  inviteeName: string | null;
  inviteeEmail: string | null;
  status: ReferralStatus;
  clickedAt: string;
  registeredAt: string | null;
  firstCharterAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  earning: {
    amount: number;
    status: string;
    earnedAt: string;
  } | null;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Referrals summary
 */
export interface ReferralsSummary {
  pending: number;
  registered: number;
  charterCreated: number;
  firstBooking: number;
  completed: number;
  paid: number;
  expired: number;
  total: number;
}

/**
 * Props for ReferralsDataTable
 */
interface ReferralsDataTableProps {
  referrals: ReferralItem[];
  pagination: PaginationInfo;
  summary: ReferralsSummary;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: ReferralStatus | "all") => void;
  currentStatus: ReferralStatus | "all";
  isLoading?: boolean;
}

/**
 * Get status badge config
 */
function getStatusBadge(status: ReferralStatus): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        color: "text-slate-600",
        bgColor: "bg-slate-100",
        icon: <Clock className="w-3 h-3" />,
      };
    case "REGISTERED":
      return {
        label: "Registered",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        icon: <User className="w-3 h-3" />,
      };
    case "CHARTER_CREATED":
      return {
        label: "Charter Created",
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        icon: <Ship className="w-3 h-3" />,
      };
    case "FIRST_BOOKING":
      return {
        label: "First Booking",
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        icon: <Calendar className="w-3 h-3" />,
      };
    case "COMPLETED":
      return {
        label: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: <CheckCircle className="w-3 h-3" />,
      };
    case "PAID":
      return {
        label: "Paid",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        icon: <Wallet className="w-3 h-3" />,
      };
    case "EXPIRED":
      return {
        label: "Expired",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        icon: <XCircle className="w-3 h-3" />,
      };
    case "INVALID":
      return {
        label: "Invalid",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: <XCircle className="w-3 h-3" />,
      };
    default:
      return {
        label: status,
        color: "text-slate-600",
        bgColor: "bg-slate-100",
        icon: <Clock className="w-3 h-3" />,
      };
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

/**
 * ReferralsDataTable - Display referrals with filtering and pagination
 *
 * @example
 * ```tsx
 * <ReferralsDataTable
 *   referrals={referrals}
 *   pagination={pagination}
 *   summary={summary}
 *   onPageChange={handlePageChange}
 *   onStatusFilter={handleStatusFilter}
 *   currentStatus="all"
 * />
 * ```
 */
export function ReferralsDataTable({
  referrals,
  pagination,
  summary,
  onPageChange,
  onStatusFilter,
  currentStatus,
  isLoading = false,
}: ReferralsDataTableProps) {
  const statusFilters: {
    value: ReferralStatus | "all";
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: summary.total },
    { value: "PENDING", label: "Pending", count: summary.pending },
    { value: "REGISTERED", label: "Registered", count: summary.registered },
    {
      value: "CHARTER_CREATED",
      label: "Charter Created",
      count: summary.charterCreated,
    },
    { value: "COMPLETED", label: "Completed", count: summary.completed },
    { value: "PAID", label: "Paid", count: summary.paid },
    { value: "EXPIRED", label: "Expired", count: summary.expired },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Status Filter Tabs */}
      <div className="border-b border-slate-200 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentStatus === filter.value
                  ? "bg-[#ec2227] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-xs rounded ${
                  currentStatus === filter.value
                    ? "bg-white/20"
                    : "bg-slate-200"
                }`}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Invitee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Clicked
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Registered
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Earning
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="w-32 h-4 bg-slate-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 h-6 bg-slate-200 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-20 h-4 bg-slate-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-20 h-4 bg-slate-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-16 h-4 bg-slate-200 rounded" />
                  </td>
                </tr>
              ))
            ) : referrals.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No referrals found
                </td>
              </tr>
            ) : (
              referrals.map((referral) => {
                const statusBadge = getStatusBadge(referral.status);
                return (
                  <tr key={referral.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {referral.inviteeName || "Anonymous"}
                        </p>
                        {referral.inviteeEmail && (
                          <p className="text-xs text-slate-500">
                            {referral.inviteeEmail}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.color}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(referral.clickedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(referral.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      {referral.earning ? (
                        <div>
                          <p className="text-sm font-semibold text-green-600">
                            RM {referral.earning.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {referral.earning.status}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} referrals
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
