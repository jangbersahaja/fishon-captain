// Lightweight instrumentation helpers for the charter form feature.
// These are intentionally no-op by default so they can be wired to a real
// analytics backend later without changing call sites.

export type AnalyticsEvent =
  | { type: "step_view"; step: string; index: number }
  | { type: "step_complete"; step: string; index: number }
  | { type: "draft_saved"; server: boolean; version?: number | null }
  | {
      type: "finalize_attempt";
      images?: number;
      videos?: number;
      trips?: number;
    }
  | {
      type: "finalize_success";
      charterId: string;
      ms?: number;
      images?: number;
      videos?: number;
      trips?: number;
    }
  | { type: "validation_errors"; step: string; count: number }
  | { type: "media_upload_start"; kind: "photo" | "video"; pending: number }
  | { type: "media_upload_complete"; kind: "photo" | "video"; ms?: number }
  | {
      type: "media_batch_complete";
      kind: "photo" | "video";
      count: number;
      ms?: number;
    }
  | { type: "conflict_resolution"; serverVersion: number }
  | { type: "lazy_component_loaded"; name: string; ms?: number; group?: string }
  | { type: "preview_ready"; group: string; names: string[]; totalMs?: number };

let subscriber: ((e: AnalyticsEvent) => void) | null = null;
// Dedupe state for step_view
const LAST_STEP_VIEW: { step?: string; index?: number; t?: number } = {};
const STEP_VIEW_DEDUPE_WINDOW_MS = 800; // avoid noisy repeats when state re-renders
let finalizeAttemptAt: number | null = null;
const mediaUploadStartAt: Partial<Record<"photo" | "video", number>> = {};
interface MediaBatchState {
  pending: number;
  completed: number;
  start: number;
}
const mediaBatch: Partial<Record<"photo" | "video", MediaBatchState>> = {};
const DEFAULT_LAZY_BUDGET = 1500;
const envBudget =
  typeof process !== "undefined"
    ? Number(process.env.NEXT_PUBLIC_CHARTER_FORM_LAZY_BUDGET_MS) || undefined
    : undefined;
const LAZY_COMPONENT_BUDGET_MS =
  envBudget && envBudget > 0 ? envBudget : DEFAULT_LAZY_BUDGET; // soft budget for a lazy chunk

export function setCharterFormAnalyticsListener(
  fn: (e: AnalyticsEvent) => void
) {
  subscriber = fn;
}

export function emitCharterFormEvent(e: AnalyticsEvent) {
  try {
    if (e.type === "step_view") {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (
        LAST_STEP_VIEW.step === e.step &&
        LAST_STEP_VIEW.index === e.index &&
        LAST_STEP_VIEW.t !== undefined &&
        now - LAST_STEP_VIEW.t < STEP_VIEW_DEDUPE_WINDOW_MS
      ) {
        return; // suppress duplicate rapid emission
      }
      LAST_STEP_VIEW.step = e.step;
      LAST_STEP_VIEW.index = e.index;
      LAST_STEP_VIEW.t = now;
    }
    if (e.type === "finalize_attempt") {
      finalizeAttemptAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
    } else if (
      e.type === "finalize_success" &&
      finalizeAttemptAt !== null &&
      e.ms === undefined
    ) {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      e.ms = Math.max(0, Math.round(now - finalizeAttemptAt));
      finalizeAttemptAt = null;
    }
    if (e.type === "media_upload_start") {
      mediaUploadStartAt[e.kind] =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      mediaBatch[e.kind] = {
        pending: e.pending,
        completed: 0,
        start: mediaUploadStartAt[e.kind] as number,
      };
    } else if (e.type === "media_upload_complete") {
      if (mediaUploadStartAt[e.kind] && e.ms === undefined) {
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        e.ms = Math.max(
          0,
          Math.round(now - (mediaUploadStartAt[e.kind] as number))
        );
      }
      const batch = mediaBatch[e.kind];
      if (batch) {
        batch.completed += 1;
        if (batch.completed >= batch.pending) {
          const now =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const totalMs = Math.max(0, Math.round(now - batch.start));
          emitCharterFormEvent({
            type: "media_batch_complete",
            kind: e.kind,
            count: batch.pending,
            ms: totalMs,
          });
          delete mediaBatch[e.kind];
        }
      }
    }
    subscriber?.(e);
  } catch {
    // swallow to avoid impacting UX
  }
}

// --- Lazy group tracking ----------------------------------------------------
// Some views (like the preview panel) comprise multiple lazy chunks. We expose
// a lightweight tracker so that the app can emit a higher-level 'preview_ready'
// event once all expected chunks for a group have loaded.

type LazyGroupState = {
  expected: Set<string>;
  loaded: Set<string>;
  start: number; // performance.now() when registered
  done?: boolean; // whether preview_ready has fired
};

const lazyGroups: Record<string, LazyGroupState> = {};

export function registerLazyGroup(group: string, componentNames: string[]) {
  if (lazyGroups[group]) return; // idempotent
  lazyGroups[group] = {
    expected: new Set(componentNames),
    loaded: new Set(),
    start: typeof performance !== "undefined" ? performance.now() : 0,
  };
}

/**
 * Mark a lazy component as loaded (with an optional measured ms). This will:
 * 1. Emit a lazy_component_loaded event (with group attribution)
 * 2. If all components in the group are now loaded, emit preview_ready.
 */
export function trackLazyComponentLoad(
  group: string | undefined,
  name: string,
  ms?: number
) {
  emitCharterFormEvent({ type: "lazy_component_loaded", name, ms, group });
  if (ms !== undefined && ms > LAZY_COMPONENT_BUDGET_MS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[charter-form] Lazy component '${name}' exceeded budget (${ms}ms > ${LAZY_COMPONENT_BUDGET_MS}ms)`
      );
    }
  }
  if (!group) return;
  const g = lazyGroups[group];
  if (!g) return;
  g.loaded.add(name);
  if (g.loaded.size === g.expected.size) {
    if (g.done) return; // already emitted preview_ready
    const end =
      typeof performance !== "undefined" ? performance.now() : g.start;
    emitCharterFormEvent({
      type: "preview_ready",
      group,
      names: Array.from(g.loaded.values()),
      totalMs: end - g.start || undefined,
    });
    g.done = true;
  }
}

// Optional: development console logger (opt-in)
export function enableCharterFormConsoleLogging() {
  setCharterFormAnalyticsListener((e) => {
    console.debug("[charter-form:event]", e);
  });
}

// Auto-enable console logging if debug env flag present (client-only safeguard)
if (
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1"
) {
  try {
    enableCharterFormConsoleLogging();
  } catch {
    // ignore
  }
}

// Test-only utility (exported for Vitest). Not for production use.
export function __resetCharterFormAnalyticsForTests() {
  subscriber = null;
  LAST_STEP_VIEW.step = undefined;
  LAST_STEP_VIEW.index = undefined;
  LAST_STEP_VIEW.t = undefined;
  finalizeAttemptAt = null;
  (
    Object.keys(mediaUploadStartAt) as Array<keyof typeof mediaUploadStartAt>
  ).forEach((k) => delete mediaUploadStartAt[k]);
  (Object.keys(mediaBatch) as Array<keyof typeof mediaBatch>).forEach(
    (k) => delete mediaBatch[k]
  );
  (Object.keys(lazyGroups) as Array<keyof typeof lazyGroups>).forEach(
    (k) => delete lazyGroups[k]
  );
}
