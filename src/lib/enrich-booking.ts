import type {
  BookingParticipant,
  BookingTimeSlot,
  MarketBooking,
} from "./market-db";
import { prisma } from "./prisma";

// Re-export MarketBooking for consumers
export type { BookingParticipant, BookingTimeSlot, MarketBooking };

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
  conversationId: string | null;
  conversationStatus: string | null; // ACTIVE, LOCKED, CLOSED
  // Captain information
  captainName: string | null;
  captainPhone: string | null;
  captainEmail: string | null;
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
  originalTripId?: string | null; // For blocked bookings to store the actual trip ID
  // Blocked date fields (only for tripId === "blocked")
  isAllDay?: boolean;
  blockStartTime?: string | null; // Format: HH:MM
  blockEndTime?: string | null; // Format: HH:MM
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

  const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

  return timeSlots.map((slot) => {
    const date = new Date(slot.startDateTime);
    const dayName = date.toLocaleDateString("en-MY", {
      weekday: "short",
      timeZone: MALAYSIA_TIMEZONE,
    });
    const dateStr = date.toLocaleDateString("en-MY", {
      month: "short",
      day: "numeric",
      timeZone: MALAYSIA_TIMEZONE,
    });

    const startTime = new Date(slot.startDateTime).toLocaleTimeString("en-MY", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: MALAYSIA_TIMEZONE,
    });
    const endTime = new Date(slot.endDateTime).toLocaleTimeString("en-MY", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: MALAYSIA_TIMEZONE,
    });

    return `${slot.day > 1 ? `Day ${slot.day}: ` : ""}  ${dayName}, ${dateStr} • ${startTime} - ${endTime}`;
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
            captain: {
              select: {
                displayName: true,
                phone: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
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

      // Fetch conversation status even for fallback
      const { prismaMarket } = await import("./prisma-market");
      let conversationId: string | null = null;
      let conversationStatus: string | null = null;

      try {
        const conversation = await prismaMarket.conversation.findUnique({
          where: { bookingId: booking.id },
          select: { id: true, status: true },
        });
        console.log(
          `[enrichBooking fallback] Booking ${booking.id} conversation:`,
          {
            found: !!conversation,
            conversationId: conversation?.id,
            status: conversation?.status,
            bookingChatId: booking.chatId,
          }
        );
        if (conversation) {
          conversationId = conversation.id;
          conversationStatus = conversation.status;
        }
      } catch (error) {
        console.error(
          `[enrichBooking fallback] Error fetching conversation for booking ${booking.id}:`,
          error
        );
      }

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
        conversationId,
        conversationStatus,
        captainName: null,
        captainPhone: null,
        captainEmail: null,
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

    // Fetch conversation status from market DB
    const { prismaMarket } = await import("./prisma-market");
    let conversationId: string | null = null;
    let conversationStatus: string | null = null;

    try {
      const conversation = await prismaMarket.conversation.findUnique({
        where: { bookingId: booking.id },
        select: { id: true, status: true },
      });
      console.log(`[enrichBooking] Booking ${booking.id} conversation:`, {
        found: !!conversation,
        conversationId: conversation?.id,
        status: conversation?.status,
        bookingChatId: booking.chatId,
      });
      if (conversation) {
        conversationId = conversation.id;
        conversationStatus = conversation.status;
      }
    } catch (error) {
      console.error(
        `[enrichBooking] Error fetching conversation for booking ${booking.id}:`,
        error
      );
    }

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
      conversationId,
      conversationStatus,
      captainName: trip.charter.captain?.displayName || null,
      captainPhone: trip.charter.captain?.phone || null,
      captainEmail: trip.charter.captain?.user?.email || null,
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
      conversationId: null,
      conversationStatus: null,
      captainName: null,
      captainPhone: null,
      captainEmail: null,
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
