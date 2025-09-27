// Central palette + utility tokens for status / feedback surfaces.
// Consolidating commonly duplicated Tailwind class strings so components share a consistent appearance.

export const feedbackTokens = {
  success: {
    solid: "bg-emerald-600 text-white",
    subtle: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  error: {
    solid: "bg-red-600 text-white",
    subtle: "border border-red-200 bg-red-50 text-red-700",
  },
  warning: {
    solid: "bg-amber-600 text-white",
    subtle: "border border-amber-200 bg-amber-50 text-amber-700",
  },
  info: {
    solid: "bg-slate-800 text-white",
    subtle: "border border-slate-300 bg-slate-50 text-slate-700",
  },
  progress: {
    solid: "bg-slate-700 text-white",
  },
} as const;

export type FeedbackTokenKey = keyof typeof feedbackTokens;
