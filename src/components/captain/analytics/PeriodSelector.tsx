"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";

interface PeriodSelectorProps {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(val) => onChange(val as AnalyticsPeriod)}
    >
      <TabsList>
        <TabsTrigger value="7d">Last 7 days</TabsTrigger>
        <TabsTrigger value="30d">Last 30 days</TabsTrigger>
        <TabsTrigger value="90d">Last 90 days</TabsTrigger>
        <TabsTrigger value="1y">Last year</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
