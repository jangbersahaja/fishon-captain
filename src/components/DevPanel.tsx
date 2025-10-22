"use client";

import { useEffect, useState } from "react";

export default function DevPanel({
  onToggleShowDummies,
  showDummies,
}: {
  onToggleShowDummies: () => void;
  showDummies: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_DEV_MODE === "1"
    ) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed z-[9999] bottom-4 right-4 bg-black/80 text-white rounded-xl shadow-lg px-5 py-4 flex flex-col items-end gap-2 border border-white/20">
      <div className="font-bold text-xs mb-1 tracking-widest text-[#EC2227]">
        DEV PANEL
      </div>
      <button
        className={`px-3 py-1 rounded bg-white text-[#EC2227] font-semibold text-xs shadow hover:bg-slate-100 border border-[#EC2227]/30 transition ${
          showDummies ? "ring-2 ring-[#EC2227]" : ""
        }`}
        onClick={onToggleShowDummies}
      >
        {showDummies ? "Hide Dummy Charters" : "Show Dummy Charters"}
      </button>
      <div className="mt-1 text-xs text-white/70">
        Only visible in DEV_MODE=1
      </div>
    </div>
  );
}
