import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCharterMediaManager } from "../hooks/useCharterMediaManager";

type MockPendingItem = {
  id: string;
  status: "QUEUED" | "TRANSCODING" | "READY" | "FAILED";
  kind: "IMAGE" | "VIDEO";
  finalKey?: string | null;
  finalUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
};

const pendingControl = {
  items: [] as MockPendingItem[],
  listeners: new Set<(items: MockPendingItem[]) => void>(),
};

const pushPendingItems = (items: MockPendingItem[]) => {
  pendingControl.items = items;
  pendingControl.listeners.forEach((listener) => listener(items));
};
vi.mock("../hooks/useMediaPreviews", () => ({
  useMediaPreviews: (items: unknown) =>
    Array.isArray(items)
      ? (items as Array<{ name?: string; url: string }>)
      : [],
}));

vi.mock("../hooks/useVideoThumbnails", () => ({
  useVideoThumbnails: () => ({ getThumbnailUrl: () => undefined }),
}));

vi.mock("../hooks/usePendingMediaPoll", async () => {
  const React = await import("react");
  const { useEffect, useState } = React;
  return {
    usePendingMediaPoll: vi.fn(() => {
      const [items, setItems] = useState<MockPendingItem[]>(
        pendingControl.items
      );
      useEffect(() => {
        const listener = (next: MockPendingItem[]) => setItems(next);
        pendingControl.listeners.add(listener);
        return () => {
          pendingControl.listeners.delete(listener);
        };
      }, []);
      return {
        items,
        loading: false,
        error: null,
        allReady: false,
        anyFailed: false,
        refetch: vi.fn(),
      };
    }),
  };
});

const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Cap T",
    experienceYears: 5,
    bio: "Captain bio long enough for validation lorem ipsum dolor.",
    phone: "+60000001",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter Test",
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

const originalFetch = global.fetch;
const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;

describe("useCharterMediaManager pending promotion", () => {
  beforeEach(() => {
    pendingControl.items = [];
    pendingControl.listeners.clear();
    global.fetch = originalFetch;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("retains processing card until final URL arrives", async () => {
    const uploadResponse = {
      pendingMediaId: "pm-test",
      status: "QUEUED",
      previewUrl: "https://cdn.example.com/original.mp4",
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (typeof input === "string" && input.endsWith("/api/media/video")) {
        return new Response(JSON.stringify(uploadResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const createObjectURLMock = vi.fn(() => "blob:placeholder");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const formHook = renderHook(() =>
      useForm<CharterFormValues>({
        defaultValues: makeDefaults(),
        mode: "onBlur",
      })
    );

    const managerHook = renderHook(() =>
      useCharterMediaManager({
        form: formHook.result.current,
        isEditing: false,
        currentCharterId: "charter-xyz",
      })
    );

    const file = new File(["dummy"], "test.mp4", { type: "video/mp4" });

    await act(async () => {
      await managerHook.result.current.addVideoFiles([file]);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(managerHook.result.current.existingVideos).toHaveLength(1);
      expect(["processing", "queued"]).toContain(
        managerHook.result.current.existingVideos[0].status
      );
      expect(managerHook.result.current.existingVideos[0].pendingId).toBe(
        uploadResponse.pendingMediaId
      );
    });

    await act(() => {
      pushPendingItems([
        {
          id: uploadResponse.pendingMediaId,
          status: "READY",
          kind: "VIDEO",
          finalKey: null,
          finalUrl: null,
          originalUrl: uploadResponse.previewUrl,
        },
      ]);
    });

    await waitFor(() => {
      expect(managerHook.result.current.existingVideos).toHaveLength(1);
      expect(["processing", "queued"]).toContain(
        managerHook.result.current.existingVideos[0].status
      );
    });

    await act(() => {
      pushPendingItems([
        {
          id: uploadResponse.pendingMediaId,
          status: "READY",
          kind: "VIDEO",
          finalKey: "captains/u/final.mp4",
          finalUrl: "https://cdn.example.com/final.mp4",
          originalUrl: uploadResponse.previewUrl,
          thumbnailUrl: "https://cdn.example.com/final.jpg",
          durationSeconds: 42,
        },
      ]);
    });

    await waitFor(() => {
      expect(managerHook.result.current.existingVideos).toHaveLength(1);
      expect(managerHook.result.current.existingVideos[0].status).toBe("ready");
      expect(managerHook.result.current.existingVideos[0].url).toBe(
        "https://cdn.example.com/final.mp4"
      );
      expect(managerHook.result.current.existingVideos[0].thumbnailUrl).toBe(
        "https://cdn.example.com/final.jpg"
      );
    });
  });
});
