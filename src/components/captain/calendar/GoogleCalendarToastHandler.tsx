"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Handles Google Calendar connection result from OAuth callback.
 * Shows toast notification based on URL query params.
 */
export function GoogleCalendarToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const gcal = searchParams.get("gcal");
    const gcalError = searchParams.get("gcal_error");

    if (gcal === "connected") {
      toast.success("Google Calendar connected successfully!", {
        description: "Your blocked dates will now sync with Google Calendar.",
        duration: 5000,
      });

      // Remove query params without causing a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      router.replace(url.pathname + url.search, { scroll: false });
    }

    if (gcalError) {
      toast.error("Failed to connect Google Calendar", {
        description: gcalError,
        duration: 5000,
      });

      // Remove query params
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal_error");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
