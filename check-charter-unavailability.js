#!/usr/bin/env node
/**
 * Check unavailability for charter cmgbtc2cz0009uyrk10sbsuko
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const charterId = "cmgbtc2cz0009uyrk10sbsuko";

  // Get unavailability for this charter
  const unavailability = await prisma.charterUnavailability.findMany({
    where: {
      charterId,
      startDate: {
        gte: new Date("2025-12-31"),
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });

  console.log(
    `Found ${unavailability.length} unavailability records for charter ${charterId}:\n`
  );

  unavailability.forEach((u) => {
    console.log("---");
    console.log(`ID: ${u.id}`);
    console.log(`Start: ${u.startDate.toISOString()}`);
    console.log(`End: ${u.endDate.toISOString()}`);
    console.log(`Is All Day: ${u.isAllDay}`);
    console.log(`Start Time: ${u.startTime || "N/A"}`);
    console.log(`End Time: ${u.endTime || "N/A"}`);
    console.log(`Reason: ${u.reason || "N/A"}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
