import type {
  BookingParticipant,
  BookingTimeSlot,
  MarketBooking,
} from "./market-db";
import { prisma } from "./prisma";

/**
 * Enriched booking with trip and charter details for display
 */
export type EnrichedMarketBooking = MarketBooking & {
  // Backward compatibility fields from old schema
  charterName: string;
  tripName: string;
  adults: number;
  children: number;
  unitPrice: number;
  totalPrice: number;
  location: string;
  durationHour: number;
  // Additional trip/charter data for enhanced display
  trip?: {
    id: string;
    name: string;
    description: string | null;
    startTimes: string[];
    charter: {
      id: string;
      name: string;
      location: string;
    };
  };
  // Helper fields for participants and time slots
  primaryBooker?: BookingParticipant; // First participant with isBooker: true
  allParticipants: BookingParticipant[]; // All participants from guests.participants
  formattedTimeSlots?: string[]; // Human-readable time slot strings
};

/**
 * Parse participants from guests JSON
 */
function parseParticipants(guests: unknown): BookingParticipant[] {
  if (!guests || typeof guests !== "object") return [];
  const guestsObj = guests as { participants?: BookingParticipant[] };
  return Array.isArray(guestsObj.participants) ? guestsObj.participants : [];
}

/**
 * Format time slots for display
 * Example: "Day 1: Fri, Nov 15 • 8:00 AM - 12:00 PM"
 */
function formatTimeSlots(
  timeSlots: BookingTimeSlot[] | null | undefined
): string[] {
  if (!timeSlots || !Array.isArray(timeSlots)) return [];

  return timeSlots.map((slot) => {
    const date = new Date(slot.startDateTime);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const startTime = new Date(slot.startDateTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTime = new Date(slot.endDateTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `Day ${slot.day}: ${dayName}, ${dateStr} • ${startTime} - ${endTime}`;
  });
}

/**
 * Enrich a single booking with trip and charter details

/**
 * Enrich a single booking with trip and charter data from Captain DB
 * @param booking - Raw booking from Market DB
 * @returns Enriched booking with trip/charter details
 */
export async function enrichBooking(
  booking: MarketBooking
): Promise<EnrichedMarketBooking> {
  try {
    // Fetch trip with charter from Captain DB
    const trip = await prisma.trip.findUnique({
      where: { id: booking.tripId },
      select: {
        id: true,
        name: true,
        description: true,
        durationHours: true,
        charter: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            startingPoint: true,
          },
        },
        startTimes: {
          select: {
            value: true,
          },
        },
      },
    });

    if (!trip) {
      console.warn(
        `Trip not found for booking ${booking.id}, tripId: ${booking.tripId}`
      );
      // Return booking with fallback values
      const guests = booking.guests ?? { adults: 1, children: 0 };
      const allParticipants = parseParticipants(booking.guests);
      const primaryBooker = allParticipants.find((p) => p.isBooker);
      const formattedTimeSlots = formatTimeSlots(booking.timeSlots);

      return {
        ...booking,
        charterName: "Unknown Charter",
        tripName: "Unknown Trip",
        adults: guests.adults,
        children: guests.children,
        unitPrice: Number(booking.tripPrice),
        totalPrice: Number(booking.finalPrice),
        location: "Unknown Location",
        durationHour: 0,
        allParticipants,
        primaryBooker,
        formattedTimeSlots:
          formattedTimeSlots.length > 0 ? formattedTimeSlots : undefined,
      };
    }

    // Parse guests JSON
    const guests = booking.guests ?? { adults: 1, children: 0 };
    const allParticipants = parseParticipants(booking.guests);
    const primaryBooker = allParticipants.find((p) => p.isBooker);

    // Format location from charter details
    const location = `${trip.charter.city}, ${trip.charter.state}`;

    // Format time slots for display
    const formattedTimeSlots = formatTimeSlots(booking.timeSlots);

    return {
      ...booking,
      charterName: trip.charter.name,
      tripName: trip.name,
      adults: guests.adults,
      children: guests.children,
      unitPrice: Number(booking.tripPrice),
      totalPrice: Number(booking.finalPrice),
      location,
      durationHour: trip.durationHours,
      allParticipants,
      primaryBooker,
      formattedTimeSlots:
        formattedTimeSlots.length > 0 ? formattedTimeSlots : undefined,
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startTimes: trip.startTimes.map((st) => st.value),
        charter: {
          id: trip.charter.id,
          name: trip.charter.name,
          location,
        },
      },
    };
  } catch (error) {
    console.error(`Error enriching booking ${booking.id}:`, error);
    // Return booking with fallback values on error
    const guests = booking.guests ?? { adults: 1, children: 0 };
    const allParticipants = parseParticipants(booking.guests);
    const primaryBooker = allParticipants.find((p) => p.isBooker);
    const formattedTimeSlots = formatTimeSlots(booking.timeSlots);

    return {
      ...booking,
      charterName: "Unknown Charter",
      tripName: "Unknown Trip",
      adults: guests.adults,
      children: guests.children,
      unitPrice: Number(booking.tripPrice),
      totalPrice: Number(booking.finalPrice),
      location: "Unknown Location",
      durationHour: 0,
      allParticipants,
      primaryBooker,
      formattedTimeSlots:
        formattedTimeSlots.length > 0 ? formattedTimeSlots : undefined,
    };
  }
}

/**
 * Enrich multiple bookings with trip and charter data
 * @param bookings - Array of raw bookings from Market DB
 * @returns Array of enriched bookings
 */
export async function enrichBookings(
  bookings: MarketBooking[]
): Promise<EnrichedMarketBooking[]> {
  // Process all bookings in parallel for better performance
  const enrichedBookings = await Promise.all(
    bookings.map((booking) => enrichBooking(booking))
  );

  return enrichedBookings;
}
