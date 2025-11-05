#!/usr/bin/env tsx
/**
 * Fix orphaned media by looking up captain from storage path
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixOrphanedMediaByCaptainPath() {
  console.log("🔍 Finding and fixing orphaned media by captain path...\n");

  try {
    // Find media without ownerId
    const orphanedMedia = await prisma.charterMedia.findMany({
      where: {
        ownerId: null,
        charterId: null,
      },
    });

    console.log(`Found ${orphanedMedia.length} orphaned media files\n`);

    for (const media of orphanedMedia) {
      // Extract captainId from storage path: captains/{captainId}/media/...
      const match = media.storageKey.match(/captains\/([^\/]+)\//);

      if (match) {
        const captainIdFromPath = match[1];
        console.log(
          `Media ${media.id}: Found captain ${captainIdFromPath} in path`
        );

        // Look up this captain's userId
        const captainProfile = await prisma.captainProfile.findUnique({
          where: { id: captainIdFromPath },
          select: { userId: true },
        });

        if (captainProfile) {
          await prisma.charterMedia.update({
            where: { id: media.id },
            data: {
              ownerId: captainProfile.userId,
              captainId: captainIdFromPath,
            },
          });
          console.log(`  ✅ Updated with ownerId ${captainProfile.userId}`);
        } else {
          console.log(`  ⚠️  Captain profile not found`);
        }
      } else {
        console.log(
          `Media ${media.id}: No captain ID in path: ${media.storageKey}`
        );
      }
    }

    console.log("\n✅ Fix complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedMediaByCaptainPath();
