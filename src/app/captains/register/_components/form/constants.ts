export const ACCENT = "#2563eb";
export const ACCENT_TINT = "rgba(37, 99, 235, 0.1)";

export const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal shadow-sm transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none";

export const textareaClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal shadow-sm transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none";

export const policyOptions = [
  { key: "catchAndKeep" as const, label: "Catch & keep allowed" },
  { key: "catchAndRelease" as const, label: "Catch & release encouraged" },
  { key: "childFriendly" as const, label: "Child friendly" },
];

export const PREVIEW_PLACEHOLDER_IMAGES = [
  "/placeholder-1.jpg",
  "/placeholder-2.jpg",
  "/placeholder-3.jpg",
];
