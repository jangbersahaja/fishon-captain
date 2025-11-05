import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const charterId = process.argv[2];

  if (!charterId) {
    console.error("❌ Please provide charter ID as argument");
    console.log("Usage: npm run check:media -- <charter-id>");
    process.exit(1);
  }

  const media = await prisma.charterMedia.findMany({
    where: { charterId },
    select: { id: true, url: true, mimeType: true, sizeBytes: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n📊 Charter Media Status:");
  console.log("========================\n");

  if (media.length === 0) {
    console.log("No media found for this charter.");
    return;
  }

  media.forEach((m, i) => {
    const isJpeg =
      m.mimeType === "image/jpeg" || m.url.toLowerCase().includes(".jpg");
    const icon = isJpeg ? "✅" : "❌";
    const filename = m.url.split("/").pop();
    const size = m.sizeBytes ? `${(m.sizeBytes / 1024).toFixed(2)} KB` : "N/A";

    console.log(`${icon} Image ${i + 1}:`);
    console.log(`   ID: ${m.id}`);
    console.log(`   MIME: ${m.mimeType}`);
    console.log(`   Size: ${size}`);
    console.log(`   File: ${filename}\n`);
  });

  const jpegCount = media.filter((m) => m.mimeType === "image/jpeg").length;
  const heicCount = media.filter(
    (m) =>
      m.mimeType?.toLowerCase().includes("heic") ||
      m.url.toLowerCase().includes(".heic")
  ).length;

  console.log("========================");
  console.log(`Total images: ${media.length}`);
  console.log(`JPEG format:  ✅ ${jpegCount}`);
  console.log(`HEIC format:  ❌ ${heicCount}`);
  console.log("========================\n");

  if (heicCount === 0) {
    console.log("✨ All images successfully migrated to JPEG!");
  } else {
    console.log(`⚠️  ${heicCount} HEIC images still need migration`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
