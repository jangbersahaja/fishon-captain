import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCharterFormAnalyticsForTests,
  emitCharterFormEvent,
  setCharterFormAnalyticsListener,
  type AnalyticsEvent,
} from "../analytics";

/**
 * Verifies media batch timing + completion aggregation logic.
 */

describe("media batch analytics", () => {
  const events: AnalyticsEvent[] = [];
  beforeEach(() => {
    __resetCharterFormAnalyticsForTests();
    events.length = 0;
    setCharterFormAnalyticsListener((e) => events.push(e));
  });

  function find(type: AnalyticsEvent["type"]) {
    return events.filter((e) => e.type === type);
  }

  it("emits media_batch_complete after all items finished", () => {
    emitCharterFormEvent({
      type: "media_upload_start",
      kind: "photo",
      pending: 3,
    });
    emitCharterFormEvent({ type: "media_upload_complete", kind: "photo" });
    emitCharterFormEvent({ type: "media_upload_complete", kind: "photo" });
    // Not complete yet
    expect(find("media_batch_complete").length).toBe(0);
    emitCharterFormEvent({ type: "media_upload_complete", kind: "photo" });
    const batch = find("media_batch_complete");
    expect(batch.length).toBe(1);
    const evt = batch[0] as Extract<
      AnalyticsEvent,
      { type: "media_batch_complete" }
    >;
    expect(evt.kind).toBe("photo");
    expect(evt.count).toBe(3);
    // ms is optional but if present should be >= 0
    if (evt.ms !== undefined) expect(evt.ms).toBeGreaterThanOrEqual(0);
  });

  it("separate batches do not interfere", () => {
    emitCharterFormEvent({
      type: "media_upload_start",
      kind: "photo",
      pending: 1,
    });
    emitCharterFormEvent({
      type: "media_upload_start",
      kind: "video",
      pending: 2,
    });
    emitCharterFormEvent({ type: "media_upload_complete", kind: "photo" }); // completes photo batch
    emitCharterFormEvent({ type: "media_upload_complete", kind: "video" });
    const batch1 = find("media_batch_complete").filter(
      (e): e is Extract<AnalyticsEvent, { type: "media_batch_complete" }> =>
        e.type === "media_batch_complete" && e.kind === "photo"
    );
    expect(batch1.length).toBe(1);
    // video not done yet
    const videoBatch = find("media_batch_complete").filter(
      (e): e is Extract<AnalyticsEvent, { type: "media_batch_complete" }> =>
        e.type === "media_batch_complete" && e.kind === "video"
    );
    expect(videoBatch.length).toBe(0);
    emitCharterFormEvent({ type: "media_upload_complete", kind: "video" });
    const videoDone = find("media_batch_complete").filter(
      (e): e is Extract<AnalyticsEvent, { type: "media_batch_complete" }> =>
        e.type === "media_batch_complete" && e.kind === "video"
    );
    expect(videoDone.length).toBe(1);
  });
});
