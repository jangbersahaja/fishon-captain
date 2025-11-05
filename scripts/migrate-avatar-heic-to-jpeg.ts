/**
 * HEIC to JPEG Migration Script for Captain Avatars
 *
 * Converts existing HEIC avatar images in CaptainProfile to JPEG format
 *
 * Usage:
 *   npm run migrate:avatar -- --captain-id=cmhloopab0001jm04f42dd0qz
 *   npm run migrate:avatar -- --captain-id=cmhloopab0001jm04f42dd0qz --dry-run
 *   npm run migrate:avatar -- --all
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first, then .env as fallback
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { del, put } from "@vercel/blob";
import convert from "heic-convert";

const prisma = new PrismaClient();

interface MigrationResult {
  captainId: string;
  hadAvatar: boolean;
  wasHeic: boolean;
  converted: boolean;
  error?: string;
  oldUrl?: string;
  newUrl?: string;
}

// Check if URL is HEIC/HEIF format
function isHeicUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes(".heic") || lowerUrl.includes(".heif");
}

// Download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  console.log(`  📥 Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Convert HEIC to JPEG
async function convertHeicToJpeg(
  buffer: Buffer,
  quality: number = 0.92
): Promise<Buffer> {
  console.log(`  🔄 Converting HEIC to JPEG (quality: ${quality})...`);
  const outputBuffer = await convert({
    buffer,
    format: "JPEG",
    quality,
  });
  return Buffer.from(outputBuffer);
}

// Generate new filename
function generateJpegFilename(originalUrl: string): string {
  const urlParts = originalUrl.split("/");
  const filename = urlParts[urlParts.length - 1];
  const nameWithoutExt = filename.replace(/\.(heic|heif)$/i, "");
  return `${nameWithoutExt}.jpg`;
}

// Upload converted JPEG to Vercel Blob
async function uploadJpeg(
  buffer: Buffer,
  originalUrl: string,
  captainId: string
): Promise<string> {
  const jpegFilename = generateJpegFilename(originalUrl);

  // Use captain-specific path for avatars
  const newKey = `captains/${captainId}/avatar/${jpegFilename}`;

  console.log(`  ⬆️  Uploading JPEG: ${newKey}`);

  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: "image/jpeg" });
  const { url } = await put(newKey, blob, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  return url;
}

// Extract storage key from URL
function extractStorageKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter((p) => p);
    return pathParts.join("/");
  } catch {
    return null;
  }
}

// Migrate a single captain's avatar
async function migrateCaptainAvatar(
  captainId: string,
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    captainId,
    hadAvatar: false,
    wasHeic: false,
    converted: false,
  };

  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`👤 Processing Captain: ${captainId}`);
    console.log(`   Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
    console.log(`${"=".repeat(80)}\n`);

    // Fetch captain profile
    const captain = await prisma.captainProfile.findUnique({
      where: { id: captainId },
      select: {
        id: true,
        avatarUrl: true,
        displayName: true,
      },
    });

    if (!captain) {
      throw new Error(`Captain profile not found: ${captainId}`);
    }

    console.log(`📋 Captain: ${captain.displayName}`);

    if (!captain.avatarUrl) {
      console.log(`⏭️  No avatar URL set - skipping`);
      return result;
    }

    result.hadAvatar = true;
    result.oldUrl = captain.avatarUrl;
    console.log(`📸 Current avatar: ${captain.avatarUrl.split("/").pop()}`);

    if (!isHeicUrl(captain.avatarUrl)) {
      console.log(`⏭️  Avatar is not HEIC format - skipping`);
      return result;
    }

    result.wasHeic = true;
    console.log(`🎯 HEIC avatar detected - conversion needed`);

    if (dryRun) {
      console.log(`\n🔍 [DRY RUN] Would convert this avatar to JPEG`);
      return result;
    }

    // Download original HEIC
    const heicBuffer = await downloadImage(captain.avatarUrl);
    console.log(`   ✓ Downloaded: ${(heicBuffer.length / 1024).toFixed(2)} KB`);

    // Convert to JPEG
    const jpegBuffer = await convertHeicToJpeg(heicBuffer, 0.92);
    console.log(`   ✓ Converted: ${(jpegBuffer.length / 1024).toFixed(2)} KB`);

    // Upload JPEG
    const newUrl = await uploadJpeg(jpegBuffer, captain.avatarUrl, captain.id);
    console.log(`   ✓ Uploaded: ${newUrl}`);

    result.newUrl = newUrl;

    // Update database
    await prisma.captainProfile.update({
      where: { id: captain.id },
      data: { avatarUrl: newUrl },
    });
    console.log(`   ✓ Database updated`);

    // Try to delete old HEIC file
    const oldStorageKey = extractStorageKey(captain.avatarUrl);
    if (oldStorageKey) {
      try {
        await del(oldStorageKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`   ✓ Deleted old HEIC: ${oldStorageKey}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not delete old HEIC: ${error}`);
        // Don't fail migration if deletion fails
      }
    }

    result.converted = true;
    console.log(`\n   ✅ Avatar migration complete!`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n   ❌ Migration failed: ${errorMessage}`);
    result.error = errorMessage;
    return result;
  }
}

// Print summary
function printSummary(results: MigrationResult[], dryRun: boolean) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 AVATAR MIGRATION SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Mode:              ${dryRun ? "🔍 DRY RUN" : "✅ LIVE"}`);
  console.log(`Captains checked:  ${results.length}`);
  console.log(
    `Had avatars:       ${results.filter((r) => r.hadAvatar).length}`
  );
  console.log(`HEIC avatars:      ${results.filter((r) => r.wasHeic).length}`);
  console.log(
    `Converted:         ✅ ${results.filter((r) => r.converted).length}`
  );
  console.log(`Failed:            ❌ ${results.filter((r) => r.error).length}`);

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    console.log(`\n❌ Failed Migrations:`);
    failed.forEach((r) => {
      console.log(`   - ${r.captainId}: ${r.error}`);
    });
  }

  console.log(`${"=".repeat(80)}\n`);

  if (dryRun && results.some((r) => r.wasHeic)) {
    console.log(`💡 To run the actual migration, remove the --dry-run flag\n`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let captainId: string | null = null;
  let dryRun = false;
  let migrateAll = false;

  for (const arg of args) {
    if (arg.startsWith("--captain-id=")) {
      captainId = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--all") {
      migrateAll = true;
    }
  }

  // Validate environment
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ Error: BLOB_READ_WRITE_TOKEN not set in environment");
    process.exit(1);
  }

  // Validate arguments
  if (!captainId && !migrateAll) {
    console.error("❌ Error: Must specify either --captain-id=<id> or --all");
    console.log("\nUsage:");
    console.log(
      "  npm run migrate:avatar -- --captain-id=cmhloopab0001jm04f42dd0qz"
    );
    console.log(
      "  npm run migrate:avatar -- --captain-id=cmhloopab0001jm04f42dd0qz --dry-run"
    );
    console.log("  npm run migrate:avatar -- --all --dry-run");
    process.exit(1);
  }

  try {
    const results: MigrationResult[] = [];

    if (captainId) {
      // Migrate single captain
      const result = await migrateCaptainAvatar(captainId, dryRun);
      results.push(result);
    } else if (migrateAll) {
      // Migrate all captains with HEIC avatars
      const captains = await prisma.captainProfile.findMany({
        where: {
          avatarUrl: { not: null },
        },
        select: { id: true },
      });

      console.log(`\n🔍 Found ${captains.length} captains with avatars\n`);

      for (const captain of captains) {
        const result = await migrateCaptainAvatar(captain.id, dryRun);
        results.push(result);

        // Add delay between migrations
        if (captains.indexOf(captain) < captains.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    printSummary(results, dryRun);
    console.log("✨ Avatar migration script completed!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
