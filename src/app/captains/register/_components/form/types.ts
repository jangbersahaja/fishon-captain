import type { Charter } from "@/dummy/charter";

export type MediaPreview = { url: string; name: string };

export type StepKey = "basics" | "experience" | "trips" | "media" | "review";

export type StepConfig = {
  id: StepKey;
  label: string;
  fields: string[];
};

export type PreviewCharter = Charter;
