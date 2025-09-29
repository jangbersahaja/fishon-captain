import type { Charter } from "@/dummy/charter";

import { PreviewPanel } from "@features/charter-onboarding/preview";

type ReviewStepProps = {
  charter: Charter;
  videos?: { url: string; name?: string; thumbnailUrl?: string | null }[];
};

export function ReviewStep({ charter, videos }: ReviewStepProps) {
  return <PreviewPanel charter={charter} videos={videos} />;
}
