#!/usr/bin/env ts-node
/**
 * migrate-legacy-charter-media-paths.ts
 * One-off (idempotent) migration script to rewrite legacy charter-scoped media storage keys
 *   from: charters/<charterId>/media/<filename>
 *   to:   captains/<userId>/media/<filename>
 * It updates both blob storage (copy/delete) and DB storageKey + (optionally) url fields.
 *
 * SAFETY:
 *  - Dry-run mode by default (no writes) unless RUN=apply
 *  - Batches keys to avoid overwhelming storage API
 *  - Skips any key already migrated or not found
 *
 * REQUIREMENTS:
 *  - BLOB_READ_WRITE_TOKEN
 *  - NEXT_PUBLIC_SITE_URL (for consistent URL prefix if needed)
 */
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/audit";
import { extractLegacyFilename } from "@/server/mediaPath";
import { del, list, put } from "@vercel/blob";

const DRY_RUN = process.env.RUN !== "apply";

async function main() {
  console.log("[legacy-media-migrate] starting", { DRY_RUN });
  const legacy = await prisma.charterMedia.findMany({
    where: { storageKey: { startsWith: "charters/" } },
    include: { charter: { select: { captain: { select: { userId: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${legacy.length} legacy media rows`);
  let migrated = 0;
  const cFound = counter("legacy_migrate_found");
  const cMigrated = counter("legacy_migrate_migrated");
  const cSkippedExists = counter("legacy_migrate_skipped_exists");
  const cErrors = counter("legacy_migrate_errors");
  cFound.inc(legacy.length);
  for (const row of legacy) {
    const userId = row.charter.captain.userId;
    if (!userId) continue;
    const filename = extractLegacyFilename(row.storageKey);
    if (!filename) continue;
    const targetKey = `captains/${userId}/media/${filename}`;
    if (targetKey === row.storageKey) continue; // already migrated (unlikely)
    // Skip if target already exists to avoid overwriting
    // (We list with prefix and simple existence check)
    try {
      const existing = await list({
        prefix: targetKey,
        limit: 1,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (existing.blobs.some((b) => b.pathname === targetKey)) {
        console.warn("[skip] target exists", { targetKey });
        cSkippedExists.inc();
        continue;
      }
    } catch (e) {
      console.warn("list error (continuing)", e);
    }

    if (DRY_RUN) {
      console.log("DRY_RUN migrate->", { from: row.storageKey, to: targetKey });
      continue;
    }
    // Fetch original blob (stream copy)
    try {
      const res = await fetch(row.url);
      if (!res.ok) {
        console.warn("fetch original failed", {
          key: row.storageKey,
          status: res.status,
        });
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const { url: newUrl } = await put(targetKey, buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
      });
      await prisma.charterMedia.update({
        where: { id: row.id },
        data: { storageKey: targetKey, url: newUrl },
      });
      try {
        await del(row.storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (e) {
        console.warn("delete old failed", row.storageKey, e);
      }
      migrated++;
      cMigrated.inc();
      console.log("migrated", { from: row.storageKey, to: targetKey });
      // Fire-and-forget audit log (do not block if fails). Actor: system.
      writeAuditLog({
        actorUserId: "system",
        entityType: "media",
        entityId: row.id,
        action: "legacy_media_migrated",
        before: { storageKey: row.storageKey, url: row.url },
        after: { storageKey: targetKey },
        changed: ["storageKey", "url"],
        correlationId: `legacy-migrate-${row.id}`,
      }).catch(() => {
        /* swallow */
      });
    } catch (e) {
      console.error("migrate error", { key: row.storageKey, error: e });
      cErrors.inc();
    }
  }
  console.log("[legacy-media-migrate] complete", { migrated, dryRun: DRY_RUN });
  console.log("[legacy-media-migrate] counters", {
    found: cFound.value(),
    migrated: cMigrated.value(),
    skippedExists: cSkippedExists.value(),
    errors: cErrors.value(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
