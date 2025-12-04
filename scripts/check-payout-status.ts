/**
 * Quick script to check current payout status
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const createMarketClient = () => {
  const marketUrl = process.env.MARKET_DATABASE_URL;
  if (!marketUrl) throw new Error("MARKET_DATABASE_URL required");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    PrismaClient: MarketClient,
  } = require("../../fishon-market/node_modules/@prisma/client");
  return new MarketClient({ datasources: { db: { url: marketUrl } } });
};

async function main() {
  const market = createMarketClient();

  console.log("\n📊 All Bookings with Earnings:");
  console.log("==============================");

  const bookings = await market.booking.findMany({
    where: {
      status: { in: ["PAID", "COMPLETED"] },
      captainEarnings: { not: null },
    },
    select: {
      id: true,
      status: true,
      date: true,
      captainEarnings: true,
      charterId: true,
      payoutStatus: true,
      payoutBatchId: true,
    },
  });

  if (bookings.length === 0) {
    console.log("No bookings with earnings found.");
  } else {
    for (const b of bookings) {
      console.log(`- Booking: ${b.id.slice(0, 8)}...`);
      console.log(`  Status: ${b.status}`);
      console.log(`  Trip Date: ${new Date(b.date).toDateString()}`);
      console.log(`  Earnings: RM ${Number(b.captainEarnings)}`);
      console.log(`  Payout Status: ${b.payoutStatus}`);
      console.log(`  Payout Batch: ${b.payoutBatchId || "None"}`);
      console.log("");
    }
  }

  console.log("\n💰 Existing Payouts:");
  console.log("====================");

  const payouts = await prisma.payout.findMany({
    include: { owner: { select: { name: true, email: true } } },
  });

  if (payouts.length === 0) {
    console.log("No payouts in database.");
  } else {
    for (const p of payouts) {
      console.log(`- Batch: ${p.batchId}`);
      console.log(`  Owner: ${p.owner?.name || "Unknown"}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Amount: RM ${Number(p.netPayout)}`);
      console.log(`  Bookings: ${p.bookingIds.length}`);
      console.log("");
    }
  }

  await prisma.$disconnect();
  await market.$disconnect();
}

main().catch(console.error);
