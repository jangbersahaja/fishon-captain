// debug.ts - lightweight runtime debug flag helpers for the charter form

// Global window extension
declare global {
  interface Window {
    __FISHON_DEBUG_FORM?: boolean;
  }
}

// Enable rules:
// 1. Programmatic: window.__FISHON_DEBUG_FORM = true
// 2. Query param once: ?debugForm=1 (persists via localStorage)
// 3. Local storage flag: localStorage.setItem('fishon_debug_form','1')
// 4. Keyboard toggle (added in FormSection): cmd+shift+D (mac) / ctrl+shift+D
// 5. Build-time env: NEXT_PUBLIC_CHARTER_FORM_DEBUG=1

const ENV_DEBUG = process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1";

export function isFormDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__FISHON_DEBUG_FORM) return true;
  // Build-time env var (inlined by Next.js) acts as an always-on switch
  if (ENV_DEBUG) {
    window.__FISHON_DEBUG_FORM = true;
    return true;
  }
  try {
    // Query param bootstrap (idempotent)
    if (
      typeof window.location !== "undefined" &&
      window.location.search.includes("debugForm=1")
    ) {
      window.__FISHON_DEBUG_FORM = true;
      try {
        localStorage.setItem("fishon_debug_form", "1");
      } catch {}
      return true;
    }
    // Local storage persistence
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("fishon_debug_form") === "1"
    ) {
      window.__FISHON_DEBUG_FORM = true;
      return true;
    }
  } catch {
    // ignore access issues (e.g. privacy mode)
  }
  return false;
}

export function setFormDebug(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.__FISHON_DEBUG_FORM = enabled;
  try {
    if (enabled) localStorage.setItem("fishon_debug_form", "1");
    else localStorage.removeItem("fishon_debug_form");
  } catch {}
  console.log(`[FormDebug] ${enabled ? "ENABLED" : "DISABLED"}`);
}

export function logFormDebug(label: string, payload?: Record<string, unknown>) {
  if (!isFormDebug()) return;
  // Use console.debug so it can be filtered easily
  console.debug(`[FormDebug] ${label}`, payload || {});
}
