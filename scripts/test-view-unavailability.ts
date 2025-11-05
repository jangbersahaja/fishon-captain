/**
 * Test script to verify v_public_charters view includes unavailability data
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testViewUnavailability() {
  try {
    console.log(
      "🔍 Testing v_public_charters view for unavailability data...\n"
    );

    // Query the view directly
    const result = await prisma.$queryRaw<
      Array<{ id: string; charter: Record<string, unknown> }>
    >`
      SELECT id, charter 
      FROM v_public_charters 
      LIMIT 5
    `;

    if (!result || result.length === 0) {
      console.log("❌ No charters found in view");
      return;
    }

    console.log(`✅ Found ${result.length} charters in view\n`);

    // Check each charter for unavailability field
    result.forEach((row, index) => {
      const charter = row.charter as Record<string, unknown>;
      console.log(
        `Charter ${index + 1}: ${(charter.name as string) || charter.id}`
      );
      console.log(
        `  - Has schedule field: ${charter.schedule !== undefined ? "✅" : "❌"}`
      );
      console.log(
        `  - Has unavailability field: ${charter.unavailability !== undefined ? "✅" : "❌"}`
      );

      if (charter.unavailability && Array.isArray(charter.unavailability)) {
        console.log(
          `  - Unavailability entries: ${charter.unavailability.length}`
        );
        if (charter.unavailability.length > 0) {
          console.log(
            `  - Sample entry:`,
            JSON.stringify(charter.unavailability[0], null, 2)
          );
        }
      }

      if (charter.schedule && typeof charter.schedule === "object") {
        const schedule = charter.schedule as Record<string, unknown>;
        console.log(`  - Schedule type: ${schedule.type || "N/A"}`);
      }

      console.log("");
    });

    console.log("✅ View test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing view:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testViewUnavailability();
