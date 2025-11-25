/**
 * Promo Code Type Badge Component
 * Displays type badges for promo codes (PERCENTAGE/FIXED)
 */

import { cn } from "@/lib/utils";

type PromoCodeType = "PERCENTAGE" | "FIXED";

interface PromoCodeTypeBadgeProps {
  type: PromoCodeType;
  value?: number;
  className?: string;
}

export function PromoCodeTypeBadge({
  type,
  value,
  className,
}: PromoCodeTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        type === "PERCENTAGE"
          ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10"
          : "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10",
        className
      )}
    >
      {type === "PERCENTAGE" && value ? `${value}% OFF` : "FIXED"}
      {type === "FIXED" && value ? ` RM${value}` : ""}
    </span>
  );
}
