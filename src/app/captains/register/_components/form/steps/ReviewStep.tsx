import type { Charter } from "@/dummy/charter";

import { PreviewPanel } from "../preview/PreviewPanel";

type ReviewStepProps = {
  charter: Charter;
};

export function ReviewStep({ charter }: ReviewStepProps) {
  return <PreviewPanel charter={charter} />;
}
