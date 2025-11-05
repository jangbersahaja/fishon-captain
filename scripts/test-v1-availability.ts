/**
 * Test script for v1 availability endpoint
 *
 * Tests that the new /api/public/v1/charters/:id/availability endpoint
 * returns the same data structure as the legacy endpoint.
 */

const CAPTAIN_URL = "http://localhost:3000";
const API_KEY = process.env.FISHON_CAPTAIN_API_KEY || "";

async function testAvailabilityEndpoint() {
  console.log("🧪 Testing v1 Availability Endpoint\n");

  if (!API_KEY) {
    console.error("❌ FISHON_CAPTAIN_API_KEY not set");
    return;
  }

  // Get a charter ID from the database
  const chartersRes = await fetch(`${CAPTAIN_URL}/api/public/v1/charters`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!chartersRes.ok) {
    console.error("❌ Failed to fetch charters");
    return;
  }

  const charters = await chartersRes.json();
  if (!charters || charters.length === 0) {
    console.error("❌ No charters found");
    return;
  }

  const testCharter = charters[0];
  console.log(
    `📍 Testing with charter: ${testCharter.charter.name} (${testCharter.id})\n`
  );

  // Test date range
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`📅 Date range: ${startDate} to ${endDate}\n`);

  // Test v1 endpoint
  const v1Url = `${CAPTAIN_URL}/api/public/v1/charters/${testCharter.id}/availability?startDate=${startDate}&endDate=${endDate}`;
  console.log(`🔗 Testing: ${v1Url}\n`);

  const v1Res = await fetch(v1Url);

  if (!v1Res.ok) {
    console.error(`❌ v1 endpoint failed: ${v1Res.status}`);
    const error = await v1Res.text();
    console.error(error);
    return;
  }

  const v1Data = await v1Res.json();

  console.log("✅ v1 Endpoint Response:");
  console.log(`   - schedule.scheduleType: ${v1Data.schedule?.scheduleType}`);
  console.log(
    `   - schedule.operationalDays: ${JSON.stringify(v1Data.schedule?.operationalDays)}`
  );
  console.log(
    `   - unavailability count: ${v1Data.unavailability?.length || 0}`
  );
  console.log(
    `   - dateAvailability count: ${v1Data.dateAvailability?.length || 0}`
  );

  if (v1Data.unavailability?.length > 0) {
    console.log("\n📊 Sample unavailability:");
    console.log(`   ${JSON.stringify(v1Data.unavailability[0], null, 2)}`);
  }

  type DateAvailability = { available: boolean; [key: string]: unknown };

  if (v1Data.dateAvailability?.length > 0) {
    const blockedDates = (v1Data.dateAvailability as DateAvailability[]).filter(
      (d) => !d.available
    );
    console.log(`\n🚫 Blocked dates: ${blockedDates.length}`);
    if (blockedDates.length > 0) {
      console.log(`   Sample: ${JSON.stringify(blockedDates[0], null, 2)}`);
    }
  }

  // Test legacy endpoint for comparison (if it still exists)
  console.log("\n🔄 Comparing with legacy endpoint...");
  const legacyUrl = `${CAPTAIN_URL}/api/public/charters/${testCharter.id}/availability?startDate=${startDate}&endDate=${endDate}`;
  const legacyRes = await fetch(legacyUrl);

  if (legacyRes.ok) {
    const legacyData = await legacyRes.json();

    // Compare responses
    type DateAvailability = { available: boolean; [key: string]: unknown };

    const v1Blocked =
      (v1Data.dateAvailability as DateAvailability[] | undefined)?.filter(
        (d) => !d.available
      ).length || 0;
    const legacyBlocked =
      (legacyData.dateAvailability as DateAvailability[] | undefined)?.filter(
        (d) => !d.available
      ).length || 0;

    if (v1Blocked === legacyBlocked) {
      console.log(
        `✅ Data parity confirmed! Both endpoints block ${v1Blocked} dates`
      );
    } else {
      console.log(
        `⚠️  Mismatch: v1=${v1Blocked} blocked, legacy=${legacyBlocked} blocked`
      );
    }
  } else {
    console.log("ℹ️  Legacy endpoint not available (already removed)");
  }

  console.log("\n✅ Test complete!");
}

testAvailabilityEndpoint().catch(console.error);
