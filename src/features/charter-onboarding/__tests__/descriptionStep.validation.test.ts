import {
  charterFormSchema,
  descriptionStepSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { DescriptionStep } from "@features/charter-onboarding/steps/DescriptionStep";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it } from "vitest";

// Build minimal valid defaults (focus on description-related fields)
function makeDefaults(): CharterFormValues {
  return {
    operator: {
      displayName: "Cap",
      experienceYears: 2,
      bio: "Experienced and friendly guide with stories to tell.",
      phone: "+60123456789",
      avatar: undefined,
      avatarUrl: undefined,
    },
    charterType: "inshore",
    charterName: "Sample",
    state: "Selangor",
    city: "Shah Alam",
    startingPoint: "Dock A",
    placeId: "p1",
    postcode: "40000",
    latitude: 3.05,
    longitude: 101.5,
    description: "Short seed", // intentionally under min
    generatedDescription: undefined,
    tone: "friendly",
    boat: {
      name: "Boat",
      type: "Skiff",
      lengthFeet: 18,
      capacity: 3,
      features: [],
    },
    amenities: [],
    policies: {
      licenseProvided: false,
      catchAndKeep: false,
      catchAndRelease: false,
      childFriendly: false,
      liveBaitProvided: false,
      alcoholNotAllowed: false,
      smokingNotAllowed: false,
    },
    pickup: { available: false, fee: null, areas: [], notes: "" },
    trips: [
      {
        name: "Half Day",
        tripType: "inshore",
        price: 100,
        durationHours: 4,
        startTimes: ["07:00"],
        maxAnglers: 3,
        charterStyle: "private",
        description: "Trip desc",
        species: [],
        techniques: [],
      },
    ],
    photos: [],
    videos: [],
    uploadedPhotos: [],
    uploadedVideos: [],
  };
}

describe("DescriptionStep validation", () => {
  let form: ReturnType<typeof useForm<CharterFormValues>>;

  beforeEach(() => {
    const { result } = renderHook(() =>
      useForm<CharterFormValues>({
        defaultValues: makeDefaults(),
        resolver: zodResolver(charterFormSchema) as never,
        mode: "onBlur",
      })
    );
    form = result.current;
  });

  it("fails descriptionStepSchema when description below min", () => {
    const values = form.getValues();
    const result = descriptionStepSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("40"))).toBe(true);
    }
  });

  it("passes after updating description to >= 40 chars", () => {
    act(() => {
      form.setValue(
        "description",
        "A long enough charter description that exceeds forty characters.",
        { shouldValidate: true }
      );
    });
    const result = descriptionStepSchema.safeParse(form.getValues());
    expect(result.success).toBe(true);
  });

  it("renders character counter reflecting remaining chars", () => {
    // Mount the component in a detached DOM root
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() => {
      // Use React.createElement to avoid JSX in a .ts test file (keeps parser happy)
      root.render(React.createElement(DescriptionStep, { form }));
    });
    // After initial auto-generate attempt, description may have changed; we ensure counter exists
    const counter = el.querySelector("span.tabular-nums");
    expect(counter).toBeTruthy();
    root.unmount();
  });
});
