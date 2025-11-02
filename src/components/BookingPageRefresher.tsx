"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * BookingPageRefresher Component
 *
 * Listens for booking-update events from the notification system
 * and triggers a soft refresh of the page data via Next.js router.
 *
 * This ensures that when a new booking notification arrives via Pusher,
 * the booking list automatically updates without requiring a full page reload.
 */
export function BookingPageRefresher() {
  const router = useRouter();

  useEffect(() => {
    const handleBookingUpdate = () => {
      console.log(
        "[BookingPageRefresher] Booking update event received, refreshing..."
      );
      router.refresh();
    };

    // Listen for booking-update events dispatched by useNotifications
    window.addEventListener("booking-update", handleBookingUpdate);

    return () => {
      window.removeEventListener("booking-update", handleBookingUpdate);
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}
