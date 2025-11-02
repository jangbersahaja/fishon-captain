#!/usr/bin/env tsx
/**
 * Seed Default Charter Schedules
 *
 * Creates EVERYDAY schedule for all charters that don't have one yet.
 * This is a one-time migration script for existing charters.
 */

import { PrismaClient, ScheduleType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting schedule seeding...\n");

  // Find all charters without schedules
  const chartersWithoutSchedule = await prisma.charter.findMany({
    where: {
      schedule: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(
    `Found ${chartersWithoutSchedule.length} charters without schedules\n`
  );

  if (chartersWithoutSchedule.length === 0) {
    console.log("✅ All charters already have schedules!");
    return;
  }

  // Create default schedules
  let successCount = 0;
  let errorCount = 0;

  for (const charter of chartersWithoutSchedule) {
    try {
      await prisma.charterSchedule.create({
        data: {
          charterId: charter.id,
          scheduleType: ScheduleType.EVERYDAY,
          operationalDays: [], // Empty for EVERYDAY type
        },
      });
      console.log(`✅ Created schedule for: ${charter.name} (${charter.id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create schedule for ${charter.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n=== Seeding Complete ===`);
  console.log(`✅ Success: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Fatal error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
