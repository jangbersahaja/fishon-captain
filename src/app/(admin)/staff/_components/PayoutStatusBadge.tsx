interface PayoutStatusBadgeProps {
  status:
    | "PENDING"
    | "APPROVED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
}

export function PayoutStatusBadge({ status }: PayoutStatusBadgeProps) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 border-purple-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-800 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}
    >
      {status}
    </span>
  );
}
