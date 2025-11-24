#!/usr/bin/env node
/**
 * Data Migration Script: Fix Time-Based Unavailability Records
 *
 * Problem: Existing records have times embedded in startDate/endDate
 *          but isAllDay=true (wrong)
 *
 * Solution: Extract times to startTime/endTime and set isAllDay=false
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 Step 1: Finding affected records...\n");

  // Find records with times but isAllDay=true
  const affected = await prisma.$queryRaw`
    SELECT 
      id,
      "charterId",
      "startDate",
      "endDate",
      "isAllDay",
      "startTime",
      "endTime",
      reason,
      EXTRACT(HOUR FROM "startDate") as start_hour,
      EXTRACT(MINUTE FROM "startDate") as start_minute,
      EXTRACT(HOUR FROM "endDate") as end_hour,
      EXTRACT(MINUTE FROM "endDate") as end_minute
    FROM charter_unavailability
    WHERE 
      "isAllDay" = true
      AND (
        EXTRACT(HOUR FROM "startDate") != 0 
        OR EXTRACT(MINUTE FROM "startDate") != 0
        OR EXTRACT(HOUR FROM "endDate") != 0 
        OR EXTRACT(MINUTE FROM "endDate") != 0
      )
    ORDER BY "startDate"
  `;

  if (affected.length === 0) {
    console.log(
      "✅ No records need fixing. All time-based unavailability records are already correct.\n"
    );
    return;
  }

  console.log(`Found ${affected.length} record(s) that need fixing:\n`);
  affected.forEach((record, index) => {
    console.log(`${index + 1}. ID: ${record.id}`);
    console.log(`   Charter: ${record.charterId}`);
    console.log(
      `   Date Range: ${record.startDate.toISOString()} → ${record.endDate.toISOString()}`
    );
    console.log(
      `   Times: ${record.start_hour}:${String(record.start_minute).padStart(2, "0")} → ${record.end_hour}:${String(record.end_minute).padStart(2, "0")} (UTC)`
    );
    console.log(
      `   Current: isAllDay=${record.isAllDay}, startTime=${record.startTime}, endTime=${record.endTime}`
    );
    console.log(`   Reason: ${record.reason || "(none)"}\n`);
  });

  console.log("\n⚠️  This will:");
  console.log("   1. Set isAllDay = false");
  console.log("   2. Extract times to startTime/endTime (Malaysia timezone)");
  console.log("   3. Reset date fields to midnight (remove time component)");
  console.log("\n❓ Do you want to proceed? (yes/no)");

  // Wait for user input
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    readline.question("", (ans) => {
      readline.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (answer !== "yes") {
    console.log("\n❌ Migration cancelled.\n");
    return;
  }

  console.log("\n🔄 Step 2: Applying migration...\n");

  // Apply the fix
  const result = await prisma.$executeRaw`
    UPDATE charter_unavailability
    SET 
      "isAllDay" = false,
      "startTime" = TO_CHAR(("startDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH24:MI'),
      "endTime" = TO_CHAR(("endDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH24:MI'),
      "startDate" = DATE_TRUNC('day', ("startDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur' AT TIME ZONE 'UTC',
      "endDate" = DATE_TRUNC('day', ("endDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur' AT TIME ZONE 'UTC',
      "updatedAt" = NOW()
    WHERE 
      "isAllDay" = true
      AND (
        EXTRACT(HOUR FROM "startDate") != 0 
        OR EXTRACT(MINUTE FROM "startDate") != 0
        OR EXTRACT(HOUR FROM "endDate") != 0 
        OR EXTRACT(MINUTE FROM "endDate") != 0
      )
  `;

  console.log(`✅ Successfully updated ${result} record(s)\n`);

  console.log("\n🔍 Step 3: Verifying changes...\n");

  // Verify the changes
  const fixed = await prisma.charterUnavailability.findMany({
    where: {
      isAllDay: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 20,
  });

  if (fixed.length > 0) {
    console.log(
      `Showing ${Math.min(fixed.length, 20)} most recently updated time-based records:\n`
    );
    fixed.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   Charter: ${record.charterId}`);
      console.log(
        `   Date Range: ${record.startDate.toISOString().split("T")[0]} → ${record.endDate.toISOString().split("T")[0]}`
      );
      console.log(
        `   Times: ${record.startTime} → ${record.endTime} (Malaysia time)`
      );
      console.log(`   isAllDay: ${record.isAllDay}`);
      console.log(`   Updated: ${record.updatedAt.toISOString()}\n`);
    });
  }

  console.log("✅ Migration complete!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
