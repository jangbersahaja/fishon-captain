/**
 * Shared types for captain documents feature
 */

export type Uploaded = {
  key: string;
  url: string;
  name: string;
  updatedAt: string;
};

export type Statused = Uploaded & {
  status?: "processing" | "validated";
  validForPeriod?: { from?: string; to?: string };
};

export type DocType =
  | "idFront"
  | "idBack"
  | "captainLicense"
  | "boatRegistration"
  | "fishingLicense"
  | "additional"
  | "bankStatement";

export type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export type ConfirmState = {
  message: string;
  onConfirm: () => Promise<void> | void;
  busy?: boolean;
} | null;

export type ValidationErrors = Record<string, string>;
