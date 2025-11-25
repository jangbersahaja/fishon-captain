#!/usr/bin/env node
/**
 * Create test time-based unavailability records
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Get first charter with its owner
  const charter = await prisma.charter.findFirst({
    where: { isActive: true },
    include: { owner: true },
  });

  if (!charter) {
    console.log("No active charters found");
    return;
  }

  const createdBy = charter.ownerId || charter.owner?.id;
  if (!createdBy) {
    console.log("No owner found for charter");
    return;
  }

  console.log(
    `Creating time-based unavailability for charter: ${charter.id} (${charter.name})`
  );

  // Create time-based unavailability: Morning block (08:00-12:00) tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const morningBlock = await prisma.charterUnavailability.create({
    data: {
      charterId: charter.id,
      startDate: tomorrow,
      endDate: tomorrow,
      isAllDay: false,
      startTime: "08:00",
      endTime: "12:00",
      reason: "Test: Morning maintenance",
      createdBy: createdBy,
    },
  });

  console.log("✅ Created morning block (08:00-12:00):", morningBlock);

  // Create afternoon block (14:00-17:00) day after tomorrow
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const afternoonBlock = await prisma.charterUnavailability.create({
    data: {
      charterId: charter.id,
      startDate: dayAfter,
      endDate: dayAfter,
      isAllDay: false,
      startTime: "14:00",
      endTime: "17:00",
      reason: "Test: Afternoon booking conflict",
      createdBy: createdBy,
    },
  });

  console.log("✅ Created afternoon block (14:00-17:00):", afternoonBlock);

  // Create full day block for comparison
  const fullDayDate = new Date(tomorrow);
  fullDayDate.setDate(fullDayDate.getDate() + 2);

  const fullDayBlock = await prisma.charterUnavailability.create({
    data: {
      charterId: charter.id,
      startDate: fullDayDate,
      endDate: fullDayDate,
      isAllDay: true,
      reason: "Test: Full day block",
      createdBy: createdBy,
    },
  });

  console.log("✅ Created full day block:", fullDayBlock);

  console.log("\n📅 Test dates created:");
  console.log(
    `  - ${tomorrow.toISOString().split("T")[0]}: Morning block (08:00-12:00) - should show orange dot`
  );
  console.log(
    `  - ${dayAfter.toISOString().split("T")[0]}: Afternoon block (14:00-17:00) - should show orange dot`
  );
  console.log(
    `  - ${fullDayDate.toISOString().split("T")[0]}: Full day block - should be strikethrough`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
