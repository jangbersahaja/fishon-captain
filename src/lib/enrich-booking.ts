import type { MarketBooking } from "./market-db";
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
};

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
      };
    }

    // Parse guests JSON
    const guests = booking.guests ?? { adults: 1, children: 0 };

    // Format location from charter details
    const location = `${trip.charter.city}, ${trip.charter.state}`;

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
