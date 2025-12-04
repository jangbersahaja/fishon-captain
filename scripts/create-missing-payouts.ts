/**
 * Create Missing Payouts Script
 *
 * This script creates payout records for all eligible bookings that have:
 * - captainEarnings calculated
 * - payoutStatus = PENDING
 * - No payoutBatchId assigned
 *
 * It groups bookings by captain and creates payout batches for those
 * with complete bank details.
 *
 * Usage:
 *   npx tsx scripts/create-missing-payouts.ts [--dry-run] [--include-all]
 *
 * Options:
 *   --dry-run      Show what would be created without making changes
 *   --include-all  Include ALL pending bookings (not just eligible ones past 3-day buffer)
 *
 * Requirements:
 *   - DATABASE_URL (fishon-captain DB)
 *   - MARKET_DATABASE_URL (fishon-market DB)
 *   - ENCRYPTION_KEY (for decrypting bank details)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { decrypt } from "../src/lib/encryption";

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

// System user ID for automated payouts
const SYSTEM_USER_ID = "system";

interface PendingBooking {
  id: string;
  charterId: string;
  captainEarnings: { toNumber(): number }; // Prisma Decimal
  date: Date;
  status: string;
}

interface PayoutCalculation {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  totalEarnings: number;
  bookingCount: number;
  bookingIds: string[];
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
}

/**
 * Calculate payout eligibility date (3 business days after trip)
 */
function getPayoutEligibleDate(tripDate: Date): Date {
  const date = new Date(tripDate);
  let businessDays = 0;
  while (businessDays < 3) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      businessDays++;
    }
  }
  return date;
}

function isPayoutEligible(tripDate: Date): boolean {
  const eligibleDate = getPayoutEligibleDate(tripDate);
  return new Date() >= eligibleDate;
}

/**
 * Generate batch ID
 */
function generateBatchId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  const random = Math.random().toString(36).substring(2, 8);
  return `${year}-W${week.toString().padStart(2, "0")}-${random}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const includeAll = process.argv.includes("--include-all");

  console.log("🔍 Create Missing Payouts Script");
  console.log("=====================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(
    `Filter: ${includeAll ? "ALL pending bookings" : "Only eligible (past 3-day buffer)"}`
  );
  console.log("");

  try {
    // Step 1: Find all PAID/COMPLETED bookings with PENDING payout status
    console.log("📋 Finding pending bookings...");

    const bookings = (await prismaMarket.booking.findMany({
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        payoutStatus: "PENDING",
        captainEarnings: { not: null },
        payoutBatchId: null, // Not yet assigned to a batch
      },
      select: {
        id: true,
        charterId: true,
        captainEarnings: true,
        date: true,
        status: true,
      },
    })) as PendingBooking[];

    if (bookings.length === 0) {
      console.log("✅ No pending bookings found!");
      return;
    }

    console.log(`Found ${bookings.length} pending booking(s)\n`);

    // Step 2: Filter by eligibility if not including all
    const now = new Date();
    const eligibleBookings = includeAll
      ? bookings
      : bookings.filter((b) => {
          const tripDate = new Date(b.date);
          return tripDate <= now && isPayoutEligible(tripDate);
        });

    if (eligibleBookings.length === 0) {
      console.log(
        "⚠️  No eligible bookings found (all within 3-day buffer or future trips)"
      );
      console.log("   Use --include-all to include all pending bookings");
      return;
    }

    console.log(`Eligible bookings: ${eligibleBookings.length}\n`);

    // Step 3: Get charter owners
    const charterIds = Array.from(
      new Set(eligibleBookings.map((b) => b.charterId))
    );
    console.log(
      `📦 Fetching owner data for ${charterIds.length} charter(s)...`
    );

    const charters = await prisma.charter.findMany({
      where: { id: { in: charterIds } },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            verification: {
              select: {
                bankName: true,
                bankAccountNumber: true,
                bankAccountHolder: true,
              },
            },
          },
        },
      },
    });

    type CharterWithOwner = (typeof charters)[number];
    type OwnerType = NonNullable<CharterWithOwner["owner"]>;

    const ownerMap = new Map<string, OwnerType>(
      charters.filter((c) => c.owner).map((c) => [c.id, c.owner!])
    );

    // Step 4: Group bookings by owner
    const ownerBookings = new Map<string, PendingBooking[]>();

    for (const booking of eligibleBookings) {
      const owner = ownerMap.get(booking.charterId);
      if (!owner) continue;

      if (!ownerBookings.has(owner.id)) {
        ownerBookings.set(owner.id, []);
      }
      ownerBookings.get(owner.id)!.push(booking);
    }

    // Step 5: Calculate payouts
    console.log("\n📊 Calculating payouts...\n");

    const calculations: PayoutCalculation[] = [];
    const skippedMissingBank: string[] = [];

    for (const [ownerId, ownerBookingList] of Array.from(
      ownerBookings.entries()
    )) {
      const owner = charters.find((c) => c.owner?.id === ownerId)?.owner;
      if (!owner) continue;

      // Decrypt bank details
      let accountNumber: string | null = null;
      let accountHolder: string | null = null;
      try {
        if (owner.verification?.bankAccountNumber) {
          accountNumber = decrypt(owner.verification.bankAccountNumber);
        }
        if (owner.verification?.bankAccountHolder) {
          accountHolder = decrypt(owner.verification.bankAccountHolder);
        }
      } catch {
        // Decryption failed
      }

      const bankName = owner.verification?.bankName || null;

      // Check if bank details are complete
      if (!bankName || !accountNumber || !accountHolder) {
        skippedMissingBank.push(owner.name || owner.email);
        continue;
      }

      const totalEarnings = ownerBookingList.reduce(
        (sum, b) => sum + (b.captainEarnings?.toNumber() || 0),
        0
      );

      calculations.push({
        ownerId,
        ownerName: owner.name || "Unknown",
        ownerEmail: owner.email,
        totalEarnings,
        bookingCount: ownerBookingList.length,
        bookingIds: ownerBookingList.map((b) => b.id),
        bankName,
        accountNumber,
        accountHolder,
      });
    }

    if (skippedMissingBank.length > 0) {
      console.log("⚠️  Skipped captains with missing bank details:");
      for (const name of skippedMissingBank) {
        console.log(`   - ${name}`);
      }
      console.log("");
    }

    if (calculations.length === 0) {
      console.log("❌ No captains with complete bank details found!");
      return;
    }

    // Step 6: Create payout batches
    console.log("💰 Creating payout batches...\n");

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30); // Last 30 days
    const periodEnd = new Date();
    const batchId = generateBatchId(periodStart);

    let created = 0;
    let errors = 0;

    for (const calc of calculations) {
      console.log(`📝 Captain: ${calc.ownerName} (${calc.ownerEmail})`);
      console.log(`   Bookings: ${calc.bookingCount}`);
      console.log(
        `   Total Earnings: RM ${calc.totalEarnings.toLocaleString()}`
      );
      console.log(`   Bank: ${calc.bankName}`);
      console.log(
        `   Account: ${calc.accountNumber?.replace(/(\d{4})(?=\d)/g, "$1 ")}`
      );

      if (!isDryRun) {
        try {
          const payoutBatchId = `${batchId}-${calc.ownerId.substring(0, 8)}`;

          // Create payout record
          const payout = await prisma.payout.create({
            data: {
              batchId: payoutBatchId,
              ownerId: calc.ownerId,
              periodStart,
              periodEnd,
              totalEarnings: calc.totalEarnings,
              deductions: 0,
              netPayout: calc.totalEarnings,
              bookingIds: calc.bookingIds,
              bookingCount: calc.bookingCount,
              bankName: calc.bankName!,
              accountNumber: calc.accountNumber!,
              accountHolder: calc.accountHolder!,
              status: "PENDING",
              createdBy: SYSTEM_USER_ID,
            },
          });

          // Update bookings to reference batch
          await prismaMarket.booking.updateMany({
            where: { id: { in: calc.bookingIds } },
            data: {
              payoutStatus: "SCHEDULED",
              payoutBatchId: payout.batchId,
            },
          });

          console.log(`   ✅ Created payout: ${payout.batchId}\n`);
          created++;
        } catch (error) {
          console.log(
            `   ❌ Error: ${error instanceof Error ? error.message : "Unknown"}\n`
          );
          errors++;
        }
      } else {
        console.log(`   ⏭️  Would create payout (dry run)\n`);
        created++;
      }
    }

    // Summary
    console.log("\n=====================================");
    console.log("📈 Summary");
    console.log("=====================================");
    console.log(`Total eligible bookings: ${eligibleBookings.length}`);
    console.log(`Captains with complete bank details: ${calculations.length}`);
    console.log(`Captains missing bank details: ${skippedMissingBank.length}`);
    console.log(`Payouts created: ${created}`);
    console.log(`Errors: ${errors}`);

    const totalAmount = calculations.reduce(
      (sum, c) => sum + c.totalEarnings,
      0
    );
    console.log(`Total payout amount: RM ${totalAmount.toLocaleString()}`);

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
