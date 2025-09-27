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
    experienceYears: 5,
    bio: "Captain bio long enough for validation lorem ipsum dolor.",
    phone: "+60000001",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter PreUpload",
  state: "Selangor",
  city: "Shah Alam",
  startingPoint: "Dock",
  postcode: "40000",
  latitude: 1,
  longitude: 1,
  description:
    "Description over forty chars long to satisfy validation rules here.",
  generatedDescription: undefined,
  tone: "friendly",
  supportedLanguages: ["ms"],
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

describe("finalize (pre-upload existingImages regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes existingImages in finalize payload when form.photos empty (create flow)", async () => {
    const existingImages = [
      { name: "img-1.webp", url: "https://cdn/x/img-1.webp" },
      { name: "img-2.webp", url: "https://cdn/x/img-2.webp" },
      { name: "img-3.webp", url: "https://cdn/x/img-3.webp" },
    ];

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

    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        fetchCalls.push({ url, init });
        if (url.match(/\/api\/charter-drafts\/.*\/finalize$/)) {
          return new Response(JSON.stringify({ charterId: "c-ok" }), {
            status: 200,
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

    const hook = renderHook(() =>
      useCharterSubmission({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form: form as unknown as any,
        isEditing: false,
        currentCharterId: null,
        serverDraftId: "draft-pre",
        serverVersion: 1,
        saveServerDraftSnapshot: vi.fn().mockResolvedValue(11),
        existingImages,
        existingVideos: [],
        defaultState: makeDefaults(),
        clearDraft: vi.fn(),
        initializeDraftState: vi.fn(),
        setLastSavedAt: vi.fn(),
        router: { push: vi.fn() },
      })
    ).result;

    await act(async () => {
      await hook.current.triggerSubmit();
    });

    const finalizeCall = fetchCalls.find((c) => c.url.endsWith("/finalize"));
    expect(finalizeCall).toBeTruthy();
    const body = (finalizeCall?.init?.body || "") as string;
    expect(body).toContain("img-1.webp");
    expect(body).toContain("img-2.webp");
    expect(body).toContain("img-3.webp");
  });
});
