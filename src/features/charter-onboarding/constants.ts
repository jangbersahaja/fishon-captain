export const ACCENT = "#ec2227";
// ACCENT_TINT: 10% opacity version of ACCENT (#ec2227)
export const ACCENT_TINT = "rgba(236, 34, 39, 0.1)";

export const inputClass =
  "w-full rounded-lg border border-slate-200 p-3 text-sm bg-slate-50 font-normal transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none disabled:bg-slate-200 disabled:cursor-not-allowed";

export const textareaClass =
  "w-full rounded-lg border border-slate-200 p-3 text-sm bg-slate-50 font-normal transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none disabled:bg-slate-200 disabled:cursor-not-allowed";

export const policyOptions = [
  {
    key: "licenseProvided" as const,
    label: "Fishing Permit Provided",
    labelMy: "Permit Memancing Disediakan",
  },
  {
    key: "catchAndKeep" as const,
    label: "Catch & Keep (Bag Limit)",
    labelMy: "Tangkap & Simpan (Had Beg)",
  },
  {
    key: "catchAndRelease" as const,
    label: "Catch & Release",
    labelMy: "Tangkap & Lepas",
  },
  {
    key: "childFriendly" as const,
    label: "Child Friendly",
    labelMy: "Mesra Kanak-Kanak",
  },
  {
    key: "smokingNotAllowed" as const,
    label: "No Smoking",
    labelMy: "Dilarang Merokok",
  },
  {
    key: "alcoholNotAllowed" as const,
    label: "No Alcohol",
    labelMy: "Dilarang Minum Arak",
  },
];

export const PREVIEW_PLACEHOLDER_IMAGES = [
  "/placeholder-1.jpg",
  "/placeholder-2.jpg",
  "/placeholder-3.jpg",
];
