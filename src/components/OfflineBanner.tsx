"use client";
import { useOnlineStatusBanner } from "@/hooks/useOnlineStatusBanner";

export default function OfflineBanner() {
  const { online } = useOnlineStatusBanner();
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center bg-amber-600 px-4 py-2 text-center text-xs font-medium text-white shadow-md">
      <span className="truncate">You are offline. Changes will retry when connection is restored.</span>
    </div>
  );
}
