"use client";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { BasicsStep } from "@features/charter-onboarding/steps";
import dynamic from "next/dynamic";
import React from "react";
import type { UseFormReturn } from "react-hook-form";

export interface StepSwitchProps {
  currentStep: number;
  form: UseFormReturn<CharterFormValues>;
  fieldError: (path?: string) => string | undefined; // normalized (null mapped to undefined before passing)
  captainAvatarPreview: string | null;
  onAvatarChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>;
  onAvatarClear: () => void;
  normalizedPhotoPreviews: { name: string; url: string; file?: File }[];
  normalizedVideoPreviews: { name: string; url: string; file?: File }[];
  addPhotoFiles: (files: File[]) => void;
  removePhoto: (idx: number) => void;
  existingImagesCount: number;
  existingVideosCount: number;
  onReorderPhotos: (from: number, to: number) => void;
  currentCharterId: string | null;
  onVideoBlockingChange?: (blocking: boolean) => void;
  onReadyVideosChange?: (videos: { name: string; url: string }[]) => void;
  seedVideos?: { name: string; url: string; thumbnailUrl?: string }[];
}

const MediaPricingStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/MediaPricingStep").then(
      (m) => m.MediaPricingStep
    ),
  { ssr: false }
);

const ExperienceStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/ExperienceStep").then(
      (m) => m.ExperienceStep
    ),
  { ssr: false }
);

const TripsStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/TripsStep").then(
      (m) => m.TripsStep
    ),
  { ssr: false }
);

const DescriptionStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/DescriptionStep").then(
      (m) => m.DescriptionStep
    ),
  { ssr: false }
);

export const StepSwitch: React.FC<StepSwitchProps> = (props) => {
  const { currentStep } = props;
  // Wrap fieldError to coerce null -> undefined if caller provided a looser function
  const fe: (p?: string) => string | undefined = (p) => {
    const v = props.fieldError(p);
    return v == null ? undefined : v;
  };
  switch (currentStep) {
    case 0:
      return (
        <BasicsStep
          form={props.form}
          fieldError={fe}
          captainAvatarPreview={props.captainAvatarPreview}
          onAvatarChange={props.onAvatarChange}
          onAvatarClear={props.onAvatarClear}
        />
      );
    case 1:
      return <ExperienceStep form={props.form} fieldError={fe} />;
    case 2:
      return <TripsStep form={props.form} />;
    case 3:
      return <DescriptionStep form={props.form} fieldError={fe} />;
    case 4:
      return (
        <MediaPricingStep
          form={props.form}
          photoPreviews={props.normalizedPhotoPreviews}
          onAddPhotoFilesAction={props.addPhotoFiles}
          onRemovePhotoAction={props.removePhoto}
          onReorderPhotosAction={props.onReorderPhotos}
          currentCharterId={props.currentCharterId}
          onVideoBlockingChangeAction={props.onVideoBlockingChange}
          onReadyVideosChangeAction={props.onReadyVideosChange}
          seedVideos={props.seedVideos}
        />
      );
    default:
      return null;
  }
};
