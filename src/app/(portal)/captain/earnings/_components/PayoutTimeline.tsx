import { format } from "date-fns";
import { Check, Clock, CreditCard, FileCheck } from "lucide-react";

interface Payout {
  status: string;
  createdAt: Date;
  approvedAt?: Date | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
}

interface PayoutTimelineProps {
  payout: Payout;
}

interface TimelineStage {
  label: string;
  icon: React.ElementType;
  date?: Date | null;
  isActive: boolean;
  isCompleted: boolean;
}

export function PayoutTimeline({ payout }: PayoutTimelineProps) {
  const stages: TimelineStage[] = [
    {
      label: "Created",
      icon: FileCheck,
      date: payout.createdAt,
      isActive: true,
      isCompleted: true,
    },
    {
      label: "Approved",
      icon: Check,
      date: payout.approvedAt,
      isActive: payout.status !== "PENDING",
      isCompleted: !!payout.approvedAt,
    },
    {
      label: "Processing",
      icon: Clock,
      date: payout.processedAt,
      isActive: ["PROCESSING", "COMPLETED"].includes(payout.status),
      isCompleted: !!payout.processedAt,
    },
    {
      label: "Completed",
      icon: CreditCard,
      date: payout.completedAt,
      isActive: payout.status === "COMPLETED",
      isCompleted: !!payout.completedAt,
    },
  ];

  // Handle failed/cancelled states
  if (payout.status === "FAILED" || payout.status === "CANCELLED") {
    const failedStage: TimelineStage = {
      label: payout.status === "FAILED" ? "Failed" : "Cancelled",
      icon: Clock,
      date: payout.failedAt || payout.createdAt,
      isActive: true,
      isCompleted: true,
    };
    return (
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Status Timeline
        </h2>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {failedStage.label}
                </p>
                {failedStage.date && (
                  <p className="text-xs text-slate-600">
                    {format(
                      new Date(failedStage.date),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Status Timeline
      </h2>
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-slate-200 md:left-0 md:top-5 md:bottom-0 md:w-full md:h-0.5" />

        {/* Stages */}
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isLast = index === stages.length - 1;

            return (
              <div
                key={stage.label}
                className="relative flex items-center gap-3 md:flex-col md:items-center md:gap-2"
              >
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full z-10 ${
                    stage.isCompleted
                      ? "bg-green-100"
                      : stage.isActive
                        ? "bg-blue-100"
                        : "bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      stage.isCompleted
                        ? "text-green-600"
                        : stage.isActive
                          ? "text-blue-600"
                          : "text-slate-400"
                    }`}
                  />
                </div>

                {/* Label & Date */}
                <div className="md:text-center">
                  <p
                    className={`text-sm font-medium ${
                      stage.isActive ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {stage.date && (
                    <p className="text-xs text-slate-600">
                      {format(new Date(stage.date), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
