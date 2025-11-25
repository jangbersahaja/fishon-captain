const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const charterId = "cmgbtc2cz0009uyrk10sbsuko";

  const records = await prisma.charterUnavailability.findMany({
    where: { charterId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      isAllDay: true,
      startTime: true,
      endTime: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { startDate: "asc" },
  });

  console.log(
    `\nFound ${records.length} total unavailability record(s) for charter ${charterId}:\n`
  );

  records.forEach((record, i) => {
    console.log(`${i + 1}. ID: ${record.id}`);
    console.log(`   Start Date: ${record.startDate.toISOString()}`);
    console.log(`   End Date: ${record.endDate.toISOString()}`);
    console.log(`   Is All Day: ${record.isAllDay}`);
    console.log(`   Start Time: ${record.startTime || "(none)"}`);
    console.log(`   End Time: ${record.endTime || "(none)"}`);
    console.log(`   Reason: ${record.reason || "(none)"}`);
    console.log(`   Created: ${record.createdAt.toISOString()}`);
    console.log("");
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
