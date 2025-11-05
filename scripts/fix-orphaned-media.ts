#!/usr/bin/env tsx
/**
 * Check and fix media without ownerId
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixOrphanedMedia() {
  console.log("🔍 Finding media without ownerId...\n");

  try {
    // Find media without ownerId
    const orphanedMedia = await prisma.charterMedia.findMany({
      where: { ownerId: null },
      include: {
        charter: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            captainId: true,
          },
        },
      },
    });

    console.log(`Found ${orphanedMedia.length} media files without ownerId\n`);

    if (orphanedMedia.length === 0) {
      console.log("✅ All media files have ownerId");
      return;
    }

    // Show some examples
    console.log("Examples:");
    orphanedMedia.slice(0, 5).forEach((media) => {
      console.log(`  - Media ID: ${media.id}`);
      console.log(`    Charter: ${media.charter?.name || "NO CHARTER"}`);
      console.log(`    Charter ownerId: ${media.charter?.ownerId || "NULL"}`);
      console.log(`    captainId: ${media.captainId || "NULL"}\n`);
    });

    // Group by situation
    const withCharter = orphanedMedia.filter((m) => m.charterId);
    const withoutCharter = orphanedMedia.filter((m) => !m.charterId);

    console.log(`\n📊 Breakdown:`);
    console.log(
      `  - ${withCharter.length} media with charter (can populate from charter.ownerId)`
    );
    console.log(
      `  - ${withoutCharter.length} media without charter (need manual fix)\n`
    );

    // Fix media with charter
    if (withCharter.length > 0) {
      console.log(`🔧 Fixing ${withCharter.length} media with charter...`);

      for (const media of withCharter) {
        if (media.charter?.ownerId) {
          await prisma.charterMedia.update({
            where: { id: media.id },
            data: { ownerId: media.charter.ownerId },
          });
          console.log(
            `  ✅ Updated media ${media.id} with ownerId ${media.charter.ownerId}`
          );
        }
      }
    }

    // Report unfixable media
    if (withoutCharter.length > 0) {
      console.log(
        `\n⚠️  ${withoutCharter.length} media files need manual attention:`
      );
      withoutCharter.forEach((media) => {
        console.log(`  - Media ID: ${media.id}, Storage: ${media.storageKey}`);
      });
    }

    console.log("\n✅ Fix complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedMedia();
