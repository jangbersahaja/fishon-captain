import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface PendingEarningsCardProps {
  amount: number;
  nextPayoutDate: Date | null;
}

export function PendingEarningsCard({
  amount,
  nextPayoutDate,
}: PendingEarningsCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg border-amber-200 bg-amber-50">
      <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-amber-900">
          RM {amount.toLocaleString()} pending settlement
        </h3>
        <p className="mt-1 text-sm text-amber-700">
          {nextPayoutDate
            ? `Your earnings will be processed on ${nextPayoutDate.toLocaleDateString("en-MY", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })}. `
            : "Your earnings are awaiting payment processing. "}
          Make sure your{" "}
          <Link
            href="/captain/documents"
            className="font-medium underline hover:text-amber-800"
          >
            bank details are up to date
          </Link>
          .
        </p>
        <div className="flex gap-2 mt-3">
          <Link
            href="/captain/earnings/pending"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50"
          >
            View Pending Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
