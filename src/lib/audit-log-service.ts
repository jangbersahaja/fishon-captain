import { prisma } from "@/lib/prisma";

export type AuditLogEntry = {
  id: string;
  action: string;
  actorId: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actorName?: string;
  actorEmail?: string;
};

/**
 * Get audit logs for a specific resource (entity)
 */
export async function getAuditLogsForResource(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch actor names
    const actorIds = [...new Set(logs.map((log) => log.actorUserId))];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return logs.map((log) => {
      const actor = actorMap.get(log.actorUserId);
      // Use 'after' field for metadata since that's what the existing schema has
      const metadata = log.after as Record<string, unknown> | null;
      return {
        id: log.id,
        action: log.action,
        actorId: log.actorUserId,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata,
        createdAt: log.createdAt,
        actorName: actor?.name || undefined,
        actorEmail: actor?.email || undefined,
      };
    });
  } catch (error) {
    console.error("[getAuditLogsForResource] Error:", error);
    return [];
  }
}

/**
 * Get all audit logs with pagination
 */
export async function getAllAuditLogs(
  page = 1,
  limit = 50
): Promise<{
  logs: AuditLogEntry[];
  totalCount: number;
  totalPages: number;
}> {
  try {
    const offset = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count(),
    ]);

    // Fetch actor names
    const actorIds = [...new Set(logs.map((log) => log.actorUserId))];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enrichedLogs = logs.map((log) => {
      const actor = actorMap.get(log.actorUserId);
      const metadata = log.after as Record<string, unknown> | null;
      return {
        id: log.id,
        action: log.action,
        actorId: log.actorUserId,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata,
        createdAt: log.createdAt,
        actorName: actor?.name || undefined,
        actorEmail: actor?.email || undefined,
      };
    });

    return {
      logs: enrichedLogs,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("[getAllAuditLogs] Error:", error);
    return { logs: [], totalCount: 0, totalPages: 0 };
  }
}

/**
 * Format action name for display
 */
export function formatActionName(action: string): string {
  const actionMap: Record<string, string> = {
    FORCE_APPROVE_BOOKING: "Force Approved",
    FORCE_REJECT_BOOKING: "Force Rejected",
    INITIATE_REFUND: "Initiated Refund",
    OVERRIDE_BOOKING_STATUS: "Status Override",
    MARK_BOOKING_COMPLETED: "Marked Completed",
    ADD_ADMIN_NOTE: "Added Note",
  };
  return actionMap[action] || action.replace(/_/g, " ").toLowerCase();
}
