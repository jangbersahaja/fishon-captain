"use client";

import { Badge } from "@/components/ui/badge";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import {
  AlertCircle,
  Anchor,
  CheckCircle2,
  ImageIcon,
  Lock,
  Ship,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface CharterStatusSectionProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

type CompletionItem = {
  label: string;
  completed: boolean;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  priority: "required" | "recommended" | "optional";
};

export function CharterStatusSection({
  charter,
  adminUserId,
}: CharterStatusSectionProps) {
  const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";

  // Calculate charter completeness
  const completionItems: CompletionItem[] = [
    {
      label: "Boat assigned",
      completed: !!charter.boat,
      href: `/captain/form?editCharterId=${charter.id}${editQuery}#boat`,
      icon: Anchor,
      priority: "required",
    },
    {
      label: "At least one trip",
      completed: charter.trips.count > 0,
      href: `/captain/form?editCharterId=${charter.id}${editQuery}#trips`,
      icon: Ship,
      priority: "required",
    },
    {
      label: "Photos uploaded",
      completed: charter.media.count >= 3,
      href: `/captain/form?editCharterId=${charter.id}${editQuery}#media`,
      icon: ImageIcon,
      priority: "recommended",
    },
    {
      label: "Crew assigned",
      completed: charter.crew.count > 0,
      href: `/captain/crew`,
      icon: Users,
      priority: "optional",
    },
  ];

  const requiredComplete = completionItems
    .filter((i) => i.priority === "required")
    .every((i) => i.completed);
  const totalComplete = completionItems.filter((i) => i.completed).length;
  const completionPercent = Math.round(
    (totalComplete / completionItems.length) * 100
  );

  // Determine status display
  const getStatusDisplay = () => {
    if (charter.isLocked) {
      return {
        icon: Lock,
        label: "Locked",
        description: "This charter is locked by admin. Contact support.",
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
      };
    }
    if (!charter.isActive) {
      return {
        icon: XCircle,
        label: "Inactive",
        description:
          "Charter is not visible on the marketplace. Activate to accept bookings.",
        color: "text-slate-700",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
      };
    }
    if (!requiredComplete) {
      return {
        icon: AlertCircle,
        label: "Incomplete",
        description:
          "Charter is active but missing required information. Complete setup for best results.",
        color: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      };
    }
    return {
      icon: CheckCircle2,
      label: "Live",
      description:
        "Charter is active and accepting bookings on the marketplace.",
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div
        className={`p-4 rounded-xl border ${status.bgColor} ${status.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <StatusIcon className={`w-5 h-5 mt-0.5 ${status.color}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${status.borderColor} ${status.color}`}
              >
                {completionPercent}% complete
              </Badge>
            </div>
            <p className={`text-xs ${status.color} opacity-80`}>
              {status.description}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Checklist */}
      <div className="p-4 bg-white border rounded-xl border-slate-200">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">
          Setup Checklist
        </h4>
        <div className="space-y-2">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 border-2 rounded-full border-slate-300" />
              )}
              <span
                className={`flex-1 text-sm ${
                  item.completed
                    ? "text-slate-600"
                    : "text-slate-900 font-medium"
                }`}
              >
                {item.label}
              </span>
              {!item.completed && item.href && (
                <Link
                  href={item.href}
                  className="text-xs font-medium text-[#ec2227] hover:underline"
                >
                  Add
                </Link>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  item.priority === "required"
                    ? "border-red-200 text-red-600"
                    : item.priority === "recommended"
                      ? "border-amber-200 text-amber-600"
                      : "border-slate-200 text-slate-500"
                }`}
              >
                {item.priority}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
