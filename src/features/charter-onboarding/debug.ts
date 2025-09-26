// debug.ts - lightweight runtime debug flag helpers for the charter form

// Global window extension
declare global {
  interface Window {
    __FISHON_DEBUG_FORM?: boolean;
  }
}

export function isFormDebug(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.__FISHON_DEBUG_FORM;
}

export function logFormDebug(label: string, payload?: Record<string, unknown>) {
  if (!isFormDebug()) return;
  console.debug(`[FormDebug] ${label}`, payload || {});
}
