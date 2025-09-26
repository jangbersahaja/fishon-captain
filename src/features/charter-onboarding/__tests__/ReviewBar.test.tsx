import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewBar } from "../components/ReviewBar";
import { CharterFormProvider } from "../context/CharterFormContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ReviewBar", () => {
  type Env = Parameters<typeof CharterFormProvider>[0]["value"] & {
    form: unknown;
  };
  const makeEnv = (over: Partial<Env> = {}): Env => ({
    form: {} as unknown as Env["form"],
    isEditing: false,
    currentCharterId: null,
    serverDraftId: "draft-1",
    serverVersion: 1,
    setServerVersion: () => {},
    navigation: {
      currentStep: 4,
      isLastStep: true,
      isReviewStep: true,
      activeStep: { label: "Review" },
      handleNext: () => {},
      handlePrev: () => {},
      gotoStep: () => {},
    },
    submission: {
      submitState: null,
      savingEdit: false,
      serverSaving: false,
      saveEditChanges: () => {},
      triggerSubmit: () => {},
    },
    media: {
      isMediaUploading: false,
      canSubmitMedia: true,
      existingImagesCount: 0,
      existingVideosCount: 0,
    },
    ...over,
  });
  it("shows submit charter text when creating", () => {
    render(
      <CharterFormProvider value={makeEnv()}>
        <ReviewBar active onPrimary={() => {}} />
      </CharterFormProvider>
    );
    expect(screen.getByText(/Submit Charter/i)).toBeInTheDocument();
  });
  it("shows save when editing", () => {
    render(
      <CharterFormProvider value={makeEnv({ isEditing: true })}>
        <ReviewBar active onPrimary={() => {}} />
      </CharterFormProvider>
    );
    expect(screen.getByText(/Save$/i)).toBeInTheDocument();
  });
  it("disables primary button when media uploading", () => {
    render(
      <CharterFormProvider
        value={makeEnv({
          media: {
            isMediaUploading: true,
            canSubmitMedia: false,
            existingImagesCount: 0,
            existingVideosCount: 0,
          },
        })}
      >
        <ReviewBar active onPrimary={() => {}} />
      </CharterFormProvider>
    );
    const btn = screen.getByRole("button", { name: /submit charter/i });
    expect(btn).toBeDisabled();
  });
});
