#!/usr/bin/env node
/**
 * Quick script to check unavailability data in the database
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Count unavailability records
  const count = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_count, 
      COUNT(CASE WHEN "isAllDay" = false THEN 1 END) as time_based_count,
      COUNT(CASE WHEN "isAllDay" IS NULL THEN 1 END) as null_count,
      COUNT(CASE WHEN "isAllDay" = true THEN 1 END) as all_day_count
    FROM charter_unavailability
  `;

  console.log("Unavailability counts:", count[0]);

  // Get a sample of time-based unavailability
  const timeBased = await prisma.$queryRaw`
    SELECT id, "charterId", "startDate", "endDate", "isAllDay", "startTime", "endTime", reason
    FROM charter_unavailability
    WHERE "isAllDay" = false
    LIMIT 5
  `;

  console.log("\nTime-based unavailability records:", timeBased);

  // Check a charter's unavailability from the view
  const viewData = await prisma.$queryRaw`
    SELECT charter->'unavailability' as unavailability
    FROM v_public_charters
    WHERE jsonb_array_length(charter->'unavailability') > 0
    LIMIT 1
  `;

  console.log("\nSample unavailability from view:");
  if (viewData.length > 0) {
    console.log(JSON.stringify(viewData[0].unavailability, null, 2));
  } else {
    console.log("No charters with unavailability found");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
