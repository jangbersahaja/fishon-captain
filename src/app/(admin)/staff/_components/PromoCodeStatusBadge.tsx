/**
 * Promo Code Status Badge Component
 * Displays color-coded status badges for promo codes
 */

import { cn } from "@/lib/utils";

type PromoCodeStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

interface PromoCodeStatusBadgeProps {
  status: PromoCodeStatus;
  className?: string;
}

export function PromoCodeStatusBadge({
  status,
  className,
}: PromoCodeStatusBadgeProps) {
  const variants = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-800 border-slate-200",
    EXPIRED: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[status],
        className
      )}
    >
      {status}
    </span>
  );
}
