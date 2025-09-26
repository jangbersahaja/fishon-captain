import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useCharterSubmission } from "@features/charter-onboarding/hooks/useCharterSubmission";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Cap T",
    experienceYears: 3,
    bio: "Bio long enough for schema validation lorem ipsum dolor.",
    phone: "+60000001",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter Z",
  state: "Selangor",
  city: "Shah Alam",
  startingPoint: "Dock",
  postcode: "40000",
  latitude: 1,
  longitude: 1,
  description: "A valid description over forty characters in length here.",
  generatedDescription: undefined,
  tone: "friendly",
  boat: {
    name: "Boat",
    type: "Center",
    lengthFeet: 30,
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
      name: "Half Day",
      tripType: "inshore",
      price: 400,
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

describe("useCharterSubmission (extended)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSetup = (opts: {
    draftId?: string;
    patchedVersion?: number; // value saveServerDraftSnapshot returns
    serverVersion?: number | null;
  }) => {
    const form = renderHook(() =>
      useForm<CharterFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(charterFormSchema) as unknown as any,
        defaultValues: makeDefaults(),
        mode: "onBlur",
      })
    ).result.current as unknown as ReturnType<
      typeof useForm<CharterFormValues>
    >;

    const push = vi.fn();
    const clearDraft = vi.fn();
    const initializeDraftState = vi.fn();
    const setLastSavedAt = vi.fn();
    const saveServerDraftSnapshot = vi
      .fn()
      .mockResolvedValue(opts.patchedVersion ?? 5);

    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        fetchCalls.push({ url, init });

        if (url === "/api/blob/upload") {
          // avatar or media upload
          return new Response(
            JSON.stringify({
              key: `up-${fetchCalls.length}.jpg`,
              url: `https://cdn/x/${fetchCalls.length}.jpg`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (url.match(/\/api\/charter-drafts\/.*\/finalize$/)) {
          // Provide success unless test overrides via patchedVersion sentinel
          return new Response(JSON.stringify({ charterId: "c-final" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          url.match(/\/api\/charter-drafts\/.*$/) &&
          init?.method === "PATCH"
        ) {
          return new Response(
            JSON.stringify({
              draft: {
                id: opts.draftId || "d-ext",
                version: (opts.patchedVersion ?? 5) + 1,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("{}", { status: 200 });
      }
    ) as unknown as typeof fetch;

    const hook = renderHook(() =>
      useCharterSubmission({
        form: form as unknown as any,
        isEditing: false,
        currentCharterId: null,
        serverDraftId: opts.draftId || "draft-ext",
        serverVersion: opts.serverVersion ?? 2,
        saveServerDraftSnapshot,
        existingImages: [],
        defaultState: makeDefaults(),
        clearDraft,
        initializeDraftState,
        setLastSavedAt,
        router: { push },
      })
    );
    return {
      hook,
      form,
      fetchCalls,
      push,
      saveServerDraftSnapshot,
      clearDraft,
      initializeDraftState,
    };
  };

  it("sends x-draft-version header from patched snapshot version", async () => {
    const { hook, form, fetchCalls, saveServerDraftSnapshot } = baseSetup({
      patchedVersion: 42,
      draftId: "draft-v",
    });
    // satisfy media minimum by adding 3 photos
    act(() => {
      const mk = (n: string) => new File(["x"], n, { type: "image/jpeg" });
      form.setValue("photos", [mk("a.jpg"), mk("b.jpg"), mk("c.jpg")]);
    });
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    const finalizeCall = fetchCalls.find((c) => c.url.endsWith("/finalize"));
    expect(finalizeCall).toBeTruthy();
    expect(saveServerDraftSnapshot).toHaveBeenCalledTimes(1);
    expect(finalizeCall?.init?.headers).toMatchObject({
      "x-draft-version": "42",
    });
  });

  it("includes avatar in finalize payload when provided", async () => {
    const { hook, form, fetchCalls } = baseSetup({
      patchedVersion: 7,
      draftId: "draft-avatar",
    });
    act(() => {
      const mk = (n: string) => new File(["x"], n, { type: "image/jpeg" });
      form.setValue("photos", [mk("a.jpg"), mk("b.jpg"), mk("c.jpg")]);
      form.setValue(
        "operator.avatar",
        new File(["bin"], "avatar.jpg", { type: "image/jpeg" })
      );
    });
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    const finalizeCall = fetchCalls.find((c) => c.url.endsWith("/finalize"));
    expect(finalizeCall).toBeTruthy();
    const body = finalizeCall?.init?.body as string;
    expect(body).toContain("avatar");
  });

  it("surfaces validation style error message when finalize returns validation error", async () => {
    // Custom fetch returning validation error for finalize
    const { hook, form } = baseSetup({});
    // Override global.fetch for this test AFTER base setup initialises saveServerDraftSnapshot
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.match(/\/finalize$/)) {
          return new Response(JSON.stringify({ error: "validation" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (
          url.match(/\/api\/charter-drafts\/.*$/) &&
          init?.method === "PATCH"
        ) {
          return new Response(
            JSON.stringify({ draft: { id: "d", version: 3 } }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify({ key: "k", url: "u" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    );
    act(() => {
      const mk = (n: string) => new File(["x"], n, { type: "image/jpeg" });
      form.setValue("photos", [mk("a.jpg"), mk("b.jpg"), mk("c.jpg")]);
    });
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    expect(hook.result.current.submitState?.type).toBe("error");
    expect(hook.result.current.submitState?.message).toMatch(
      /fix highlighted/i
    );
  });

  it("reports save failed when PATCH edit returns non-200", async () => {
    // editing scenario separate from baseSetup (reuse logic with manual config)
    const form = renderHook(() =>
      useForm<CharterFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(charterFormSchema) as unknown as any,
        defaultValues: makeDefaults(),
      })
    ).result.current as unknown as ReturnType<
      typeof useForm<CharterFormValues>
    >;

    (
      global.fetch as unknown as ReturnType<typeof vi.fn> | undefined
    )?.mockReset?.();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.match(/\/api\/charters\/charter-bad$/)) {
        return new Response("{}", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const hook = renderHook(() =>
      useCharterSubmission({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form: form as unknown as any,
        isEditing: true,
        currentCharterId: "charter-bad",
        serverDraftId: null,
        serverVersion: null,
        saveServerDraftSnapshot: vi.fn(),
        existingImages: [],
        defaultState: makeDefaults(),
        clearDraft: vi.fn(),
        initializeDraftState: vi.fn(),
        setLastSavedAt: vi.fn(),
        router: { push: vi.fn() },
      })
    );

    await act(async () => {
      await hook.result.current.saveEditChanges();
    });
    expect(hook.result.current.submitState?.type).toBe("error");
    expect(hook.result.current.submitState?.message.toLowerCase()).toMatch(
      /save failed|save error/
    );
  });
});
