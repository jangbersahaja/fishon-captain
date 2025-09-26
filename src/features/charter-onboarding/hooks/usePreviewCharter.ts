import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { createPreviewCharter } from "@features/charter-onboarding/preview";
import { useMemo } from "react";

interface MediaPreview {
  name: string;
  url: string;
  file?: File;
}

export function usePreviewCharter(
  values: CharterFormValues,
  photos: MediaPreview[],
  avatar: string | null
) {
  return useMemo(
    () => createPreviewCharter(values, photos, avatar),
    [values, photos, avatar]
  );
}
