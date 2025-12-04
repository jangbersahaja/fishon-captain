/**
 * Reset Payout Test Data
 *
 * This script resets all payout-related data to a clean state:
 * 1. Deletes all Payout records from fishon-captain DB
 * 2. Resets all Booking payoutStatus to PENDING and clears payoutBatchId in fishon-market DB
 *
 * Usage: npx tsx scripts/reset-payout-test-data.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Load environment variables from .env.local (Next.js convention)
config({ path: ".env.local" });
// Also try .env as fallback
config({ path: ".env" });

if (!process.env.MARKET_DATABASE_URL) {
  console.error("❌ MARKET_DATABASE_URL is not set in .env.local or .env");
  console.log("\nPlease ensure MARKET_DATABASE_URL is configured.");
  process.exit(1);
}

// Captain DB client
const prisma = new PrismaClient();

// Market DB client - uses the generated client-market

const PrismaMarketClient =
  require("../node_modules/.prisma/client-market").PrismaClient;
const prismaMarket = new PrismaMarketClient({
  datasources: {
    db: {
      url: process.env.MARKET_DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🔄 Resetting payout test data...\n");

  // 1. Check current state
  const payouts = await prisma.payout.findMany({
    select: {
      id: true,
      batchId: true,
      status: true,
      netPayout: true,
      bookingIds: true,
      owner: { select: { name: true } },
    },
  });

  console.log(`📊 Found ${payouts.length} payout(s) to delete:`);
  for (const p of payouts) {
    console.log(
      `   - ${p.batchId} | ${p.status} | RM ${p.netPayout} | ${p.owner?.name} | ${p.bookingIds.length} booking(s)`
    );
  }

  // 2. Get all booking IDs that need to be reset
  const allBookingIds = payouts.flatMap((p) => p.bookingIds);
  console.log(
    `\n📋 ${allBookingIds.length} booking(s) will be reset to PENDING`
  );

  // Confirm before proceeding
  console.log("\n⚠️  This will:");
  console.log("   1. Delete ALL Payout records from fishon-captain");
  console.log("   2. Reset ALL affected Booking.payoutStatus to PENDING");
  console.log("   3. Clear ALL Booking.payoutBatchId references");
  console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 3. Reset bookings in fishon-market
  if (allBookingIds.length > 0) {
    const bookingResult = await prismaMarket.booking.updateMany({
      where: { id: { in: allBookingIds } },
      data: {
        payoutStatus: "PENDING",
        payoutBatchId: null,
      },
    });
    console.log(`\n✅ Reset ${bookingResult.count} booking(s) to PENDING`);
  }

  // 4. Delete payouts from fishon-captain
  const deleteResult = await prisma.payout.deleteMany({});
  console.log(`✅ Deleted ${deleteResult.count} payout(s)`);

  // 5. Verify final state
  const remainingPayouts = await prisma.payout.count();
  const pendingBookings = await prismaMarket.booking.count({
    where: {
      status: { in: ["PAID", "COMPLETED"] },
      payoutStatus: "PENDING",
    },
  });

  console.log("\n📊 Final State:");
  console.log(`   Payouts: ${remainingPayouts}`);
  console.log(`   Pending bookings: ${pendingBookings}`);
  console.log("\n✨ Reset complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaMarket.$disconnect();
  });
