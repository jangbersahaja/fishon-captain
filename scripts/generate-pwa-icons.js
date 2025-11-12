#!/usr/bin/env node

/**
 * PWA Icon Generator
 *
 * Generates all required PWA icons from the source logo:
 * - 8 PWA icon sizes (72, 96, 128, 144, 152, 192, 384, 512)
 * - iOS apple-touch-icon (180x180)
 * - Maskable icon with safe zone (512x512)
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configuration
const SOURCE_LOGO = path.join(
  __dirname,
  "../public/images/logos/fishon-logo-bgred.png"
);
const ICONS_DIR = path.join(__dirname, "../public/icons");
const APPLE_ICON_PATH = path.join(__dirname, "../public/apple-touch-icon.png");

// Icon sizes to generate
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const IOS_ICON_SIZE = 180;

// Ensure directories exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  console.log("✓ Created /public/icons/ directory");
}

// Verify source logo exists
if (!fs.existsSync(SOURCE_LOGO)) {
  console.error("✗ Source logo not found:", SOURCE_LOGO);
  console.error(
    "  Please ensure fishon-logo-bgred.png exists in public/images/logos/"
  );
  process.exit(1);
}

async function generateIcons() {
  console.log("Starting PWA icon generation...\n");

  try {
    // Get source image metadata
    const metadata = await sharp(SOURCE_LOGO).metadata();
    console.log(
      `Source image: ${metadata.width}x${metadata.height} (${metadata.format})\n`
    );

    // Generate PWA icons
    console.log("Generating PWA icons:");
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: "contain",
          background: { r: 236, g: 34, b: 39, alpha: 1 }, // #ec2227
        })
        .png({ quality: 100 })
        .toFile(outputPath);

      console.log(
        `  ✓ Generated ${size}x${size} → ${path.relative(process.cwd(), outputPath)}`
      );
    }

    // Generate iOS apple-touch-icon
    console.log("\nGenerating iOS icon:");
    await sharp(SOURCE_LOGO)
      .resize(IOS_ICON_SIZE, IOS_ICON_SIZE, {
        fit: "contain",
        background: { r: 236, g: 34, b: 39, alpha: 1 },
      })
      .png({ quality: 100 })
      .toFile(APPLE_ICON_PATH);

    console.log(
      `  ✓ Generated ${IOS_ICON_SIZE}x${IOS_ICON_SIZE} → ${path.relative(process.cwd(), APPLE_ICON_PATH)}`
    );

    // Generate maskable icon (512x512 with safe zone)
    console.log("\nGenerating maskable icon:");
    const maskablePath = path.join(ICONS_DIR, "icon-512x512-maskable.png");

    // Create maskable icon with 80% safe zone (logo scaled to 80% with padding)
    await sharp(SOURCE_LOGO)
      .resize(410, 410, {
        // 80% of 512
        fit: "contain",
        background: { r: 236, g: 34, b: 39, alpha: 1 },
      })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 236, g: 34, b: 39, alpha: 1 },
      })
      .png({ quality: 100 })
      .toFile(maskablePath);

    console.log(
      `  ✓ Generated 512x512 maskable → ${path.relative(process.cwd(), maskablePath)}`
    );

    console.log("\n✓ All PWA icons generated successfully!");
    console.log(`\nGenerated files:`);
    console.log(`  - ${ICON_SIZES.length} PWA icons in /public/icons/`);
    console.log(`  - 1 iOS icon in /public/`);
    console.log(`  - 1 maskable icon in /public/icons/`);
    console.log(`\nTotal: ${ICON_SIZES.length + 2} icons`);
  } catch (error) {
    console.error("\n✗ Error generating icons:", error.message);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
