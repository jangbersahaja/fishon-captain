#!/usr/bin/env node
/**
 * Data Migration Script: Fix Time-Based Unavailability Records (Auto-confirm)
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 Finding affected records...\n");

  const affected = await prisma.$queryRaw`
    SELECT 
      id,
      "charterId",
      "startDate",
      "endDate",
      "isAllDay",
      "startTime",
      "endTime"
    FROM charter_unavailability
    WHERE 
      "isAllDay" = true
      AND (
        EXTRACT(HOUR FROM "startDate") != 0 
        OR EXTRACT(MINUTE FROM "startDate") != 0
        OR EXTRACT(HOUR FROM "endDate") != 0 
        OR EXTRACT(MINUTE FROM "endDate") != 0
      )
  `;

  if (affected.length === 0) {
    console.log("✅ No records need fixing.\n");
    return;
  }

  console.log(`Found ${affected.length} record(s) to fix\n`);

  console.log("🔄 Applying migration...\n");

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

  console.log(`✅ Updated ${result} record(s)\n`);

  console.log("🔍 Verifying changes...\n");

  const fixed = await prisma.charterUnavailability.findMany({
    where: {
      id: { in: affected.map((r) => r.id) },
    },
    select: {
      id: true,
      charterId: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      isAllDay: true,
    },
  });

  console.log("Fixed records:\n");
  fixed.forEach((record, index) => {
    console.log(`${index + 1}. ID: ${record.id.slice(0, 12)}...`);
    console.log(
      `   Date: ${record.startDate.toISOString().split("T")[0]} → ${record.endDate.toISOString().split("T")[0]}`
    );
    console.log(`   Time: ${record.startTime} → ${record.endTime}`);
    console.log(`   isAllDay: ${record.isAllDay}\n`);
  });

  console.log("✅ Migration complete!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
