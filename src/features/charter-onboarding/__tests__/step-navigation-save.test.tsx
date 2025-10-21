import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock step schemas to always pass validation in this focused navigation test
vi.mock("@features/charter-onboarding/charterForm.schema", () => ({
  basicsStepSchema: { safeParse: () => ({ success: true }) },
  experienceStepSchema: { safeParse: () => ({ success: true }) },
  tripsStepSchema: { safeParse: () => ({ success: true }) },
  descriptionStepSchema: { safeParse: () => ({ success: true }) },
  mediaPricingStepSchema: { safeParse: () => ({ success: true }) },
  charterFormSchema: { safeParse: () => ({ success: true }) },
}));

// STEP sequence used by the hook under test
vi.mock("@features/charter-onboarding/formSteps", () => ({
  REVIEW_STEP_INDEX: 5,
  STEP_SEQUENCE: [
    { id: "basics", label: "Basics" },
    { id: "experience", label: "Experience" },
    { id: "trips", label: "Trips" },
    { id: "description", label: "Description" },
    { id: "media", label: "Media & Pricing" },
    { id: "review", label: "Review" },
  ],
}));

// Silence analytics emission in tests
vi.mock("@features/charter-onboarding/analytics", () => ({
  emitCharterFormEvent: () => {},
}));

import type { UseFormReturn } from "react-hook-form";
import { useStepNavigation } from "../hooks/useStepNavigation";

// Minimal fake form object that satisfies the hook at runtime
const fakeForm = {
  getValues: () => ({} as Record<string, unknown>),
} as unknown as UseFormReturn<Record<string, unknown>>;

function TestComponent(props: {
  onNext?: () => void;
  saveServerDraftSnapshot: () => Promise<number | null>;
  setSnapshotCurrentStep: (n: number) => void;
}) {
  const { handleNext } = useStepNavigation({
    form: fakeForm,
    isEditing: false,
    existingImagesCount: 3, // satisfy media step guard if reached
    saveServerDraftSnapshot: props.saveServerDraftSnapshot,
    setSnapshotCurrentStep: props.setSnapshotCurrentStep,
    avatarUploading: false,
  });
  return (
    <button data-testid="next" onClick={() => void handleNext()}>
      Next
    </button>
  );
}

describe("useStepNavigation - Next saves draft", () => {
  it("calls setSnapshotCurrentStep and saveServerDraftSnapshot when Next is clicked", async () => {
    const saveSpy = vi.fn(async () => 1);
    const setStepSpy = vi.fn();

    render(
      <TestComponent
        saveServerDraftSnapshot={saveSpy}
        setSnapshotCurrentStep={setStepSpy}
      />
    );

    fireEvent.click(screen.getByTestId("next"));

    // We expect the hook to stage the next step index (1) before saving
    expect(setStepSpy).toHaveBeenCalledTimes(1);
    expect(setStepSpy).toHaveBeenCalledWith(1);
    // And then trigger a server save of the draft snapshot
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
