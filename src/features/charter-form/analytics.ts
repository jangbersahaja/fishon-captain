// Lightweight instrumentation helpers for the charter form feature.
// These are intentionally no-op by default so they can be wired to a real
// analytics backend later without changing call sites.

export type AnalyticsEvent =
  | { type: "step_view"; step: string; index: number }
  | { type: "step_complete"; step: string; index: number }
  | { type: "draft_saved"; server: boolean; version?: number | null }
  | { type: "finalize_attempt" }
  | { type: "finalize_success"; charterId: string }
  | { type: "validation_errors"; step: string; count: number }
  | { type: "media_upload_start"; kind: "photo" | "video"; pending: number }
  | { type: "media_upload_complete"; kind: "photo" | "video" }
  | { type: "conflict_resolution"; serverVersion: number };

let subscriber: ((e: AnalyticsEvent) => void) | null = null;

export function setCharterFormAnalyticsListener(
  fn: (e: AnalyticsEvent) => void
) {
  subscriber = fn;
}

export function emitCharterFormEvent(e: AnalyticsEvent) {
  try {
    subscriber?.(e);
  } catch {
    // swallow to avoid impacting UX
  }
}

// Optional: development console logger (opt-in)
export function enableCharterFormConsoleLogging() {
  setCharterFormAnalyticsListener((e) => {
    console.debug("[charter-form:event]", e);
  });
}
