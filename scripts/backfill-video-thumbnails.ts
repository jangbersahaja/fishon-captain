#!/usr/bin/env ts-node
/*
 * Backfill placeholder thumbnails for historical charter videos lacking thumbnailUrl.
 *
 * Strategy:
 *  - Find CharterMedia rows where kind = CHARTER_VIDEO AND thumbnailUrl IS NULL (optional limit)
 *  - Generate a tiny PNG placeholder (same as transcode-simple worker) or reuse embedded base64
 *  - Upload to blob storage at captains/<userId>/thumbnails/<storageKeyBase>.png
 *  - Update CharterMedia.thumbnailUrl
 *
 * This can be safely re-run; existing rows with thumbnailUrl are skipped.
 * Pass --limit=N to restrict number processed per run.
 * Pass --dry to log actions without mutating.
 */
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import path from "node:path";

const PLACEHOLDER_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABaCAYAAAB7n0PpAAAACXBIWXMAAAsTAAALEwEAmpwYAAABM0lEQVR4nO3UsQ3CQBBF0V0gBpJgFQiES6SbKIDRIBIkAUSgDgoKGSvM77uDFz9mTyc3u7u7ubt/8+Xnbz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePw5m2bNm2bNmybdu2bdu2bdu2bds2bds2bds2bdu2bdu2bdu2bdv2JDkX9L90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9Jd8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J5Y0m7btm3btm3btm3btm3bts2bds2bds2bds2bds2bdv25fYDKVAJ5yCS5MkAAAAASUVORK5CYII=";

interface ArgFlags {
  limit: number | null;
  dry: boolean;
}
function parseArgs(): ArgFlags {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dry = false;
  for (const a of args) {
    if (a.startsWith("--limit=")) {
      const v = parseInt(a.split("=")[1] || "", 10);
      if (!Number.isNaN(v) && v > 0) limit = v;
    } else if (a === "--dry" || a === "--dry-run") dry = true;
  }
  return { limit, dry };
}

async function main() {
  const { limit, dry } = parseArgs();
  const batch = await prisma.charterMedia.findMany({
    where: { kind: "CHARTER_VIDEO", thumbnailUrl: null },
    orderBy: { createdAt: "asc" },
    take: limit ?? 100,
    select: {
      id: true,
      storageKey: true,
      charter: {
        select: { captain: { select: { user: { select: { id: true } } } } },
      },
    },
  });
  if (!batch.length) {
    console.log("No videos needing thumbnails.");
    return;
  }
  console.log(`Processing ${batch.length} videos (dry=${dry})`);

  const pngBuffer = Buffer.from(PLACEHOLDER_BASE64, "base64");
  let success = 0;
  for (const vid of batch) {
    try {
      const userId = vid.charter?.captain?.user?.id || "unknown";
      const base = path
        .basename(vid.storageKey || "video")
        .replace(/\.[^.]+$/, "");
      const thumbKey = `captains/${userId}/thumbnails/${base}.png`;
      let url: string | null = null;
      if (!dry) {
        const putRes = await put(thumbKey, pngBuffer, {
          access: "public",
          contentType: "image/png",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        url = putRes.url;
        await prisma.charterMedia.update({
          where: { id: vid.id },
          data: { thumbnailUrl: url },
        });
      }
      success++;
      console.log(`✔ ${vid.id} -> ${dry ? thumbKey : url}`);
    } catch (e) {
      console.warn(`⚠ Failed ${vid.id}`, e);
    }
  }
  console.log(`Done. success=${success} failed=${batch.length - success}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
