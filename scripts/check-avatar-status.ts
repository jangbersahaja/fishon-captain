/**
 * Check Captain Avatar Status Script
 *
 * Displays current status of captain avatars and identifies HEIC images that need migration
 *
 * Usage:
 *   npm run check:avatar
 *   npm run check:avatar -- --captain-id=cmhloopab0001jm04f42dd0qz
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

interface AvatarStatus {
  captainId: string;
  displayName: string;
  hasAvatar: boolean;
  avatarUrl: string | null;
  isHeic: boolean;
  needsMigration: boolean;
}

// Check if URL is HEIC/HEIF format
function isHeicUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes(".heic") || lowerUrl.includes(".heif");
}

// Extract file extension from URL
function getFileExtension(url: string): string {
  const urlParts = url.split("/");
  const filename = urlParts[urlParts.length - 1];
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "unknown";
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  let captainId: string | null = null;

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith("--captain-id=")) {
      captainId = arg.split("=")[1];
    }
  }

  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📋 CAPTAIN AVATAR STATUS CHECK`);
    console.log(`${"=".repeat(80)}\n`);

    // Query captains
    const captains = await prisma.captainProfile.findMany({
      where: captainId ? { id: captainId } : undefined,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (captains.length === 0) {
      if (captainId) {
        console.log(`❌ Captain not found: ${captainId}\n`);
      } else {
        console.log(`📭 No captains found in database\n`);
      }
      return;
    }

    console.log(`📊 Found ${captains.length} captain(s)\n`);

    const statuses: AvatarStatus[] = [];

    // Analyze each captain
    for (const captain of captains) {
      const hasAvatar = !!captain.avatarUrl;
      const isHeic = hasAvatar ? isHeicUrl(captain.avatarUrl!) : false;

      const status: AvatarStatus = {
        captainId: captain.id,
        displayName: captain.displayName,
        hasAvatar,
        avatarUrl: captain.avatarUrl,
        isHeic,
        needsMigration: isHeic,
      };

      statuses.push(status);

      // Print captain details
      console.log(`${"─".repeat(80)}`);
      console.log(`👤 Captain: ${captain.displayName}`);
      console.log(`   ID: ${captain.id}`);

      if (hasAvatar) {
        const ext = getFileExtension(captain.avatarUrl!);
        const filename = captain.avatarUrl!.split("/").pop() || "";

        console.log(`   Avatar: ${filename}`);
        console.log(`   Format: ${ext.toUpperCase()}`);
        console.log(
          `   Status: ${isHeic ? "⚠️  HEIC (needs migration)" : "✅ JPEG/PNG (ready)"}`
        );
        console.log(`   URL: ${captain.avatarUrl}`);
      } else {
        console.log(`   Avatar: ❌ No avatar set`);
      }
      console.log("");
    }

    // Print summary
    console.log(`${"=".repeat(80)}`);
    console.log(`📈 SUMMARY`);
    console.log(`${"=".repeat(80)}`);
    console.log(`Total Captains:      ${statuses.length}`);
    console.log(
      `With Avatars:        ${statuses.filter((s) => s.hasAvatar).length}`
    );
    console.log(
      `Without Avatars:     ${statuses.filter((s) => !s.hasAvatar).length}`
    );
    console.log(
      `HEIC Format:         ⚠️  ${statuses.filter((s) => s.isHeic).length}`
    );
    console.log(
      `JPEG/PNG Format:     ✅ ${statuses.filter((s) => s.hasAvatar && !s.isHeic).length}`
    );
    console.log(
      `Needs Migration:     ${statuses.filter((s) => s.needsMigration).length}`
    );
    console.log(`${"=".repeat(80)}\n`);

    // Show migration commands if needed
    const needsMigration = statuses.filter((s) => s.needsMigration);
    if (needsMigration.length > 0) {
      console.log(`💡 Migration Commands:\n`);

      if (needsMigration.length === 1) {
        console.log(`   # Dry run first (preview only):`);
        console.log(
          `   npm run migrate:avatar -- --captain-id=${needsMigration[0].captainId} --dry-run\n`
        );
        console.log(`   # Then run actual migration:`);
        console.log(
          `   npm run migrate:avatar -- --captain-id=${needsMigration[0].captainId}\n`
        );
      } else {
        console.log(`   # Migrate all captains (dry run first):`);
        console.log(`   npm run migrate:avatar -- --all --dry-run\n`);
        console.log(`   # Then run actual migration:`);
        console.log(`   npm run migrate:avatar -- --all\n`);
        console.log(`   # Or migrate individually:`);
        needsMigration.forEach((captain) => {
          console.log(
            `   npm run migrate:avatar -- --captain-id=${captain.captainId}`
          );
        });
        console.log("");
      }
    }
  } catch (error) {
    console.error("\n❌ Check failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
