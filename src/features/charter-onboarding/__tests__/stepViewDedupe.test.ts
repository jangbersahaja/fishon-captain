import {
  __resetCharterFormAnalyticsForTests,
  emitCharterFormEvent,
  setCharterFormAnalyticsListener,
} from "@features/charter-onboarding/analytics";
import { beforeEach, describe, expect, it } from "vitest";

describe("analytics step_view dedupe", () => {
  beforeEach(() => {
    __resetCharterFormAnalyticsForTests();
  });

  it("suppresses rapid duplicate step_view within window", () => {
    const events: { type: string; [k: string]: unknown }[] = [];
    setCharterFormAnalyticsListener((e) => events.push(e));
    emitCharterFormEvent({ type: "step_view", step: "basics", index: 0 });
    emitCharterFormEvent({ type: "step_view", step: "basics", index: 0 });
    expect(events.filter((e) => e.type === "step_view").length).toBe(1);
  });

  it("allows different step or index immediately", () => {
    const events: { type: string; [k: string]: unknown }[] = [];
    setCharterFormAnalyticsListener((e) => events.push(e));
    emitCharterFormEvent({ type: "step_view", step: "basics", index: 0 });
    emitCharterFormEvent({ type: "step_view", step: "trips", index: 1 });
    expect(events.filter((e) => e.type === "step_view").length).toBe(2);
  });
});
