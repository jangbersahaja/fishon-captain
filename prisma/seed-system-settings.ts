/**
 * Seed script for SystemSettings
 * Run with: npx tsx prisma/seed-system-settings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SystemSettings...");

  // Seed default promo split configuration
  const promoSplit = await prisma.systemSettings.upsert({
    where: { key: "PROMO_SPLIT_CONFIG" },
    create: {
      key: "PROMO_SPLIT_CONFIG",
      value: { captainPercent: 50.0, platformPercent: 50.0 },
      category: "PRICING",
      description:
        "Controls how promo discounts are split between captain and platform",
    },
    update: {},
  });

  console.log("✅ Created/Updated PROMO_SPLIT_CONFIG:", promoSplit);
  console.log("   Default: 50% Captain / 50% Platform");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding SystemSettings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
