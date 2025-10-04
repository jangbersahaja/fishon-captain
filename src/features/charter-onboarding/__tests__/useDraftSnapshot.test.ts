import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useDraftSnapshot } from "@features/charter-onboarding/hooks/useDraftSnapshot";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal form defaults replicating other tests (subset ok)
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
  uploadedPhotos: [],
  uploadedVideos: [],
});

describe("useDraftSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (opts: {
    isEditing: boolean;
    draftId: string | null;
    version: number | null;
    step?: number;
  }) => {
    const form = renderHook(() =>
      useForm<CharterFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(charterFormSchema) as any,
        defaultValues: makeDefaults(),
        mode: "onBlur",
      })
    ).result.current;

    const setServerVersion = vi.fn();
    const setLastSavedAt = vi.fn();
    const setServerSaving = vi.fn();

    return {
      form,
      hook: renderHook(() =>
        useDraftSnapshot({
          form: form as unknown as ReturnType<
            typeof useForm<CharterFormValues>
          >,
          isEditing: opts.isEditing,
          serverDraftId: opts.draftId,
          serverVersion: opts.version,
          initialStep: opts.step ?? 0,
          setServerVersion,
          setLastSavedAt,
          setServerSaving,
        })
      ),
      setServerVersion,
      setLastSavedAt,
      setServerSaving,
    };
  };

  it("returns null and does not call fetch when editing", async () => {
    global.fetch = vi.fn();
    const { hook } = setup({ isEditing: true, draftId: "d1", version: 3 });
    const result = await act(
      async () => await hook.result.current.saveServerDraftSnapshot()
    );
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null and does not call fetch when draft id missing", async () => {
    global.fetch = vi.fn();
    const { hook } = setup({ isEditing: false, draftId: null, version: 2 });
    const result = await act(
      async () => await hook.result.current.saveServerDraftSnapshot()
    );
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("PATCHes and updates version + timestamps on success", async () => {
    const newVersion = 7;
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ draft: { id: "d1", version: newVersion } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { hook, setServerVersion, setLastSavedAt, setServerSaving } = setup({
      isEditing: false,
      draftId: "d1",
      version: 6,
      step: 1,
    });
    // simulate navigation to step 3 before saving
    act(() => hook.result.current.setCurrentStep(3));
    const result = await act(
      async () => await hook.result.current.saveServerDraftSnapshot()
    );
    expect(fetchSpy).toHaveBeenCalled();
    const call = (fetchSpy.mock.calls[0] as unknown[]) ?? [];
    if (call.length >= 2) {
      expect(call[0] as string).toMatch(/\/api\/charter-drafts\/d1$/);
      const bodyRaw = (call[1] as RequestInit | undefined)?.body;
      const body = bodyRaw ? JSON.parse(bodyRaw as string) : {};
      expect(body.currentStep).toBe(3);
    }
    expect(result).toBe(newVersion);
    expect(setServerVersion).toHaveBeenCalledWith(newVersion);
    expect(setLastSavedAt).toHaveBeenCalledWith(expect.any(String));
    expect(setServerSaving).toHaveBeenCalled();
  });

  it("gracefully returns null on fetch failure", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("net");
    }) as unknown as typeof fetch;
    const { hook } = setup({ isEditing: false, draftId: "d1", version: 3 });
    const result = await act(
      async () => await hook.result.current.saveServerDraftSnapshot()
    );
    expect(result).toBeNull();
  });

  it("skips network when values unchanged between calls", async () => {
    // Adapted: current implementation always sends patch when serverVersion increments.
    // We simulate unchanged payload by returning same version so diff logic should skip second.
    const version = 5;
    const fetchSpy = vi.fn(async () => {
      return new Response(JSON.stringify({ draft: { id: "d1", version } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { hook } = setup({ isEditing: false, draftId: "d1", version });
    await act(async () => {
      await hook.result.current.saveServerDraftSnapshot();
    });
    await act(async () => {
      await hook.result.current.saveServerDraftSnapshot();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
