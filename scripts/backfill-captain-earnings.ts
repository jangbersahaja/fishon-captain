/**
 * Backfill Captain Earnings Script
 *
 * This script finds all PAID/COMPLETED bookings that are missing financial fields
 * (platformFee, serviceFee, captainEarnings) and calculates/updates them.
 *
 * Usage:
 *   npx tsx scripts/backfill-captain-earnings.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *
 * Requirements:
 *   - DATABASE_URL (fishon-captain DB)
 *   - MARKET_DATABASE_URL (fishon-market DB)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load .env.local (Next.js convention)
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

// Create standalone Prisma clients for script usage (bypasses env validation)
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

// Create market Prisma client using the generated client from fishon-market
const createMarketClient = () => {
  const marketUrl = process.env.MARKET_DATABASE_URL;
  if (!marketUrl) {
    throw new Error("MARKET_DATABASE_URL is required");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    PrismaClient: PrismaMarketClient,
  } = require("../../fishon-market/node_modules/@prisma/client");

  return new PrismaMarketClient({
    datasources: {
      db: { url: marketUrl },
    },
  });
};

const prismaMarket = createMarketClient();

// Commission rates by pricing plan
const COMMISSION_RATES: Record<string, number> = {
  GOLD: 0.05, // 5%
  SILVER: 0.08, // 8%
  BASIC: 0.1, // 10%
};

// Service fee rate (payment gateway)
const SERVICE_FEE_RATE = 0.015; // 1.5%

interface BookingToUpdate {
  id: string;
  charterId: string;
  tripPrice: { toNumber(): number }; // Prisma Decimal
  days: number;
  finalPrice: { toNumber(): number }; // Prisma Decimal
  discount: { amount?: number } | null;
  status: string;
  platformFee: { toNumber(): number } | null; // Prisma Decimal
  captainEarnings: { toNumber(): number } | null; // Prisma Decimal
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("🔍 Backfill Captain Earnings Script");
  console.log("=====================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log("");

  try {
    // Step 1: Find all PAID/COMPLETED bookings missing captainEarnings
    console.log("📋 Finding bookings with missing financial data...");

    const bookings = (await prismaMarket.booking.findMany({
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        OR: [
          { captainEarnings: null },
          { platformFee: null },
          { serviceFee: null },
        ],
      },
      select: {
        id: true,
        charterId: true,
        tripPrice: true,
        days: true,
        finalPrice: true,
        discount: true,
        status: true,
        platformFee: true,
        captainEarnings: true,
      },
    })) as BookingToUpdate[];

    if (bookings.length === 0) {
      console.log("✅ No bookings with missing financial data found!");
      return;
    }

    console.log(`Found ${bookings.length} booking(s) to process\n`);

    // Step 2: Get charter pricing plans
    const charterIds = Array.from(new Set(bookings.map((b) => b.charterId)));
    console.log(
      `📦 Fetching pricing plans for ${charterIds.length} charter(s)...`
    );

    const charters = await prisma.charter.findMany({
      where: { id: { in: charterIds } },
      select: {
        id: true,
        name: true,
        pricingPlan: true,
        ownerId: true,
      },
    });

    const charterMap = new Map(charters.map((c) => [c.id, c]));

    // Step 3: Calculate and update each booking
    console.log("\n📊 Processing bookings...\n");

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const booking of bookings) {
      const charter = charterMap.get(booking.charterId);

      if (!charter) {
        console.log(
          `⚠️  Booking ${booking.id}: Charter not found (${booking.charterId})`
        );
        skipped++;
        continue;
      }

      // Calculate financials
      const subtotal = booking.tripPrice.toNumber() * booking.days;
      const discountAmount =
        booking.discount && typeof booking.discount === "object"
          ? Number((booking.discount as { amount?: number }).amount || 0)
          : 0;

      const pricingPlan = charter.pricingPlan || "BASIC";
      const commissionRate = COMMISSION_RATES[pricingPlan] || 0.1;

      const platformFee = subtotal * commissionRate;
      const chargeableAmount = subtotal + platformFee - discountAmount;
      const serviceFee = chargeableAmount * SERVICE_FEE_RATE;
      const captainEarnings = subtotal - platformFee;

      console.log(`📝 Booking: ${booking.id}`);
      console.log(`   Charter: ${charter.name} (${pricingPlan})`);
      console.log(`   Status: ${booking.status}`);
      console.log(
        `   Trip Price: RM ${booking.tripPrice.toNumber()} x ${booking.days} day(s) = RM ${subtotal}`
      );
      console.log(`   Discount: RM ${discountAmount}`);
      console.log(
        `   Platform Fee (${(commissionRate * 100).toFixed(0)}%): RM ${platformFee.toFixed(2)}`
      );
      console.log(`   Service Fee (1.5%): RM ${serviceFee.toFixed(2)}`);
      console.log(`   Captain Earnings: RM ${captainEarnings.toFixed(2)}`);

      if (!isDryRun) {
        try {
          await prismaMarket.booking.update({
            where: { id: booking.id },
            data: {
              platformFee,
              serviceFee,
              captainEarnings,
              payoutStatus: "PENDING", // Ensure payout status is set
            },
          });
          console.log(`   ✅ Updated successfully\n`);
          updated++;
        } catch (error) {
          console.log(
            `   ❌ Error: ${error instanceof Error ? error.message : "Unknown"}\n`
          );
          errors++;
        }
      } else {
        console.log(`   ⏭️  Would update (dry run)\n`);
        updated++;
      }
    }

    // Summary
    console.log("\n=====================================");
    console.log("📈 Summary");
    console.log("=====================================");
    console.log(`Total bookings found: ${bookings.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (isDryRun) {
      console.log("\n💡 Run without --dry-run to apply changes");
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await prismaMarket.$disconnect();
  }
}

main();
