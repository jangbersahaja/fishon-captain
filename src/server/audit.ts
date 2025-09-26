import { prisma } from "@/lib/prisma";

export type AuditEntityType =
  | "charter"
  | "boat"
  | "trip"
  | "captainProfile"
  | "policies"
  | "pickup"
  | "media";

interface AuditLogInput {
  actorUserId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  changed?: string[] | Record<string, unknown>;
  correlationId?: string;
  ip?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    // @ts-expect-error model appears after migration; suppress until generated
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        before: input.before as unknown,
        after: input.after as unknown,
        changed: input.changed as unknown,
        correlationId: input.correlationId,
        ip: input.ip || undefined,
        userAgent: input.userAgent || undefined,
      },
    });
  } catch (e) {
    // Swallow audit failures; do not block primary mutation
    if (process.env.NODE_ENV !== "production") {
      console.warn("audit log failed", e);
    }
  }
}

export function diffObjects(before: unknown, after: unknown): string[] {
  const changed: string[] = [];
  if (
    typeof before !== "object" ||
    typeof after !== "object" ||
    !before ||
    !after
  ) {
    return before === after ? changed : ["__root__"];
  }
  const bObj = before as Record<string, unknown>;
  const aObj = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(bObj), ...Object.keys(aObj)]);
  for (const k of keys) {
    if (JSON.stringify(bObj[k]) !== JSON.stringify(aObj[k])) changed.push(k);
  }
  return changed;
}
