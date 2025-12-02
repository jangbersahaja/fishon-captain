"use client";

import { REFERRAL_CONSTANTS } from "@/lib/constants/referral";
import { Gift, TrendingUp, Users, Wallet } from "lucide-react";
import Link from "next/link";

/**
 * Referral stats data structure
 */
export interface ReferralStats {
  clicks: number;
  signups: number;
  chartersCreated: number;
  completedTrips: number;
  totalEarnings: number;
  pendingEarnings: number;
}

/**
 * Props for ReferralDashboardCard
 */
interface ReferralDashboardCardProps {
  /** Referral code string */
  code: string | null;
  /** Referral statistics */
  stats: ReferralStats | null;
  /** Admin user ID for impersonation context */
  adminUserId?: string;
  /** Whether the component is in loading state */
  isLoading?: boolean;
}

/**
 * ReferralDashboardCard - Affiliate programme overview card for dashboard
 *
 * Displays:
 * - Referral code with copy functionality
 * - Key metrics (signups, earnings)
 * - Link to full referrals page
 *
 * @example
 * ```tsx
 * <ReferralDashboardCard
 *   code="AHMAD7K2X"
 *   stats={{
 *     clicks: 150,
 *     signups: 12,
 *     chartersCreated: 8,
 *     completedTrips: 3,
 *     totalEarnings: 250,
 *     pendingEarnings: 100,
 *   }}
 * />
 * ```
 */
export function ReferralDashboardCard({
  code,
  stats,
  adminUserId,
  isLoading = false,
}: ReferralDashboardCardProps) {
  const referralsHref = adminUserId
    ? `/captain/referrals?adminUserId=${adminUserId}`
    : "/captain/referrals";

  const commissionRatePercent = Math.round(
    REFERRAL_CONSTANTS.COMMISSION_RATE * 100
  );

  if (isLoading) {
    return (
      <div
        className="p-5 transition-all duration-200 bg-white border border-slate-200 rounded-2xl animate-pulse"
        role="status"
        aria-label="Loading referral data"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-50 p-2.5">
            <Gift className="w-5 h-5 text-purple-600" aria-hidden="true" />
          </div>
          <div className="w-24 h-4 rounded bg-slate-200" />
        </div>
        <div className="space-y-3">
          <div className="w-32 h-8 rounded bg-slate-200" />
          <div className="w-full h-4 rounded bg-slate-200" />
          <div className="w-full h-4 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-5 transition-all duration-200 bg-white border border-slate-200 rounded-2xl hover:shadow-md focus-within:ring-2 focus-within:ring-[#ec2227] focus-within:ring-offset-2"
      role="region"
      aria-label="Referral programme overview"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2.5">
            <Gift className="w-5 h-5 text-purple-600" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Referrals
          </h3>
        </div>
        <Link
          href={referralsHref}
          className="text-xs font-medium text-[#ec2227] hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Referral Code */}
      {code ? (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-1">Your referral code</p>
          <p className="text-2xl font-bold font-mono text-slate-900 tracking-wider">
            {code}
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-2">No referral code yet</p>
          <Link
            href={referralsHref}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#ec2227] rounded-lg hover:bg-[#d41f24] transition-colors"
          >
            <Gift className="w-4 h-4" />
            Get your code
          </Link>
        </div>
      )}

      {/* Commission Info */}
      <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-purple-50">
        <TrendingUp className="w-4 h-4 text-purple-600" aria-hidden="true" />
        <span className="text-xs font-medium text-purple-700">
          Earn {commissionRatePercent}% (up to RM
          {REFERRAL_CONSTANTS.COMMISSION_CAP}) per referral
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="pt-3 space-y-3 border-t border-slate-100">
          {/* Signups */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Total signups</span>
            </div>
            <span className="font-semibold text-slate-900">
              {stats.signups}
            </span>
          </div>

          {/* Total Earnings */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Total earned</span>
            </div>
            <span className="font-semibold text-[#ec2227]">
              RM {stats.totalEarnings.toLocaleString()}
            </span>
          </div>

          {/* Pending */}
          {stats.pendingEarnings > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-4 h-4 text-slate-400">⏳</span>
                <span>Pending</span>
              </div>
              <span className="font-semibold text-amber-600">
                RM {stats.pendingEarnings.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
