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
  addVideoFiles: (files: File[]) => void;
  removePhoto: (idx: number) => void;
  removeVideo: (idx: number) => void;
  videoProgress: number[]; // adapt to actual hook return
  photoProgress: number[];
  existingImagesCount: number;
  existingVideosCount: number;
  onReorderPhotos: (from: number, to: number) => void;
  onReorderVideos: (from: number, to: number) => void;
  onRetryPhoto: (index: number) => void;
  onRetryVideo: (index: number) => void;
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
      return (
        <MediaPricingStep
          form={props.form}
          fieldError={fe}
          photoPreviews={props.normalizedPhotoPreviews}
          videoPreviews={props.normalizedVideoPreviews}
          onAddPhotoFiles={props.addPhotoFiles}
          onAddVideoFiles={props.addVideoFiles}
          onRemovePhoto={props.removePhoto}
          onRemoveVideo={props.removeVideo}
          videoProgress={props.videoProgress}
          photoProgress={props.photoProgress}
          existingPhotosCount={props.existingImagesCount}
          existingVideosCount={props.existingVideosCount}
          onReorderPhotos={props.onReorderPhotos}
          onReorderVideos={props.onReorderVideos}
          onRetryPhoto={props.onRetryPhoto}
          onRetryVideo={props.onRetryVideo}
        />
      );
    default:
      return null;
  }
};
