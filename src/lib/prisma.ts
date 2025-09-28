import { env } from "@/lib/env"; // ensures env validation occurs on first DB usage
import { PrismaClient } from "@prisma/client";

// Logging strategy (development):
// - Default: suppress verbose Prisma "query" spam
// - Enable full query logging by setting PRISMA_LOG_QUERIES=1
// - Slow query detection: log any query slower than PRISMA_SLOW_QUERY_MS (default 350ms)
// - Disable even slow logs with PRISMA_SILENT=1
// - Always log errors & warnings
//
// Rationale: keeps console readable while preserving actionable performance/error signals.

const enableVerboseQueries = process.env.PRISMA_LOG_QUERIES === "1";
const silentAll = process.env.PRISMA_SILENT === "1";
const slowMs = (() => {
  const raw = process.env.PRISMA_SLOW_QUERY_MS;
  if (!raw) return 350;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 350;
})();

const baseLog: ("query" | "error" | "warn")[] = enableVerboseQueries
  ? ["query", "error", "warn"]
  : ["error", "warn"]; // remove noisy query logs unless explicitly enabled

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? baseLog : ["error"],
  });

// In some build environments (e.g., stale generated client) additional models may not
// appear on the PrismaClient type immediately after a schema change. To avoid widespread
// type errors during a deploy race, we optionally augment the instance with loose
// index-based accessors so routes can still compile. This does NOT affect runtime behavior.
// Once the generated client catches up, these casts become no-ops.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
interface SoftAugment {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}
const anyPrisma = prisma as unknown as SoftAugment;
if (typeof anyPrisma.captainVerification === "undefined") {
  anyPrisma.captainVerification = (prisma as unknown as SoftAugment)[
    "captainVerification"
  ];
}
if (typeof anyPrisma.charterDraft === "undefined") {
  anyPrisma.charterDraft = (prisma as unknown as SoftAugment)["charterDraft"];
}

// Attach middleware only once (avoid stacking during HMR)
if (!globalForPrisma.prisma) {
  if (!silentAll) {
    // Fallback typed middleware (avoid depending on Prisma.Middleware type if not generated)
    const middleware = async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (p: any) => Promise<unknown>
    ) => {
      const start = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        if (
          duration >= slowMs &&
          env.NODE_ENV === "development" &&
          process.env.PRISMA_LOG_SLOW !== "0" // allow explicit opt-out
        ) {
          // Compact log line (avoid dumping full parameters to keep console clean)
          console.log(
            `🔍 [prisma:slow] ${params.model || "raw"}.${
              params.action
            } ${duration}ms` +
              (enableVerboseQueries
                ? ""
                : " (set PRISMA_LOG_QUERIES=1 for full SQL)")
          );
        }
        return result;
      } catch (err) {
        const duration = Date.now() - start;
        console.error(
          `💥 [prisma:error] ${params.model || "raw"}.${
            params.action
          } ${duration}ms`,
          err instanceof Error ? err.message : err
        );
        throw err;
      }
    };
    // Some generated client types may omit $use in edge builds; guard at runtime.
    if (typeof (prisma as unknown as { $use?: unknown }).$use === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as unknown as { $use: (mw: any) => void }).$use(middleware);
    }
  }
}

// Optional hard suppression of noisy `prisma:query` debug lines even if some other part
// of the toolchain (e.g. DEBUG=prisma:query) is set. Enable with PRISMA_SUPPRESS_QUERY_LOG=1
// This wraps console.log AFTER potential other instrumentation.
if (process.env.PRISMA_SUPPRESS_QUERY_LOG === "1") {
  const originalLog = console.log;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log = (...args: any[]) => {
    if (
      args.length &&
      typeof args[0] === "string" &&
      args[0].startsWith("prisma:query")
    ) {
      return; // swallow
    }
    originalLog(...args);
  };
}

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
