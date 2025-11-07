/**
 * Migration Script: Copy backupPhone from Charter to CaptainProfile
 *
 * This script copies backupPhone values from Charter table to CaptainProfile table.
 * Strategy:
 * - For each CaptainProfile, find all their charters with backupPhone
 * - If CaptainProfile.backupPhone is empty, use the first non-null backupPhone from their charters
 * - Log all actions for review
 *
 * Usage: npx tsx scripts/migrate-backup-phone.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateBackupPhone() {
  console.log(
    "🚀 Starting backupPhone migration from Charter to CaptainProfile...\n"
  );

  try {
    // Get all captain profiles
    const captains = await prisma.captainProfile.findMany({
      select: {
        id: true,
        displayName: true,
        backupPhone: true,
        charters: {
          select: {
            id: true,
            name: true,
            backupPhone: true,
          },
          where: {
            backupPhone: {
              not: null,
            },
          },
        },
      },
    });

    console.log(`📊 Found ${captains.length} captain profiles\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let noDataCount = 0;

    for (const captain of captains) {
      const chartersWithBackupPhone = captain.charters.filter(
        (c) => c.backupPhone && c.backupPhone.trim() !== ""
      );

      // Skip if captain already has backupPhone
      if (captain.backupPhone && captain.backupPhone.trim() !== "") {
        console.log(
          `⏭️  Skipped: ${captain.displayName} (ID: ${captain.id}) - already has backupPhone: ${captain.backupPhone}`
        );
        skippedCount++;
        continue;
      }

      // Skip if no charters have backupPhone
      if (chartersWithBackupPhone.length === 0) {
        console.log(
          `ℹ️  No data: ${captain.displayName} (ID: ${captain.id}) - no charters with backupPhone`
        );
        noDataCount++;
        continue;
      }

      // Use the first charter's backupPhone
      const backupPhoneToUse = chartersWithBackupPhone[0].backupPhone!;

      // Update captain profile
      await prisma.captainProfile.update({
        where: { id: captain.id },
        data: { backupPhone: backupPhoneToUse },
      });

      console.log(`✅ Updated: ${captain.displayName} (ID: ${captain.id})`);
      console.log(`   └─ Set backupPhone: ${backupPhoneToUse}`);
      console.log(
        `   └─ Source: Charter "${chartersWithBackupPhone[0].name}" (${chartersWithBackupPhone.length} charter(s) had this data)\n`
      );

      updatedCount++;
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   ✅ Updated: ${updatedCount} captain(s)`);
    console.log(
      `   ⏭️  Skipped (already had data): ${skippedCount} captain(s)`
    );
    console.log(`   ℹ️  No data to migrate: ${noDataCount} captain(s)`);
    console.log(`   📊 Total processed: ${captains.length} captain(s)`);

    console.log("\n✨ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateBackupPhone()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
