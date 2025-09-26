import { prisma } from "@/lib/prisma";

/**
 * Lightweight server‑side audit logging helpers.
 *
 * Design goals:
 *  - Do not block the primary mutation path (errors are swallowed by default)
 *  - Accept flexible before/after payloads (sanitised & JSON serialisable)
 *  - Provide a shallow diff helper for change field listing
 *  - Be resilient when the audit table is not yet migrated (optional model)
 */

export type AuditEntityType =
  | "charter"
  | "boat"
  | "trip"
  | "captainProfile"
  | "policies"
  | "pickup"
  | "media";

export interface AuditLogInput {
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

export interface WriteAuditOptions {
  /** If true, rethrow errors instead of swallowing silently. */
  strict?: boolean;
  /** If set, skip logging entirely (overrides ENV switch). */
  disabled?: boolean;
  /** Provide a transform to scrub / reduce payload size (e.g. remove PII). */
  scrub?(value: unknown): unknown;
}

// Environment kill‑switch (runtime): set AUDIT_DISABLED=1 to bypass writes.
const ENV_DISABLED = process.env.AUDIT_DISABLED === "1";

/**
 * Attempts an audit write while protecting the main request flow.
 * Backwards compatible signature: second parameter optional.
 */
export async function writeAuditLog(
  input: AuditLogInput,
  options: WriteAuditOptions = {}
) {
  if (ENV_DISABLED || options.disabled) return;

  const scrub = options.scrub ?? ((v: unknown) => v);

  // Shallow clone + scrub to avoid accidental mutation & circular refs.
  const safe = (v: unknown) => safeSerialize(scrub(v));

  try {
    // Optional model: auditLog may not exist until its migration is applied.
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        // Cast: Prisma JSON field accepts InputJsonValue; runtime value is serialisable.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        before: safe(input.before) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        after: safe(input.after) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changed: safe(input.changed) as any,
        correlationId: input.correlationId,
        ip: input.ip || undefined,
        userAgent: input.userAgent || undefined,
      },
    });
  } catch (e) {
    if (options.strict) throw e;
    if (process.env.NODE_ENV !== "production") {
      console.warn("audit log failed", e);
    }
  }
}

/**
 * Attempt to turn an arbitrary value into something JSON serialisable while
 * protecting against circular references and large nested objects.
 * (A minimal implementation to avoid pulling in a heavy utility.)
 */
function safeSerialize(
  value: unknown,
  depth = 0,
  seen = new WeakSet()
): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (depth > 4) return "[depth_truncated]"; // Prevent runaway depth
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => safeSerialize(v, depth + 1, seen));
  }
  if (!isPlainObject(value)) return String(value);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(
    0,
    100
  )) {
    out[k] = safeSerialize(v, depth + 1, seen);
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    (Object.getPrototypeOf(v) === Object.prototype ||
      Object.getPrototypeOf(v) === null)
  );
}

/**
 * Shallow diff: returns list of top-level keys whose values are not strictly equal.
 * Falls back to ["__root__"] when either side is not a plain object.
 */
export function diffObjects(before: unknown, after: unknown): string[] {
  if (Object.is(before, after)) return [];
  if (!isPlainObject(before) || !isPlainObject(after)) return ["__root__"];
  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (!Object.is(beforeObj[key], afterObj[key])) changed.push(key);
  }
  return changed;
}

/**
 * Convenience helper: produce a diff & write audit in one call.
 */
export async function auditWithDiff(
  base: Omit<AuditLogInput, "changed"> & { before: unknown; after: unknown },
  options?: WriteAuditOptions
) {
  const changed = diffObjects(base.before, base.after);
  return writeAuditLog({ ...base, changed }, options);
}
