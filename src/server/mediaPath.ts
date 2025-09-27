/**
 * Shared helpers for legacy charter media path migration & validation.
 */

// Regex used to capture the filename portion of a legacy storage key
// Example: charters/123/media/image-abc.jpg => image-abc.jpg
export const LEGACY_CHARTER_MEDIA_FILENAME_REGEX = /^charters\/[^/]+\/media\/(.+)$/;

export function extractLegacyFilename(storageKey: string): string | null {
  const m = storageKey.match(LEGACY_CHARTER_MEDIA_FILENAME_REGEX);
  return m ? m[1] : null;
}
