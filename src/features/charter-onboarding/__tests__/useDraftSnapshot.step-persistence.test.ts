/**
 * Test to replicate the exact step persistence issue:
 * 1. Reload (fresh state)
 * 2. Fill in basic step field
 * 3. Click next
 * Expected: currentStep should save as 1, but currently saves as 0
 */
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultCharterFormValues } from "../charterForm.defaults";
import type { CharterFormValues } from "../charterForm.schema";
import { useDraftSnapshot } from "../hooks/useDraftSnapshot";
import { useStepNavigation } from "../hooks/useStepNavigation";

// Mock fetch to simulate server responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Enable debug logging for this test
process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG = "1";

// Mock console methods to capture debug logs
const consoleLogs: string[] = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
  consoleLogs.push(message);
  originalConsoleLog(...args);
};

interface MockWindow {
  location: { hash: string };
  scrollTo: ReturnType<typeof vi.fn>;
  addEventListener?: ReturnType<typeof vi.fn>;
  removeEventListener?: ReturnType<typeof vi.fn>;
}

describe("Draft Snapshot Step Persistence Issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogs.length = 0;

    // Reset environment
    delete (global as unknown as { window?: MockWindow }).window;
    (global as unknown as { window: MockWindow }).window = {
      location: { hash: "" },
      scrollTo: vi.fn(),
    };
  });

  it("DEBUG: focus on handleNext flow - why no PATCH on next?", async () => {
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      console.log(`[TEST] Fetch called: ${url}`, options?.method);

      if (
        url.includes("/api/charter-drafts/test-draft-id") &&
        options?.method === "PATCH"
      ) {
        const body = JSON.parse(options.body as string);
        console.log(`[TEST] PATCH payload:`, body);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            draft: {
              id: "test-draft-id",
              version: body.clientVersion + 1,
              currentStep: body.currentStep,
              data: body.dataPartial,
            },
          }),
        };
      }

      return { ok: false, status: 404 };
    });

    const { result: formResult } = renderHook(() =>
      useForm<CharterFormValues>({
        mode: "onBlur",
        defaultValues: createDefaultCharterFormValues(),
      })
    );

    const { result: draftResult } = renderHook(() =>
      useDraftSnapshot({
        form: formResult.current,
        isEditing: false,
        serverDraftId: "test-draft-id",
        serverVersion: 100,
        initialStep: 0,
        setServerVersion: vi.fn(),
        setLastSavedAt: vi.fn(),
        setServerSaving: vi.fn(),
      })
    );

    // Mock window for useStepNavigation
    (global as unknown as { window: MockWindow }).window.addEventListener =
      vi.fn();
    (global as unknown as { window: MockWindow }).window.removeEventListener =
      vi.fn();

    const { result: navResult } = renderHook(() =>
      useStepNavigation({
        form: formResult.current,
        isEditing: false,
        existingImagesCount: 0,
        saveServerDraftSnapshot: () =>
          draftResult.current.saveServerDraftSnapshot(),
        setSnapshotCurrentStep: (step: number) =>
          draftResult.current.setCurrentStep(step),
      })
    );

    console.log("\n=== SCENARIO START: NO SAVES YET ===");

    // Fill ALL required basic fields so validation passes
    await act(async () => {
      formResult.current.setValue("operator.displayName", "Test Captain");
      formResult.current.setValue("operator.experienceYears", 5);
      formResult.current.setValue(
        "operator.bio",
        "Experienced charter captain"
      );
      formResult.current.setValue("operator.phone", "+1234567890");
      formResult.current.setValue("charterType", "lake");
      formResult.current.setValue("charterName", "Test Charter");
      formResult.current.setValue("state", "CA");
      formResult.current.setValue("city", "San Francisco");
      formResult.current.setValue("startingPoint", "Marina");
      formResult.current.setValue("postcode", "94105");
      formResult.current.setValue("latitude", 37.7749);
      formResult.current.setValue("longitude", -122.4194);
      console.log(
        "[TEST] Filled all basic fields, form dirty:",
        formResult.current.formState.isDirty
      );
    });

    console.log("\n=== CLICK NEXT (should trigger save before advance) ===");
    console.log(
      "Form values before handleNext:",
      formResult.current.getValues()
    );
    console.log(
      "Form errors before handleNext:",
      formResult.current.formState.errors
    );

    // This should be the key moment - handleNext should trigger a save
    await act(async () => {
      await navResult.current.handleNext();
    });

    console.log("\n=== AFTER HANDLE NEXT ===");
    console.log("Current step:", navResult.current.currentStep);
    console.log("Step errors:", navResult.current.stepErrorSummary);

    // Wait a bit for any async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    console.log("\n=== FINAL CONSOLE LOGS ===");
    consoleLogs.forEach((log, i) => console.log(`${i}: ${log}`));

    // Check what PATCH calls were made
    const patchCalls = mockFetch.mock.calls.filter(
      ([url, options]) =>
        url.includes("/api/charter-drafts/test-draft-id") &&
        (options as RequestInit)?.method === "PATCH"
    );

    console.log(`\n=== PATCH CALLS: ${patchCalls.length} ===`);
    patchCalls.forEach((call, i) => {
      const body = JSON.parse(((call[1] as RequestInit) || {}).body as string);
      console.log(
        `PATCH ${i}: currentStep=${body.currentStep}, clientVersion=${body.clientVersion}`
      );
    });

    // The key assertion: handleNext should have triggered a PATCH
    expect(patchCalls.length).toBeGreaterThan(0);

    // And that PATCH should have currentStep: 1
    const lastPatch = patchCalls[patchCalls.length - 1];
    if (lastPatch) {
      const body = JSON.parse((lastPatch[1] as RequestInit).body as string);
      expect(body.currentStep).toBe(1);
    }
  });

  it("should show the race condition when step changes during in-flight save", async () => {
    let resolveFirstSave: (value: unknown) => void;
    const firstSavePromise = new Promise((resolve) => {
      resolveFirstSave = resolve;
    });

    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (
        url.includes("/api/charter-drafts/test-draft-id") &&
        options?.method === "PATCH"
      ) {
        const body = JSON.parse((options as RequestInit).body as string);
        console.log(`[TEST] PATCH with step ${body.currentStep}, waiting...`);

        // First save waits for manual resolution
        await firstSavePromise;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            draft: {
              id: "test-draft-id",
              version: body.clientVersion + 1,
              currentStep: body.currentStep,
              data: body.dataPartial,
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const { result: formResult } = renderHook(() =>
      useForm<CharterFormValues>({
        mode: "onBlur",
        defaultValues: createDefaultCharterFormValues(),
      })
    );

    const { result: draftResult } = renderHook(() =>
      useDraftSnapshot({
        form: formResult.current,
        isEditing: false,
        serverDraftId: "test-draft-id",
        serverVersion: 100,
        initialStep: 0,
        setServerVersion: vi.fn(),
        setLastSavedAt: vi.fn(),
        setServerSaving: vi.fn(),
      })
    );

    // Start first save (will hang until we resolve it)
    const save1Promise = act(async () => {
      return draftResult.current.saveServerDraftSnapshot();
    });

    // While first save is in-flight, change step and trigger second save
    await act(async () => {
      draftResult.current.setCurrentStep(1);
      // This should hit "reuse in-flight promise" and set pending flag
      draftResult.current.saveServerDraftSnapshot();
    });

    // Now resolve the first save - this should trigger the follow-up
    act(() => {
      resolveFirstSave({});
    });

    await save1Promise;

    // Wait for follow-up to execute
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Check logs
    const hasReuseLog = consoleLogs.some((log) =>
      log.includes("reuse in-flight promise")
    );
    const hasStepChangeLog = consoleLogs.some((log) =>
      log.includes("step changed but save is in-flight")
    );
    const hasFollowUpLog = consoleLogs.some((log) =>
      log.includes("in-flight save completed, executing follow-up save")
    );

    expect({ hasReuseLog, hasStepChangeLog, hasFollowUpLog }).toEqual({
      hasReuseLog: true,
      hasStepChangeLog: true,
      hasFollowUpLog: true,
    });
  });
});
