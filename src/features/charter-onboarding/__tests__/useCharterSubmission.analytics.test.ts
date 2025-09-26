// NOTE: Mock BEFORE importing modules that consume analytics so that the mocked
// emitCharterFormEvent is the one bound inside submissionStrategies.ts.
import { describe, expect, it, vi } from "vitest";
vi.mock("@features/charter-onboarding/analytics", () => ({
  emitCharterFormEvent: vi.fn(),
}));

import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useCharterSubmission } from "@features/charter-onboarding/hooks/useCharterSubmission";
import { finalizeDraftSubmission } from "@features/charter-onboarding/submissionStrategies";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";

const defaults = (): CharterFormValues => ({
  operator: {
    displayName: "A",
    experienceYears: 1,
    bio: "Desc long enough for rules.",
    phone: "+1",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Name",
  state: "FL",
  city: "Miami",
  startingPoint: "Dock",
  postcode: "33101",
  latitude: 1,
  longitude: 1,
  description: "A valid description over forty characters in length here.",
  generatedDescription: undefined,
  tone: "friendly",
  boat: {
    name: "Boat",
    type: "Center",
    lengthFeet: 20,
    capacity: 4,
    features: ["GPS"],
  },
  amenities: ["Rods"],
  policies: {
    licenseProvided: true,
    catchAndKeep: true,
    catchAndRelease: true,
    childFriendly: true,
    liveBaitProvided: true,
    alcoholNotAllowed: true,
    smokingNotAllowed: true,
  },
  pickup: { available: false, fee: null, areas: [], notes: "" },
  trips: [
    {
      name: "Trip",
      tripType: "inshore",
      price: 100,
      durationHours: 4,
      startTimes: ["07:00"],
      maxAnglers: 4,
      charterStyle: "private",
      description: "Trip",
      species: [],
      techniques: [],
    },
  ],
  photos: [],
  videos: [],
});

describe("useCharterSubmission analytics", () => {
  it("emits finalize_attempt and finalize_success events", async () => {
    const { emitCharterFormEvent } = await import(
      "@features/charter-onboarding/analytics"
    );
    const values = defaults();
    // Inject required photos
    const mk = (n: string) => new File(["x"], n, { type: "image/jpeg" });
    values.photos = [mk("a.jpg"), mk("b.jpg"), mk("c.jpg")];

    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/finalize")) {
          return new Response(JSON.stringify({ charterId: "cid" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/charter-drafts/") && init?.method === "PATCH") {
          return new Response(
            JSON.stringify({ draft: { id: "d", version: 2 } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url === "/api/blob/upload") {
          return new Response(JSON.stringify({ key: "k", url: "u" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 200 });
      }
    ) as unknown as typeof fetch;

    const push = vi.fn();
    await finalizeDraftSubmission({
      values,
      isEditing: false,
      serverDraftId: "draft-x",
      currentCharterId: null,
      serverVersion: 1,
      saveServerDraftSnapshot: vi.fn().mockResolvedValue(2),
      setSubmitState: vi.fn(),
      defaultState: defaults(),
      formReset: vi.fn(),
      clearDraft: vi.fn(),
      initializeDraftState: vi.fn(),
      setLastSavedAt: vi.fn(),
      router: { push },
    });

    type Ev = { type: string; [k: string]: unknown };
    const calls: Ev[] = (
      emitCharterFormEvent as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c) => c[0] as Ev);
    if (!calls.find((e) => e.type === "finalize_attempt")) {
      console.warn("[TEST DEBUG] analytics mock calls:", calls);
    }
    expect(calls.find((e) => e.type === "finalize_attempt")).toBeTruthy();
    expect(calls.find((e) => e.type === "finalize_success")).toBeTruthy();
    expect(push).toHaveBeenCalledWith("/thank-you");
  });

  it("edit path performs PATCH save (no finalize events or navigation)", async () => {
    // Reset analytics mock calls from prior test
    const { emitCharterFormEvent } = await import(
      "@features/charter-onboarding/analytics"
    );
    (emitCharterFormEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const form = renderHook(() =>
      useForm<CharterFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(charterFormSchema) as unknown as any,
        defaultValues: defaults(),
      })
    ).result.current;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/charters/charter-1")) {
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const push = vi.fn();
    const hook = renderHook(() =>
      useCharterSubmission({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form: form as any,
        isEditing: true,
        currentCharterId: "charter-1",
        serverDraftId: null,
        serverVersion: null,
        saveServerDraftSnapshot: vi.fn(),
        existingImages: [
          { name: "a", url: "u" },
          { name: "b", url: "u" },
          { name: "c", url: "u" },
        ],
        defaultState: defaults(),
        clearDraft: vi.fn(),
        initializeDraftState: vi.fn(),
        setLastSavedAt: vi.fn(),
        router: { push },
      })
    );

    await act(async () => {
      await hook.result.current.triggerSubmit();
    });

    // In edit mode we only perform a PATCH save; no navigation or finalize events.
    expect(push).not.toHaveBeenCalled();
    type Ev = { type: string };
    const events: Ev[] = (
      emitCharterFormEvent as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.map((c) => c[0] as Ev);
    // No finalize events expected during edit save.
    expect(events.find((e) => e.type === "finalize_attempt")).toBeUndefined();
    expect(events.find((e) => e.type === "finalize_success")).toBeUndefined();
  });
});
