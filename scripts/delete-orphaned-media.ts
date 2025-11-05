#!/usr/bin/env tsx
/**
 * Delete orphaned media with no captain or charter
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteOrphanedMedia() {
  console.log("🗑️  Deleting orphaned media files...\n");

  try {
    const result = await prisma.charterMedia.deleteMany({
      where: {
        ownerId: null,
        charterId: null,
        captainId: null,
      },
    });

    console.log(`✅ Deleted ${result.count} orphaned media files\n`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOrphanedMedia();
