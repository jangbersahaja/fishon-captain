"use client";

import {
  PeriodSelector,
  type AnalyticsPeriod,
} from "@/components/captain/analytics";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminPeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod =
    (searchParams.get("period") as AnalyticsPeriod) || "30d";

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    router.push(`/staff/analytics?period=${period}`);
  };

  return <PeriodSelector value={currentPeriod} onChange={handlePeriodChange} />;
}
