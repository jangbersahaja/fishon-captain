// Utility extracted for regression testing of video deduplication logic.
// Given existing videos (already in state) and a new list of ready videos reported
// by the upload component, produce the merged list without duplicates, preferring
// canonical storage-key-like names when available.
//
// A video is considered duplicate if the URL matches; if only names match we update the URL.
// If URLs match but names differ and the new name looks like a storage key (contains '/media/'),
// we rename the existing entry to that canonical name unless it would clash with another existing name.
//
// This mirrors the logic embedded in FormSection's onReadyVideosChange handler.

export interface VideoItem {
  name: string;
  url: string;
}

export function mergeReadyVideos(
  existing: VideoItem[],
  ready: VideoItem[]
): VideoItem[] {
  if (!ready.length) return existing;
  // Fast-path identical set (by name + url)
  if (
    existing.length === ready.length &&
    existing.every((e) =>
      ready.some((r) => r.name === e.name && r.url === e.url)
    )
  ) {
    return existing;
  }
  const byName = new Map(existing.map((v) => [v.name, v] as const));
  const byUrl = new Map(existing.map((v) => [v.url, v] as const));
  let changed = false;
  for (const r of ready) {
    const existingByUrl = byUrl.get(r.url);
    if (existingByUrl) {
      const looksLikeStorageKey = /\/media\//.test(r.name);
      if (
        looksLikeStorageKey &&
        existingByUrl.name !== r.name &&
        !byName.has(r.name)
      ) {
        // Rename to canonical storage-key style
        byName.delete(existingByUrl.name);
        const renamed = { ...existingByUrl, name: r.name };
        byName.set(r.name, renamed);
        // update URL map reference (name change only)
        byUrl.set(r.url, renamed);
        changed = true;
      }
      continue; // already represented
    }
    const existingByName = byName.get(r.name);
    if (existingByName) {
      if (existingByName.url !== r.url) {
        const updated = { ...existingByName, url: r.url };
        byName.set(r.name, updated);
        // Update url map: remove old url entry and set new
        // We can't efficiently remove the old URL without scanning, but duplicates are minimal; rebuild later.
        changed = true;
      }
    } else {
      byName.set(r.name, r);
      changed = true;
    }
  }
  if (!changed) return existing;
  return Array.from(byName.values());
}
