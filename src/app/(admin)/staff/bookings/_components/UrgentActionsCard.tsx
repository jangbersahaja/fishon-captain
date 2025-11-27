import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
} from "lucide-react";
import Link from "next/link";

interface UrgentActionsCardProps {
  urgentActions: {
    expiringApprovals: number;
    paymentDeadlines: number;
    acknowledgmentPending: number;
    underReview: number;
  };
}

export function UrgentActionsCard({ urgentActions }: UrgentActionsCardProps) {
  const totalUrgent =
    urgentActions.expiringApprovals +
    urgentActions.paymentDeadlines +
    urgentActions.acknowledgmentPending +
    urgentActions.underReview;

  const urgentItems = [
    {
      label: "Expiring Approvals",
      count: urgentActions.expiringApprovals,
      href: "/staff/bookings?status=PENDING",
      icon: Clock,
      color: "text-red-600 bg-red-50",
      description: "Pending bookings expiring within 24h",
    },
    {
      label: "Payment Deadlines",
      count: urgentActions.paymentDeadlines,
      href: "/staff/bookings?status=AWAITING_PAYMENT",
      icon: CreditCard,
      color: "text-yellow-600 bg-yellow-50",
      description: "Awaiting payment with deadline soon",
    },
    {
      label: "Acknowledgment Pending",
      count: urgentActions.acknowledgmentPending,
      href: "/staff/bookings?status=PAYMENT_AUTHORIZED",
      icon: CheckCircle,
      color: "text-indigo-600 bg-indigo-50",
      description: "Captain needs to acknowledge",
    },
    {
      label: "Under Review",
      count: urgentActions.underReview,
      href: "/staff/bookings?status=UNDER_REVIEW",
      icon: Eye,
      color: "text-orange-600 bg-orange-50",
      description: "Requires admin attention",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Urgent Actions
          {totalUrgent > 0 && (
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">
              {totalUrgent}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 p-3 transition-colors border rounded-lg hover:bg-slate-50"
            >
              <div className={`p-2 rounded-lg ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">
                    {item.label}
                  </span>
                  <span
                    className={`text-lg font-bold ${item.count > 0 ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {item.count}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
            </Link>
          );
        })}

        {totalUrgent === 0 && (
          <div className="py-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
            <p className="mt-2 text-sm font-medium text-green-700">
              All caught up!
            </p>
            <p className="text-xs text-slate-500">No urgent actions needed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
