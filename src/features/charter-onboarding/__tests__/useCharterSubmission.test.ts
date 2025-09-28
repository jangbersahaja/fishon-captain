import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useCharterSubmission } from "@features/charter-onboarding/hooks/useCharterSubmission";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal defaults (can reuse shape from other tests if exported later)
const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Cap Test",
    experienceYears: 2,
    bio: "Experienced captain with safe trips",
    phone: "+60000000",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter X",
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
  supportedLanguages: ["Malay", "English"],
  uploadedPhotos: [],
  uploadedVideos: [],
});

describe("useCharterSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (opts: {
    isEditing: boolean;
    existingImages?: { name: string; url: string }[];
    draftId?: string | null;
    version?: number | null;
  }) => {
    const form = renderHook(() =>
      useForm<CharterFormValues>({
        // Casting resolver for test loosened typing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(charterFormSchema) as unknown as any,
        defaultValues: makeDefaults(),
        mode: "onBlur",
      })
    ).result.current as unknown as ReturnType<
      typeof useForm<CharterFormValues>
    >;
    const push = vi.fn();
    const saveServerDraftSnapshot = vi
      .fn()
      .mockResolvedValue(opts.version ?? 1);
    global.fetch = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      if (opts.isEditing && url.startsWith("/api/charters/")) {
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!opts.isEditing && url.includes("/finalize")) {
        return new Response(JSON.stringify({ charterId: "c-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        !opts.isEditing &&
        url.startsWith("/api/charter-drafts/") &&
        init?.method === "PATCH"
      ) {
        return new Response(
          JSON.stringify({
            draft: {
              id: opts.draftId || "d1",
              version: (opts.version ?? 1) + 1,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // upload endpoint
      if (url === "/api/blob/upload") {
        return new Response(JSON.stringify({ key: "k.jpg", url: "u.jpg" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const hook = renderHook(() =>
      useCharterSubmission({
        // form cast relaxed for test environment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form: form as unknown as any,
        isEditing: opts.isEditing,
        currentCharterId: opts.isEditing ? "charter-1" : null,
        serverDraftId: opts.isEditing ? null : opts.draftId ?? "draft-1",
        serverVersion: opts.version ?? 1,
        saveServerDraftSnapshot,
        existingImages: opts.existingImages || [],
        defaultState: makeDefaults(),
        clearDraft: vi.fn(),
        initializeDraftState: vi.fn(),
        setLastSavedAt: vi.fn(),
        router: { push },
      })
    );
    return { hook, form, push, saveServerDraftSnapshot };
  };

  it("PATCHes charter when editing (saveEditChanges)", async () => {
    const { hook } = setup({ isEditing: true });
    await act(async () => {
      await hook.result.current.saveEditChanges();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/charters\/charter-1$/),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(hook.result.current.submitState?.type).toBe("success");
  });

  it("finalizes draft when creating (triggerSubmit)", async () => {
    const { hook, form } = setup({
      isEditing: false,
      draftId: "draft-9",
      version: 3,
    });
    // Provide 3 photo files to satisfy schema min(3)
    act(() => {
      const mk = (n: string) => new File(["x"], n, { type: "image/jpeg" });
      form.setValue("photos", [mk("a.jpg"), mk("b.jpg"), mk("c.jpg")]);
    });
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    // finalize endpoint call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/charter-drafts\/draft-9\/finalize/),
      expect.objectContaining({ method: "POST" })
    );
    expect(hook.result.current.submitState?.type).toBe("success");
  });

  it("bypasses form validation path when editing with existing images (triggerSubmit)", async () => {
    const { hook, form } = setup({
      isEditing: true,
      existingImages: [
        { name: "a", url: "u" },
        { name: "b", url: "u" },
        { name: "c", url: "u" },
      ],
    });
    // Intentionally make form invalid (empty required field) to confirm bypass
    act(() => form.setValue("charterName", ""));
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    // Should still attempt PATCH (saveEditChanges flow) despite invalid value
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/charters\/charter-1$/),
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
