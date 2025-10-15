import { prisma } from "@/lib/prisma";
import { Anchor } from "lucide-react";
import Link from "next/link";
import CaptainCard from "./CaptainCard";

export default async function CaptainShowcase() {
  // Fetch registered captains with their profiles and trip count
  const captains = await prisma.captainProfile.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    where: {
      NOT: {
        displayName: {
          contains: "Dummy",
          mode: "insensitive",
        },
      },
    },
    select: {
      id: true,
      userId: true,
      displayName: true,
      firstName: true,
      lastName: true,
      bio: true,
      experienceYrs: true,
      avatarUrl: true,
      createdAt: true,
      user: {
        select: {
          id: true,
        },
      },
      charters: {
        select: {
          id: true,
          state: true,
          city: true,
          trips: {
            select: {
              id: true,
            },
          },
        },
        where: {
          isActive: true,
        },
      },
    },
  });

  if (captains.length === 0) {
    return null;
  }

  // Transform data for card component
  const captainCards = captains.map((captain) => {
    // Count all trips across all active charters
    const tripCount = captain.charters.reduce(
      (sum, charter) => sum + charter.trips.length,
      0
    );

    return {
      id: captain.userId,
      displayName: captain.displayName,
      firstName: captain.firstName,
      lastName: captain.lastName,
      bio: captain.bio,
      experienceYrs: captain.experienceYrs,
      avatarUrl: captain.avatarUrl,
      state: captain.charters[0]?.state || "Malaysia",
      city: captain.charters[0]?.city || "Unknown",
      charterCount: tripCount,
      createdAt: captain.createdAt,
    };
  });

  return (
    <section className="bg-gradient-to-b from-white to-neutral-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EC2227]/10 px-4 py-2 mb-4">
            <Anchor className="h-4 w-4 text-[#EC2227]" />
            <span className="text-sm font-semibold text-[#EC2227]">
              OUR CAPTAINS
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900">
            Meet Our Trusted Captains
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            Experienced fishing professionals from across Malaysia, ready to
            deliver unforgettable adventures. Join them and grow your business
            on Fishon.my.
          </p>
        </div>

        {/* Captain Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 justify-center">
          {captainCards.map((captain) => (
            <CaptainCard key={captain.id} captain={captain} />
          ))}
        </div>

        {/* CTA at bottom */}
        <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
          <h3 className="text-2xl font-bold text-neutral-900">
            Ready to become a captain?
          </h3>
          <p className="text-neutral-600 max-w-lg">
            Join our growing community of successful fishing charter operators.
            List your trips for free and start receiving bookings today.
          </p>
          <Link
            href="/auth?next=/captain/form"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EC2227] px-6 py-3 font-semibold text-white hover:bg-[#EC2227]/90 transition-colors shadow-lg hover:shadow-xl"
          >
            <Anchor className="h-5 w-5" />
            Get Started Now
          </Link>
        </div>
      </div>
    </section>
  );
}
