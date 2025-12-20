/**
 * Verify SystemSettings setup
 * Run with: npx tsx prisma/verify-system-settings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying SystemSettings setup...\n");

  // Check if table exists and has data
  const settings = await prisma.systemSettings.findMany();
  console.log(`📊 Total settings: ${settings.length}`);

  // Check promo split config
  const promoSplit = await prisma.systemSettings.findUnique({
    where: { key: "PROMO_SPLIT_CONFIG" },
  });

  if (promoSplit) {
    console.log("\n✅ PROMO_SPLIT_CONFIG found:");
    console.log("   ID:", promoSplit.id);
    console.log("   Category:", promoSplit.category);
    console.log("   Description:", promoSplit.description);
    console.log("   Value:", JSON.stringify(promoSplit.value, null, 2));
    console.log("   Created:", promoSplit.createdAt.toISOString());
    console.log("   Updated:", promoSplit.updatedAt.toISOString());
  } else {
    console.log("\n❌ PROMO_SPLIT_CONFIG not found");
  }

  console.log("\n🎉 Phase 1 setup verified successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error verifying setup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
