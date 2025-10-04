import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  charterFormSchema,
  type CharterFormValues,
} from "../charterForm.schema";
import { useCharterSubmission } from "../hooks/useCharterSubmission";

const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Cap T",
    experienceYears: 5,
    bio: "Captain bio long enough for validation lorem ipsum dolor.",
    phone: "+60000001",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter Result Handling",
  state: "Selangor",
  city: "Shah Alam",
  startingPoint: "Dock",
  postcode: "40000",
  withoutBoat: false,
  latitude: 1,
  longitude: 1,
  description:
    "Description over forty chars long to satisfy validation rules here.",
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

describe("finalizeDraftSubmission result handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupFetch(ok: boolean, status = ok ? 200 : 400) {
    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.match(/\/api\/charter-drafts\/.*\/finalize$/)) {
          if (ok) {
            return new Response(JSON.stringify({ charterId: "c-ok" }), {
              status,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "validation" }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (
          url.match(/\/api\/charter-drafts\/.*$/) &&
          init?.method === "PATCH"
        ) {
          return new Response(
            JSON.stringify({ draft: { id: "d", version: 10 } }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response("{}", { status: 200 });
      }
    ) as unknown as typeof fetch;
  }

  const createHook = () => {
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

    return renderHook(() =>
      useCharterSubmission({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form: form as unknown as any,
        isEditing: false,
        currentCharterId: null,
        serverDraftId: "draft-pre",
        serverVersion: 1,
        saveServerDraftSnapshot: vi.fn().mockResolvedValue(11),
        existingImages: [
          { name: "img-1.webp", url: "https://cdn/x/img-1.webp" },
          { name: "img-2.webp", url: "https://cdn/x/img-2.webp" },
          { name: "img-3.webp", url: "https://cdn/x/img-3.webp" },
        ],
        existingVideos: [],
        defaultState: makeDefaults(),
        clearDraft: vi.fn(),
        initializeDraftState: vi.fn(),
        setLastSavedAt: vi.fn(),
        router: { push: vi.fn() },
      })
    );
  };

  it("returns ok=true on success", async () => {
    setupFetch(true);
    const hook = createHook();
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    expect(hook.result.current.submitState?.type).toBe("success");
  });

  it("returns ok=false and sets error message on validation failure", async () => {
    setupFetch(false, 400);
    const hook = createHook();
    await act(async () => {
      await hook.result.current.triggerSubmit();
    });
    expect(hook.result.current.submitState?.type).toBe("error");
    expect(hook.result.current.submitState?.message).toMatch(
      /Please fix|Submission failed/
    );
  });
});
