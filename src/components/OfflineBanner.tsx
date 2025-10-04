"use client";
import { feedbackTokens } from "@/config/designTokens";
import { zIndexClasses } from "@/config/zIndex";
import { useOnlineStatusBanner } from "@/hooks/useOnlineStatusBanner";
import { offlineQueue } from "@/lib/offlineQueue";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const { online } = useOnlineStatusBanner();
  const [mounted, setMounted] = useState(false);
  const [queued, setQueued] = useState(0);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const unsub = offlineQueue.subscribe(() => {
      setQueued(offlineQueue.list().length);
    });
    setQueued(offlineQueue.list().length);
    return () => {
      unsub();
    };
  }, []);

  // Render nothing until mounted to avoid SSR/client mismatch.
  if (!mounted || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 ${zIndexClasses.offlineBanner} flex items-center justify-between gap-4 px-4 py-2 text-xs font-medium shadow-md ${feedbackTokens.warning.solid}`}
    >
      <span className="truncate">
        Offline.{" "}
        {queued > 0
          ? `${queued} pending action${queued === 1 ? "" : "s"}.`
          : "Changes queued."}
      </span>
      <div className="flex items-center gap-2">
        {queued > 0 && (
          <button
            type="button"
            onClick={() => {
              void offlineQueue.flush();
            }}
            className="rounded bg-white/15 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            Reconnect & retry
          </button>
        )}
      </div>
    </div>
  );
}
