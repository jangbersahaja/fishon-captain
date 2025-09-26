import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCharterFormAnalyticsForTests,
  emitCharterFormEvent,
  setCharterFormAnalyticsListener,
  type AnalyticsEvent,
} from "../analytics";

/**
 * Ensures finalize timing logic auto-injects ms when omitted and does not
 * override an explicitly provided ms value.
 */
describe("finalize timing analytics", () => {
  const events: AnalyticsEvent[] = [];
  beforeEach(() => {
    __resetCharterFormAnalyticsForTests();
    events.length = 0;
    setCharterFormAnalyticsListener((e) => events.push(e));
  });

  function last<T extends AnalyticsEvent["type"]>(type: T) {
    const filtered = events.filter((e) => e.type === type) as Extract<
      AnalyticsEvent,
      { type: T }
    >[];
    return filtered[filtered.length - 1];
  }

  it("injects ms automatically when finalize_success has no ms", async () => {
    emitCharterFormEvent({ type: "finalize_attempt" });
    // Small real delay to ensure non-zero potential timing (not required but realistic)
    await new Promise((r) => setTimeout(r, 5));
    emitCharterFormEvent({ type: "finalize_success", charterId: "c1" });
    const success = last("finalize_success");
    expect(success).toBeTruthy();
    if (!success) throw new Error("finalize_success not emitted");
    expect(success.ms).not.toBeUndefined();
    // Non-negative; may be small depending on environment clock resolution
    if (typeof success.ms === "number") {
      expect(success.ms).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves provided ms and does not overwrite", () => {
    emitCharterFormEvent({ type: "finalize_attempt" });
    emitCharterFormEvent({
      type: "finalize_success",
      charterId: "c2",
      ms: 999,
    });
    const success = last("finalize_success");
    expect(success).toBeTruthy();
    if (!success) throw new Error("finalize_success not emitted");
    expect(success.ms).toBe(999);
  });
});
