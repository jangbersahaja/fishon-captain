"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface CharterFilterSelectProps {
  charters: Array<{ id: string; name: string }>;
  currentValue: string;
}

export function CharterFilterSelect({
  charters,
  currentValue,
}: CharterFilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (charters.length === 0) {
    return null;
  }

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("charter", value);
    } else {
      params.delete("charter");
    }
    // Reset to page 1 when filter changes
    params.delete("page");
    router.push(`/staff/bookings?${params.toString()}`);
  };

  return (
    <select
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1.5 text-xs font-medium border rounded-lg bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
    >
      <option value="">All Charters</option>
      {charters.map((charter) => (
        <option key={charter.id} value={charter.id}>
          {charter.name}
        </option>
      ))}
    </select>
  );
}
