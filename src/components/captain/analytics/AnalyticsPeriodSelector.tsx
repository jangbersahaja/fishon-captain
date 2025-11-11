"use client";

import {
  PeriodSelector,
  type AnalyticsPeriod,
} from "@/components/captain/analytics";
import { useRouter, useSearchParams } from "next/navigation";

export function AnalyticsPeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod =
    (searchParams.get("period") as AnalyticsPeriod) || "30d";

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    router.push(`/captain/analytics?period=${period}`);
  };

  return <PeriodSelector value={currentPeriod} onChange={handlePeriodChange} />;
}
