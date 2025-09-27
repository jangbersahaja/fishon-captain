"use client";
import { useEffect, useState } from "react";

/**
 * useOnlineStatusBanner
 * Tracks navigator.onLine and returns banner props for offline status.
 * Persistent across route changes when placed high in tree.
 */
export function useOnlineStatusBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return { online };
}
