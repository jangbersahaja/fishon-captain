/**
 * Verification script for CharterMedia captainId backfill
 *
 * Run with: npx tsx scripts/verify-charter-media-captain-id.ts
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Verifying CharterMedia captainId backfill...\n");

  // Count total CharterMedia records
  const totalMedia = await prisma.charterMedia.count();
  console.log(`📊 Total CharterMedia records: ${totalMedia}`);

  // Count records with captainId
  const withCaptainId = await prisma.charterMedia.count({
    where: { captainId: { not: null } },
  });
  console.log(`✅ Records with captainId: ${withCaptainId}`);

  // Count records without captainId
  const withoutCaptainId = await prisma.charterMedia.count({
    where: { captainId: null },
  });
  console.log(`❌ Records without captainId: ${withoutCaptainId}`);

  if (withoutCaptainId > 0) {
    console.log("\n⚠️  Found records without captainId. Investigating...\n");

    const orphaned = await prisma.charterMedia.findMany({
      where: { captainId: null },
      include: {
        charter: {
          select: {
            id: true,
            name: true,
            captainId: true,
          },
        },
      },
      take: 10,
    });

    console.log("Sample orphaned records:");
    orphaned.forEach((media) => {
      console.log(`  - Media ID: ${media.id}`);
      console.log(`    Charter ID: ${media.charterId}`);
      console.log(`    Charter Name: ${media.charter?.name || "Unknown"}`);
      console.log(
        `    Charter Captain ID: ${media.charter?.captainId || "NULL"}`
      );
      console.log("");
    });
  }

  // Verify data integrity: captainId matches charter.captainId
  console.log("\n🔍 Checking for mismatches...");
  const allMedia = await prisma.charterMedia.findMany({
    where: { captainId: { not: null } },
    include: {
      charter: {
        select: { captainId: true },
      },
    },
  });

  const mismatches = allMedia.filter(
    (m) => m.captainId !== m.charter?.captainId
  );

  if (mismatches.length > 0) {
    console.log(
      `\n⚠️  Found ${mismatches.length} records where captainId doesn't match charter.captainId`
    );
    console.log("Sample mismatches:");
    mismatches.slice(0, 5).forEach((m) => {
      console.log(`  Media ID: ${m.id}`);
      console.log(`    Media captainId: ${m.captainId}`);
      console.log(`    Charter captainId: ${m.charter?.captainId}`);
    });
  } else {
    console.log("✅ All captainIds match their charter's captainId");
  }

  // Note: kind field removed from CharterMedia - all records are photos now
  console.log("\n📷 CharterMedia records (all photos):");
  const totalCount = await prisma.charterMedia.count({
    where: { captainId: { not: null } },
  });
  console.log(`  Total: ${totalCount} records`);

  console.log("\n✅ Verification complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
