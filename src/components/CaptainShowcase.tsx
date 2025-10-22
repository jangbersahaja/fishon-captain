import { prisma } from "@/lib/prisma";

import { Anchor } from "lucide-react";
import Link from "next/link";
import CaptainCard from "./CaptainCard";

export default async function CaptainShowcase() {
  // Fetch captains and filter for full data, not ADMIN, not [Dummy]
  const captains = await prisma.captainProfile.findMany({
    take: 16,
    orderBy: { createdAt: "desc" },
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
          role: true,
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

  // Filter captains: must have full data, not ADMIN, not [Dummy]
  const filteredCaptains = captains.filter((captain) => {
    // Exclude if displayName contains [Dummy]
    if (
      typeof captain.displayName === "string" &&
      captain.displayName.includes("[Dummy]")
    )
      return false;
    // Exclude if user role is ADMIN
    if (captain.user && captain.user.role === "ADMIN") return false;
    // Require displayName, avatarUrl, bio
    if (!captain.displayName || !captain.avatarUrl || !captain.bio)
      return false;
    // Require at least one active charter
    if (
      !captain.charters ||
      !Array.isArray(captain.charters) ||
      captain.charters.length === 0
    )
      return false;
    // Require at least one trip in any charter
    const hasTrips = captain.charters.some(
      (charter) => charter.trips && charter.trips.length > 0
    );
    if (!hasTrips) return false;
    return true;
  });

  if (filteredCaptains.length === 0) {
    return null;
  }

  // Transform data for card component
  const captainCards = filteredCaptains.map((captain) => {
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
      <div className="w-full px-4 py-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EC2227]/10 px-4 py-2 mb-4">
            <Anchor className="h-4 w-4 text-[#EC2227]" />
            <span className="text-sm font-semibold text-[#EC2227]">
              OUR CAPTAINS
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-neutral-900">
            Meet Our Trusted Captains
          </h2>
          <p className="max-w-2xl mx-auto mt-4 text-lg text-neutral-600">
            Experienced fishing professionals from across Malaysia, ready to
            deliver unforgettable adventures. Join them and grow your business
            on Fishon.my.
          </p>
        </div>

        {/* Captain Grid */}
        <div className="grid justify-center gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {captainCards.map((captain) => (
            <CaptainCard key={captain.id} captain={captain} />
          ))}
        </div>

        {/* CTA at bottom */}
        <div className="flex flex-col items-center justify-center gap-4 mt-16 text-center">
          <h3 className="text-2xl font-bold text-neutral-900">
            Ready to become a captain?
          </h3>
          <p className="max-w-lg text-neutral-600">
            Join our growing community of successful fishing charter operators.
            List your trips for free and start receiving bookings today.
          </p>
          <Link
            href="/auth?next=/captain/form"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EC2227] px-6 py-3 font-semibold text-white hover:bg-[#EC2227]/90 transition-colors shadow-lg hover:shadow-xl"
          >
            <Anchor className="w-5 h-5" />
            Get Started Now
          </Link>
        </div>
      </div>
    </section>
  );
}
// ...existing code...
