import { Badge } from "@/components/ui/badge";
import type { MarketBooking } from "@/lib/market-db";

type BookingStatus = MarketBooking["status"];

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: "sm" | "default" | "lg";
}

const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    className: "border-red-300 bg-red-50 text-red-700",
  },
  AWAITING_PAYMENT: {
    label: "Awaiting Payment",
    variant: "outline",
    className: "border-yellow-300 bg-yellow-50 text-yellow-700",
  },
  PAYMENT_AUTHORIZED: {
    label: "Payment Authorized",
    variant: "outline",
    className: "border-indigo-300 bg-indigo-50 text-indigo-700",
  },
  PAID: {
    label: "Paid",
    variant: "outline",
    className: "border-green-300 bg-green-50 text-green-700",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    variant: "outline",
    className: "border-purple-300 bg-purple-50 text-purple-700",
  },
  COMPLETED: {
    label: "Completed",
    variant: "outline",
    className: "border-blue-300 bg-blue-50 text-blue-700",
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "secondary",
  },
  EXPIRED: {
    label: "Expired",
    variant: "outline",
    className: "border-slate-300 bg-slate-50 text-slate-700",
  },
};

export function BookingStatusBadge({
  status,
  size = "default",
}: BookingStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={config.className}
      style={
        size === "sm"
          ? { fontSize: "0.75rem", padding: "0.125rem 0.5rem" }
          : size === "lg"
            ? { fontSize: "0.875rem", padding: "0.375rem 0.75rem" }
            : undefined
      }
    >
      {config.label}
    </Badge>
  );
}
