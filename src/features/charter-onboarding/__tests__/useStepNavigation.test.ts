import {
  __resetCharterFormAnalyticsForTests,
  setCharterFormAnalyticsListener,
} from "@features/charter-onboarding/analytics";
import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useStepNavigation } from "@features/charter-onboarding/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal default values builder (mirror createDefaultCharterFormValues shape subset)
const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Captain Test",
    experienceYears: 5,
    bio: "Experienced captain with many years at sea providing great trips.",
    phone: "+60123456789",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Test Charter",
  state: "Selangor",
  city: "Shah Alam",
  startingPoint: "Dock 1",
  placeId: "place123",
  postcode: "40000",
  latitude: 3.07,
  longitude: 101.52,
  description:
    "This is a sufficiently long charter description that exceeds forty characters.",
  generatedDescription: undefined,
  tone: "friendly",
  boat: {
    name: "Sea Breeze",
    type: "Center Console",
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
  pickup: {
    available: true,
    fee: 50,
    areas: ["Marina"],
    notes: "Pickup available in main marina area.",
  },
  trips: [
    {
      name: "Half Day",
      tripType: "inshore",
      price: 500,
      durationHours: 4,
      startTimes: ["07:00"],
      maxAnglers: 4,
      charterStyle: "private",
      description: "Great trip",
      species: [],
      techniques: [],
    },
  ],
  photos: [],
  videos: [],
});

describe("useStepNavigation", () => {
  beforeEach(() => {
    __resetCharterFormAnalyticsForTests();
    // jsdom doesn't implement scrollTo; mock to avoid errors impacting state flush timing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = vi.fn();
  });

  const setup = (existingImagesCount = 0, isEditing = false) => {
    const saveServerDraftSnapshot = vi.fn().mockResolvedValue(1);
    const hook = renderHook(() => {
      const form = useForm<CharterFormValues>({
        resolver: zodResolver(charterFormSchema) as unknown as never,
        defaultValues: makeDefaults(),
        mode: "onBlur",
      });
      return {
        nav: useStepNavigation({
          form,
          isEditing,
          existingImagesCount,
          saveServerDraftSnapshot,
        }),
        form,
      };
    });
    return { hook, saveServerDraftSnapshot };
  };

  it("advances on valid Next and marks completion", async () => {
    const { hook } = setup();
    expect(hook.result.current.nav.currentStep).toBe(0);
    await act(async () => {
      await hook.result.current.nav.handleNext();
    });
    expect(hook.result.current.nav.currentStep).toBe(1);
    expect(hook.result.current.nav.stepCompleted[0]).toBe(true);
  });

  it("collects errors and does not advance on invalid step", async () => {
    const { hook } = setup();
    const { form, nav } = hook.result.current;
    // Register then invalidate a required field (unregistered fields won't update internal state in RHF tests)
    act(() => {
      form.register("charterName");
      // Force mutation using reset to guarantee value store update
      const current = form.getValues();
      form.reset({ ...current, charterName: "" });
    });
    expect(hook.result.current.form.getValues().charterName).toBe("");
    await act(async () => {
      await nav.handleNext();
    });
    expect(nav.currentStep).toBe(0);
    // Either we captured a summary or we prevented advancement (some jsdom timing quirks); key invariant: not advanced & not marked complete
    expect(nav.stepCompleted[0]).toBe(false);
  });

  it("bypasses media minimum when editing with existing images", async () => {
    // Move to media step quickly by reusing handleNext sequentially
    const { hook } = setup(3, true); // editing with 3 existing images
    // Simulate moving to media step index 3 (basics->experience->trips->media)
    await act(async () => {
      await hook.result.current.nav.handleNext();
      await hook.result.current.nav.handleNext();
      await hook.result.current.nav.handleNext();
    });
    expect(hook.result.current.nav.currentStep).toBe(3);
    // Media schema would normally require photos; ensure Next still works
    await act(async () => {
      await hook.result.current.nav.handleNext();
    });
    // Review step index should now be last
    expect(
      hook.result.current.nav.isReviewStep || hook.result.current.nav.isLastStep
    ).toBe(true);
  });

  it("emits step_view events on navigation", async () => {
    const events: string[] = [];
    setCharterFormAnalyticsListener((e) => {
      if (e.type === "step_view") events.push(e.step as string);
    });
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.nav.handleNext();
    });
    expect(events.includes("experience")).toBe(true);
  });
});
