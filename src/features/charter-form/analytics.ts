// Lightweight instrumentation helpers for the charter form feature.
// These are intentionally no-op by default so they can be wired to a real
// analytics backend later without changing call sites.

export type AnalyticsEvent =
  | { type: "step_view"; step: string; index: number }
  | { type: "step_complete"; step: string; index: number }
  | { type: "draft_saved"; server: boolean; version?: number | null }
  | { type: "finalize_attempt" }
  | { type: "finalize_success"; charterId: string; ms?: number }
  | { type: "validation_errors"; step: string; count: number }
  | { type: "media_upload_start"; kind: "photo" | "video"; pending: number }
  | { type: "media_upload_complete"; kind: "photo" | "video" }
  | { type: "conflict_resolution"; serverVersion: number }
  | { type: "lazy_component_loaded"; name: string; ms?: number; group?: string }
  | { type: "preview_ready"; group: string; names: string[]; totalMs?: number };

let subscriber: ((e: AnalyticsEvent) => void) | null = null;
// Dedupe state for step_view
const LAST_STEP_VIEW: { step?: string; index?: number; t?: number } = {};
const STEP_VIEW_DEDUPE_WINDOW_MS = 800; // avoid noisy repeats when state re-renders

export function setCharterFormAnalyticsListener(
  fn: (e: AnalyticsEvent) => void
) {
  subscriber = fn;
}

export function emitCharterFormEvent(e: AnalyticsEvent) {
  try {
    if (e.type === "step_view") {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
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
  emitCharterFormEvent({
    type: "lazy_component_loaded",
    name,
    ms,
    group,
  });
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
