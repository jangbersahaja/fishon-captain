import type { Charter } from "@/dummy/charter";

import { PreviewPanel } from "@features/charter-form/preview";

type ReviewStepProps = {
  charter: Charter;
};

export function ReviewStep({ charter }: ReviewStepProps) {
  return <PreviewPanel charter={charter} />;
}
