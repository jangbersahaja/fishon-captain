// Central palette + utility tokens for status / feedback surfaces.
// Consolidating commonly duplicated Tailwind class strings so components share a consistent appearance.

export const feedbackTokens = {
  success: {
    solid: "bg-emerald-600 text-white",
    subtle: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    outline: "border border-emerald-400 text-emerald-700 bg-transparent",
    ghost: "text-emerald-700 hover:bg-emerald-50",
  },
  error: {
    solid: "bg-red-600 text-white",
    subtle: "border border-red-200 bg-red-50 text-red-700",
    outline: "border border-red-400 text-red-700 bg-transparent",
    ghost: "text-red-700 hover:bg-red-50",
  },
  warning: {
    solid: "bg-amber-600 text-white",
    subtle: "border border-amber-200 bg-amber-50 text-amber-700",
    outline: "border border-amber-400 text-amber-700 bg-transparent",
    ghost: "text-amber-700 hover:bg-amber-50",
  },
  info: {
    solid: "bg-slate-800 text-white",
    subtle: "border border-slate-300 bg-slate-50 text-slate-700",
    outline: "border border-slate-400 text-slate-700 bg-transparent",
    ghost: "text-slate-700 hover:bg-slate-100",
  },
  progress: {
    solid: "bg-slate-700 text-white",
    subtle: "border border-slate-200 bg-slate-100 text-slate-600",
    outline: "border border-slate-400 text-slate-600 bg-transparent",
    ghost: "text-slate-600 hover:bg-slate-100",
  },
} as const;

export type FeedbackTokenKey = keyof typeof feedbackTokens;
