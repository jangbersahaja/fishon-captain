import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingAnalytics } from "@/lib/staff-booking-service";
import { CreditCard, GitBranch } from "lucide-react";
import { BookingsOverTimeChart } from "./BookingsOverTimeChart";
import { StatusDistributionChart } from "./StatusDistributionChart";
import { TripsOverTimeChart } from "./TripsOverTimeChart";
import { UrgentActionsCard } from "./UrgentActionsCard";

export async function AnalyticsDashboard() {
  const analytics = await getBookingAnalytics();

  return (
    <div className="space-y-6">
      {/* Urgent Actions - Always visible at top */}
      <UrgentActionsCard urgentActions={analytics.urgentActions} />

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Over Time (Sales) */}
        <BookingsOverTimeChart data={analytics.bookingsOverTime} />

        {/* Trips Over Time (Operations) */}
        <TripsOverTimeChart data={analytics.tripsOverTime} />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <StatusDistributionChart data={analytics.statusDistribution} />

        {/* Flow Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Booking Flow Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.flowTypeDistribution.map((item) => {
                const total = analytics.flowTypeDistribution.reduce(
                  (sum, i) => sum + i.count,
                  0
                );
                const percentage =
                  total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";

                return (
                  <div
                    key={item.flowType}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          item.flowType === "AUTO"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <span className="font-medium text-slate-700">
                        {item.flowType === "AUTO"
                          ? "Auto (Instant)"
                          : "Manual (Request)"}
                      </span>
                    </div>
                    <span className="text-slate-600">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
              {analytics.flowTypeDistribution.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.paymentMethodDistribution.map((item) => {
                const total = analytics.paymentMethodDistribution.reduce(
                  (sum, i) => sum + i.count,
                  0
                );
                const percentage =
                  total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";

                const methodLabels: Record<string, string> = {
                  CARD: "Credit/Debit Card",
                  FPX: "FPX (Bank Transfer)",
                  EWALLET: "E-Wallet",
                  null: "Not Selected",
                };

                const methodColors: Record<string, string> = {
                  CARD: "bg-purple-500",
                  FPX: "bg-blue-500",
                  EWALLET: "bg-orange-500",
                  null: "bg-slate-300",
                };

                const method = item.method || "null";

                return (
                  <div
                    key={method}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          methodColors[method] || "bg-slate-400"
                        }`}
                      />
                      <span className="font-medium text-slate-700">
                        {methodLabels[method] || method}
                      </span>
                    </div>
                    <span className="text-slate-600">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
              {analytics.paymentMethodDistribution.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
