"use client";

import type { ReferralStats } from "@/components/captain/ReferralDashboardCard";
import { ReferralLinkShare } from "@/components/captain/ReferralLinkShare";
import {
  ReferralsDataTable,
  type PaginationInfo,
  type ReferralItem,
  type ReferralsSummary,
} from "@/components/captain/ReferralsDataTable";
import { REFERRAL_CONSTANTS } from "@/lib/constants/referral";
import type { ReferralStatus } from "@prisma/client";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Gift,
  Ship,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ReferralCodeData {
  code: string;
  shareUrl: string;
  stats: ReferralStats;
  isActive: boolean;
  createdAt: string;
  eligible: boolean;
}

interface ReferralIneligible {
  eligible: false;
  reason: "NO_CAPTAIN_PROFILE" | "NO_ACTIVE_CHARTER" | "NOT_CAPTAIN_ROLE";
}

interface ReferralsData {
  referrals: ReferralItem[];
  pagination: PaginationInfo;
  summary: ReferralsSummary;
}

/**
 * ReferralsPageContent - Main content component for referrals page
 *
 * Handles:
 * - Fetching referral code and stats
 * - Fetching referrals list with pagination
 * - Fetching earnings list with pagination
 * - Status filtering
 */
export function ReferralsPageContent() {
  const [referralCode, setReferralCode] = useState<ReferralCodeData | null>(
    null
  );
  const [ineligible, setIneligible] = useState<ReferralIneligible | null>(null);
  const [referralsData, setReferralsData] = useState<ReferralsData | null>(
    null
  );
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<ReferralStatus | "all">(
    "all"
  );
  const [currentPage, setCurrentPage] = useState(1);

  const commissionRatePercent = Math.round(
    REFERRAL_CONSTANTS.COMMISSION_RATE * 100
  );

  // Fetch referral code
  useEffect(() => {
    async function fetchReferralCode() {
      try {
        const res = await fetch("/api/captain/referral-code");
        const data = await res.json();

        if (res.status === 403 && data.eligible === false) {
          // User is not eligible
          setIneligible(data as ReferralIneligible);
        } else if (res.ok) {
          setReferralCode(data);
        }
      } catch (error) {
        console.error("Failed to fetch referral code:", error);
      } finally {
        setIsLoadingCode(false);
      }
    }

    fetchReferralCode();
  }, []);

  // Fetch referrals list
  const fetchReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });
      if (currentStatus !== "all") {
        params.set("status", currentStatus);
      }

      const res = await fetch(`/api/captain/referrals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReferralsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch referrals:", error);
    } finally {
      setIsLoadingReferrals(false);
    }
  }, [currentPage, currentStatus]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleStatusFilter = (status: ReferralStatus | "all") => {
    setCurrentStatus(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Show ineligibility message if user doesn't meet requirements
  if (ineligible) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center border bg-amber-50 border-amber-200 rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-900">
            Not Yet Eligible for Referral Programme
          </h2>
          <p className="max-w-md mx-auto mb-6 text-slate-600">
            {ineligible.reason === "NO_ACTIVE_CHARTER" && (
              <>
                To participate in the referral programme, you need to have at
                least one active charter listing. Make sure atleast one charter
                is active!
              </>
            )}
            {ineligible.reason === "NO_CAPTAIN_PROFILE" && (
              <>
                You need to complete your captain profile before joining the
                referral programme.
              </>
            )}
            {ineligible.reason === "NOT_CAPTAIN_ROLE" && (
              <>
                The referral programme is available for captains only. Staff and
                admin accounts are not eligible to participate.
              </>
            )}
          </p>
          {ineligible.reason === "NO_ACTIVE_CHARTER" && (
            <Link
              href="/captain/charters"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#ec2227] text-white rounded-xl font-medium hover:bg-[#d41f23] transition"
            >
              <Ship className="w-5 h-5" />
              Update Charter Status
            </Link>
          )}
        </div>

        {/* Still show how it works */}
        <div className="p-6 border border-purple-200 opacity-75 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl">
          <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-slate-900">
            <Gift className="w-5 h-5 text-purple-600" />
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
                1
              </div>
              <div>
                <p className="font-medium text-slate-900">Share Your Code</p>
                <p className="text-sm text-slate-600">
                  Share your unique referral code with other captains
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
                2
              </div>
              <div>
                <p className="font-medium text-slate-900">They Register</p>
                <p className="text-sm text-slate-600">
                  They sign up as a captain using your code
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
                3
              </div>
              <div>
                <p className="font-medium text-slate-900">Trip Completed</p>
                <p className="text-sm text-slate-600">
                  Their first charter trip is completed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
                4
              </div>
              <div>
                <p className="font-medium text-slate-900">You Earn!</p>
                <p className="text-sm text-slate-600">
                  {commissionRatePercent}% of their earnings (max RM
                  {REFERRAL_CONSTANTS.COMMISSION_CAP})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* How It Works */}
      <div className="p-6 border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl">
        <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-slate-900">
          <Gift className="w-5 h-5 text-purple-600" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
              1
            </div>
            <div>
              <p className="font-medium text-slate-900">Share Your Code</p>
              <p className="text-sm text-slate-600">
                Share your unique referral code with other captains
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
              2
            </div>
            <div>
              <p className="font-medium text-slate-900">They Register</p>
              <p className="text-sm text-slate-600">
                They sign up as a captain using your code
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
              3
            </div>
            <div>
              <p className="font-medium text-slate-900">Trip Completed</p>
              <p className="text-sm text-slate-600">
                Their first charter trip is completed
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold text-purple-700 bg-purple-200 rounded-full">
              4
            </div>
            <div>
              <p className="font-medium text-slate-900">You Earn!</p>
              <p className="text-sm text-slate-600">
                {commissionRatePercent}% of their earnings (max RM
                {REFERRAL_CONSTANTS.COMMISSION_CAP})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Share Your Referral Code
        </h2>
        {isLoadingCode ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-slate-200 rounded-xl" />
            <div className="h-12 rounded-lg bg-slate-200" />
          </div>
        ) : referralCode ? (
          <ReferralLinkShare
            code={referralCode.code}
            shareUrl={referralCode.shareUrl}
          />
        ) : (
          <div className="py-8 text-center text-slate-500">
            <p>Unable to load referral code. Please try again later.</p>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {referralCode?.stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Total Clicks
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {referralCode.stats.clicks}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Signups
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {referralCode.stats.signups}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Completed
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {referralCode.stats.completedTrips}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Total Earned
              </span>
            </div>
            <p className="text-2xl font-bold text-[#ec2227]">
              RM {referralCode.stats.totalEarnings.toLocaleString()}
            </p>
            {referralCode.stats.pendingEarnings > 0 && (
              <p className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                <Clock className="w-3 h-3" />
                RM {referralCode.stats.pendingEarnings} pending
              </p>
            )}
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Your Referrals
        </h2>
        {referralsData ? (
          <ReferralsDataTable
            referrals={referralsData.referrals}
            pagination={referralsData.pagination}
            summary={referralsData.summary}
            onPageChange={handlePageChange}
            onStatusFilter={handleStatusFilter}
            currentStatus={currentStatus}
            isLoading={isLoadingReferrals}
          />
        ) : isLoadingReferrals ? (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl animate-pulse">
            <div className="w-full h-8 mb-4 rounded bg-slate-200" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-12 rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500">
            <p>Unable to load referrals. Please try again later.</p>
          </div>
        )}
      </div>

      {/* Terms */}
      <div className="p-4 text-sm border bg-slate-50 border-slate-200 rounded-xl text-slate-600">
        <h3 className="mb-2 font-medium text-slate-900">Programme Terms</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            Commission is {commissionRatePercent}% of the referred
            captain&apos;s first completed trip earnings
          </li>
          <li>
            Maximum commission per referral is RM
            {REFERRAL_CONSTANTS.COMMISSION_CAP}
          </li>
          <li>
            Referral must register within{" "}
            {REFERRAL_CONSTANTS.REGISTRATION_EXPIRY_DAYS} days of clicking your
            link
          </li>
          <li>
            Commission is earned when their first trip is completed (within{" "}
            {REFERRAL_CONSTANTS.TRIP_EXPIRY_DAYS} days of registration)
          </li>
          <li>You cannot refer yourself or existing captains</li>
        </ul>
      </div>
    </div>
  );
}
