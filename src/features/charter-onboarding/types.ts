import type { Charter } from "@/dummy/charter";

// Updated for CharterMedia migration: support charterMediaId for direct upload
export type MediaPreview = {
  url: string;
  name: string;
  charterMediaId?: string; // NEW: present if uploaded via direct CharterMedia
};

export type StepKey =
  | "basics"
  | "experience"
  | "trips"
  | "media"
  | "description"
  | "review";

export type StepConfig = {
  id: StepKey;
  label: string;
  fields: string[];
};

export type PreviewCharter = Charter;
