"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

export type TimePeriod = "7d" | "30d" | "90d" | "1y" | "all";

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams?.get("period") as TimePeriod) || "30d";

  const handlePeriodChange = (period: TimePeriod) => {
    router.push(`/captain/earnings?period=${period}`);
  };

  return (
    <Tabs
      value={currentPeriod}
      onValueChange={(val) => handlePeriodChange(val as TimePeriod)}
    >
      <TabsList>
        <TabsTrigger value="7d">Last 7 days</TabsTrigger>
        <TabsTrigger value="30d">Last 30 days</TabsTrigger>
        <TabsTrigger value="90d">Last 90 days</TabsTrigger>
        <TabsTrigger value="1y">Last year</TabsTrigger>
        <TabsTrigger value="all">All time</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
