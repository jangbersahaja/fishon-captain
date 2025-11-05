/**
 * HEIC to JPEG Migration Script
 *
 * Converts existing HEIC images in CharterMedia to JPEG format
 *
 * Usage:
 *   npm run migrate:heic -- --charter-id=cmhlpeeni0002i904ycq96sna
 *   npm run migrate:heic -- --charter-id=cmhlpeeni0002i904ycq96sna --dry-run
 *   npm run migrate:heic -- --all
 */

import { PrismaClient } from "@prisma/client";
import { del, put } from "@vercel/blob";
import "dotenv/config";
import convert from "heic-convert";

const prisma = new PrismaClient();

interface MigrationResult {
  charterId: string;
  totalImages: number;
  heicImages: number;
  converted: number;
  failed: number;
  skipped: number;
  errors: Array<{ mediaId: string; error: string }>;
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
  originalUrl: string
): Promise<string> {
  const jpegFilename = generateJpegFilename(originalUrl);

  // Preserve the same path structure, just change extension
  const urlParts = originalUrl.split("/");
  const pathParts = urlParts.slice(3); // Remove protocol and domain
  pathParts[pathParts.length - 1] = jpegFilename;
  const newKey = pathParts.join("/");

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

// Migrate a single CharterMedia record
async function migrateImage(
  media: {
    id: string;
    url: string;
    storageKey: string | null;
    mimeType: string | null;
  },
  dryRun: boolean
): Promise<{ success: boolean; error?: string; newUrl?: string }> {
  try {
    console.log(`\n📸 Processing image: ${media.id}`);
    console.log(`   Original URL: ${media.url}`);

    if (!isHeicUrl(media.url)) {
      console.log(`   ⏭️  Skipping: Not a HEIC image`);
      return { success: true };
    }

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would convert this HEIC image`);
      return { success: true };
    }

    // Download original HEIC
    const heicBuffer = await downloadImage(media.url);
    console.log(`   ✓ Downloaded: ${(heicBuffer.length / 1024).toFixed(2)} KB`);

    // Convert to JPEG
    const jpegBuffer = await convertHeicToJpeg(heicBuffer, 0.92);
    console.log(`   ✓ Converted: ${(jpegBuffer.length / 1024).toFixed(2)} KB`);

    // Upload JPEG
    const newUrl = await uploadJpeg(jpegBuffer, media.url);
    console.log(`   ✓ Uploaded: ${newUrl}`);

    // Update database
    await prisma.charterMedia.update({
      where: { id: media.id },
      data: {
        url: newUrl,
        mimeType: "image/jpeg",
        sizeBytes: jpegBuffer.length,
        storageKey: newUrl.split("/").slice(3).join("/"), // Extract key from URL
      },
    });
    console.log(`   ✓ Database updated`);

    // Delete old HEIC file (optional, be careful!)
    if (media.storageKey) {
      try {
        await del(media.storageKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`   ✓ Deleted old HEIC: ${media.storageKey}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not delete old HEIC: ${error}`);
        // Don't fail migration if deletion fails
      }
    }

    console.log(`   ✅ Migration complete!`);
    return { success: true, newUrl };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// Migrate all images for a charter
async function migrateCharter(
  charterId: string,
  dryRun: boolean
): Promise<MigrationResult> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 Starting migration for charter: ${charterId}`);
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`${"=".repeat(80)}\n`);

  const result: MigrationResult = {
    charterId,
    totalImages: 0,
    heicImages: 0,
    converted: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Fetch all media for this charter
  const mediaRecords = await prisma.charterMedia.findMany({
    where: { charterId },
    select: {
      id: true,
      url: true,
      storageKey: true,
      mimeType: true,
    },
  });

  result.totalImages = mediaRecords.length;
  console.log(`📊 Found ${result.totalImages} total images for this charter\n`);

  // Filter HEIC images
  const heicImages = mediaRecords.filter((m) => isHeicUrl(m.url));
  result.heicImages = heicImages.length;

  console.log(`🎯 Found ${result.heicImages} HEIC images to convert\n`);

  if (result.heicImages === 0) {
    console.log(`✨ No HEIC images found. Nothing to do!`);
    return result;
  }

  // Migrate each HEIC image
  for (let i = 0; i < heicImages.length; i++) {
    const media = heicImages[i];
    console.log(`\n[${i + 1}/${heicImages.length}]`);

    const migrationResult = await migrateImage(media, dryRun);

    if (migrationResult.success) {
      if (isHeicUrl(media.url)) {
        result.converted++;
      } else {
        result.skipped++;
      }
    } else {
      result.failed++;
      result.errors.push({
        mediaId: media.id,
        error: migrationResult.error || "Unknown error",
      });
    }

    // Add a small delay to avoid overwhelming the API
    if (i < heicImages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return result;
}

// Print summary
function printSummary(result: MigrationResult, dryRun: boolean) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 MIGRATION SUMMARY - Charter: ${result.charterId}`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Mode:           ${dryRun ? "🔍 DRY RUN" : "✅ LIVE"}`);
  console.log(`Total images:   ${result.totalImages}`);
  console.log(`HEIC images:    ${result.heicImages}`);
  console.log(`Converted:      ✅ ${result.converted}`);
  console.log(`Skipped:        ⏭️  ${result.skipped}`);
  console.log(`Failed:         ❌ ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.forEach(({ mediaId, error }) => {
      console.log(`   - ${mediaId}: ${error}`);
    });
  }

  console.log(`${"=".repeat(80)}\n`);

  if (dryRun && result.heicImages > 0) {
    console.log(`💡 To run the actual migration, remove the --dry-run flag\n`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let charterId: string | null = null;
  let dryRun = false;
  let migrateAll = false;

  for (const arg of args) {
    if (arg.startsWith("--charter-id=")) {
      charterId = arg.split("=")[1];
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
  if (!charterId && !migrateAll) {
    console.error("❌ Error: Must specify either --charter-id=<id> or --all");
    console.log("\nUsage:");
    console.log(
      "  npm run migrate:heic -- --charter-id=cmhlpeeni0002i904ycq96sna"
    );
    console.log(
      "  npm run migrate:heic -- --charter-id=cmhlpeeni0002i904ycq96sna --dry-run"
    );
    console.log("  npm run migrate:heic -- --all --dry-run");
    process.exit(1);
  }

  try {
    if (charterId) {
      // Migrate single charter
      const result = await migrateCharter(charterId, dryRun);
      printSummary(result, dryRun);
    } else if (migrateAll) {
      console.log("⚠️  Migration for all charters not yet implemented");
      console.log(
        "💡 Please specify individual charters with --charter-id for now"
      );
      process.exit(1);
    }

    console.log("✨ Migration script completed!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
