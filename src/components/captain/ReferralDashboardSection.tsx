"use client";

import {
  ReferralDashboardCard,
  type ReferralStats,
} from "@/components/captain/ReferralDashboardCard";
import { useEffect, useState } from "react";

interface ReferralCodeResponse {
  code: string;
  shareUrl: string;
  stats: ReferralStats;
  isActive: boolean;
  createdAt: string;
}

interface ReferralDashboardSectionProps {
  adminUserId?: string;
}

/**
 * ReferralDashboardSection - Client component wrapper for dashboard
 *
 * Fetches referral code and stats on mount and displays the ReferralDashboardCard.
 * Shows skeleton loading state while fetching.
 */
export function ReferralDashboardSection({
  adminUserId,
}: ReferralDashboardSectionProps) {
  const [data, setData] = useState<ReferralCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReferralData() {
      try {
        const url = adminUserId
          ? `/api/captain/referral-code?adminUserId=${adminUserId}`
          : "/api/captain/referral-code";

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReferralData();
  }, [adminUserId]);

  return (
    <ReferralDashboardCard
      code={data?.code || null}
      stats={data?.stats || null}
      adminUserId={adminUserId}
      isLoading={isLoading}
    />
  );
}
