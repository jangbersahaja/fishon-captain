import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyBoatMigration() {
  console.log(
    "🔍 Verifying Boat → Charter relationship change (1:1 → 1:many)\n"
  );

  try {
    // Check if we can query the new plural relationship
    const boats = await prisma.boat.findMany({
      include: {
        charters: true, // This should work now (plural)
      },
    });

    console.log(
      `✅ Successfully queried ${boats.length} boats with charters relationship`
    );

    // Show boat usage
    boats.forEach((boat) => {
      console.log(
        `  - Boat "${boat.name}": ${boat.charters.length} charter(s) using this boat`
      );
    });

    // Check Charter boatId field (should not have unique constraint)
    const charters = await prisma.charter.findMany({
      where: {
        boatId: { not: null },
      },
      select: {
        id: true,
        name: true,
        boatId: true,
        boat: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`\n✅ Found ${charters.length} charters with boats assigned`);

    // Group charters by boatId to verify multiple charters can share same boat
    const boatUsage = charters.reduce(
      (acc, charter) => {
        if (charter.boatId) {
          acc[charter.boatId] = (acc[charter.boatId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const sharedBoats = Object.entries(boatUsage).filter(
      ([, count]) => count > 1
    );

    if (sharedBoats.length > 0) {
      console.log("\n🎉 Boats shared by multiple charters:");
      sharedBoats.forEach(([boatId, count]) => {
        const boat = boats.find((b) => b.id === boatId);
        console.log(`  - Boat "${boat?.name}": Used by ${count} charters`);
      });
    } else {
      console.log(
        "\n✅ No boats currently shared (but now possible with 1:many relationship)"
      );
    }

    console.log(
      "\n✅ VERIFICATION SUCCESS: Boat → Charter is now 1:many relationship"
    );
  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBoatMigration();
