import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatActionName,
  getAuditLogsForResource,
} from "@/lib/audit-log-service";
import {
  CheckCircle,
  DollarSign,
  FileText,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";

interface AuditTrailCardProps {
  bookingId: string;
}

function getActionIcon(action: string) {
  switch (action) {
    case "FORCE_APPROVE_BOOKING":
      return CheckCircle;
    case "FORCE_REJECT_BOOKING":
      return XCircle;
    case "INITIATE_REFUND":
      return DollarSign;
    case "OVERRIDE_BOOKING_STATUS":
      return RefreshCw;
    case "MARK_BOOKING_COMPLETED":
      return CheckCircle;
    case "ADD_ADMIN_NOTE":
      return FileText;
    default:
      return Shield;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case "FORCE_APPROVE_BOOKING":
    case "MARK_BOOKING_COMPLETED":
      return "text-green-600 bg-green-50";
    case "FORCE_REJECT_BOOKING":
      return "text-red-600 bg-red-50";
    case "INITIATE_REFUND":
      return "text-orange-600 bg-orange-50";
    case "OVERRIDE_BOOKING_STATUS":
      return "text-purple-600 bg-purple-50";
    case "ADD_ADMIN_NOTE":
      return "text-blue-600 bg-blue-50";
    default:
      return "text-slate-600 bg-slate-50";
  }
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export async function AuditTrailCard({ bookingId }: AuditTrailCardProps) {
  const auditLogs = await getAuditLogsForResource("Booking", bookingId);

  if (auditLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            No admin actions recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Audit Trail
          <span className="ml-auto text-xs font-normal text-slate-500">
            {auditLogs.length} action{auditLogs.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {auditLogs.map((log, index) => {
            const Icon = getActionIcon(log.action);
            const colorClasses = getActionColor(log.action);

            return (
              <div key={log.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={`p-1.5 rounded-full ${colorClasses}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {index < auditLogs.length - 1 && (
                    <div className="w-px h-full bg-slate-200 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3">
                  <p className="text-sm font-medium text-slate-900">
                    {formatActionName(log.action)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {log.actorName || log.actorEmail || log.actorId}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(log.createdAt)}
                  </p>

                  {/* Metadata details */}
                  {log.metadata && typeof log.metadata === "object" && (
                    <div className="mt-1.5 p-2 text-xs bg-slate-50 rounded border border-slate-100">
                      {"reason" in log.metadata &&
                        typeof log.metadata.reason === "string" && (
                          <p className="text-slate-600">
                            <span className="font-medium">Reason:</span>{" "}
                            {log.metadata.reason}
                          </p>
                        )}
                      {"previousStatus" in log.metadata &&
                        "newStatus" in log.metadata &&
                        typeof log.metadata.previousStatus === "string" &&
                        typeof log.metadata.newStatus === "string" && (
                          <p className="text-slate-600">
                            <span className="font-medium">Status:</span>{" "}
                            {log.metadata.previousStatus} →{" "}
                            {log.metadata.newStatus}
                          </p>
                        )}
                      {"refundAmount" in log.metadata &&
                        log.metadata.refundAmount != null && (
                          <p className="text-slate-600">
                            <span className="font-medium">Refund:</span> RM{" "}
                            {Number(log.metadata.refundAmount).toFixed(2)}
                          </p>
                        )}
                      {"note" in log.metadata &&
                        typeof log.metadata.note === "string" && (
                          <p className="text-slate-600 line-clamp-2">
                            <span className="font-medium">Note:</span>{" "}
                            {log.metadata.note}
                          </p>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
