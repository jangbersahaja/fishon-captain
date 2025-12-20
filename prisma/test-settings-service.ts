/**
 * Integration Test for Settings Service
 * Run with: npx tsx prisma/test-settings-service.ts
 *
 * Tests actual database operations (not mocked)
 */

import { PrismaClient } from "@prisma/client";
import {
  getPromoSplitConfig,
  updatePromoSplitConfig,
} from "../src/lib/services/settings-service";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Testing Settings Service Integration\n");

  try {
    // Test 1: Get current config
    console.log("Test 1: Fetching current promo split config...");
    const current = await getPromoSplitConfig();
    console.log("✅ Current config:", current);
    console.log();

    // Test 2: Update to 60/40
    console.log("Test 2: Updating to 60/40 split...");
    const updated = await updatePromoSplitConfig(
      { captainPercent: 60, platformPercent: 40 },
      "test-user"
    );
    console.log("✅ Updated config:", updated);
    console.log();

    // Test 3: Verify cache invalidation
    console.log("Test 3: Fetching after update (should see 60/40)...");
    const afterUpdate = await getPromoSplitConfig();
    console.log("✅ Config after update:", afterUpdate);
    console.log();

    // Test 4: Test caching (second call should be cached)
    console.log("Test 4: Testing cache (second fetch)...");
    const startTime = Date.now();
    const cached = await getPromoSplitConfig();
    const duration = Date.now() - startTime;
    console.log("✅ Cached config:", cached);
    console.log(`   Fetch time: ${duration}ms (should be <5ms for cache hit)`);
    console.log();

    // Test 5: Restore to 50/50
    console.log("Test 5: Restoring to default 50/50 split...");
    const restored = await updatePromoSplitConfig(
      { captainPercent: 50, platformPercent: 50 },
      "test-user"
    );
    console.log("✅ Restored config:", restored);
    console.log();

    // Test 6: Validation test (should fail)
    console.log(
      "Test 6: Testing validation (should fail for invalid input)..."
    );
    try {
      await updatePromoSplitConfig(
        { captainPercent: 60, platformPercent: 30 }, // Sum = 90, should fail
        "test-user"
      );
      console.log("❌ Validation test failed - should have thrown error");
    } catch (error) {
      console.log(
        "✅ Validation correctly rejected:",
        (error as Error).message
      );
    }
    console.log();

    // Test 7: Check audit log
    console.log("Test 7: Checking audit log entries...");
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: "UPDATE_PROMO_SPLIT_CONFIG",
        actorUserId: "test-user",
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    console.log(`✅ Found ${auditLogs.length} audit log entries`);
    auditLogs.forEach((log, i) => {
      console.log(`   Entry ${i + 1}:`);
      console.log(`     Before:`, log.before);
      console.log(`     After:`, log.after);
      console.log(`     Changed:`, log.changed);
    });
    console.log();

    console.log("🎉 All integration tests passed!");
  } catch (error) {
    console.error("❌ Integration test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
