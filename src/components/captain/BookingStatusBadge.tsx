import { Badge } from "@/components/ui/badge";

type BookingStatus =
  | "PENDING"
  | "PAYMENT_AUTHORIZED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

interface BookingStatusBadgeProps {
  status: BookingStatus | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getStatusConfig(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "New Request",
        variant: "outline",
        className: "bg-red-50 text-red-800 border-red-300",
      };
    case "PAYMENT_AUTHORIZED":
      return {
        label: "Payment Received",
        variant: "default",
        className: "bg-indigo-100 text-indigo-800 border-indigo-300",
      };
    case "AWAITING_PAYMENT":
      return {
        label: "Awaiting Payment",
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case "PAID":
      return {
        label: "Confirmed",
        variant: "default",
        className: "bg-green-100 text-green-800 border-green-300",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        variant: "secondary",
        className: "bg-gray-100 text-gray-800 border-gray-300",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-300",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-300",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        variant: "destructive",
        className: "bg-orange-100 text-orange-800 border-orange-300",
      };
    default:
      return {
        label: status,
        variant: "secondary",
        className: "bg-gray-100 text-gray-800 border-gray-300",
      };
  }
}

export function BookingStatusBadge({
  status,
  size = "md",
  className = "",
}: BookingStatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  return (
    <Badge
      variant={config.variant}
      className={`capitalize ${config.className} ${sizeClasses[size]} ${className}`}
    >
      {config.label}
    </Badge>
  );
}
