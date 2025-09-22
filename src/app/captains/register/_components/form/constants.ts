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
  { key: "liveBaitProvided" as const, label: "Live bait provided" },
  { key: "alcoholAllowed" as const, label: "Alcohol allowed" },
  { key: "smokingAllowed" as const, label: "Smoking allowed" },
];

export const pricingCards = [
  {
    id: "basic" as const,
    title: "Basic",
    percentage: "10%",
    accent: "bg-white",
    features: [
      "Google, Facebook, Bing Ads",
      "Dedicated account manager",
      "Listing charter",
      "24/7 support team",
      "Reviews to build online reputation",
      "Calendar to track booking",
      "Direct communication with client",
      "Tools to monitor performance",
      "Apps to manage business on the go (coming soon)",
    ],
  },
  {
    id: "silver" as const,
    title: "Silver",
    percentage: "20%",
    accent: "bg-slate-50",
    features: [
      "Everything in Basic",
      "Top listing optimization",
      "Charter ads",
    ],
  },
  {
    id: "gold" as const,
    title: "Gold",
    percentage: "30%",
    accent: "bg-amber-50",
    features: ["Everything in Silver", "Video ads shooting every month"],
  },
];

export const PREVIEW_PLACEHOLDER_IMAGES = [
  "/placeholder-1.jpg",
  "/placeholder-2.jpg",
  "/placeholder-3.jpg",
];
