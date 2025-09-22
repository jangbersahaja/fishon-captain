import { ALL_SPECIES, SPECIES_BY_ID, type SpeciesItem } from "./species";

/**
 * Resolve an array of species ids to full objects (filters unknown ids).
 */
export function resolveSpecies(ids: string[]): SpeciesItem[] {
  return ids
    .map((id) => SPECIES_BY_ID[id])
    .filter((item): item is SpeciesItem => Boolean(item));
}

/**
 * Map species ids to English display names (falls back to id if not found).
 */
export function speciesNames(ids: string[]): string[] {
  return ids.map((id) => SPECIES_BY_ID[id]?.english_name || id);
}

/**
 * Fuzzy search across english/local names + id.
 */
export function searchSpecies(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_SPECIES;
  return ALL_SPECIES.filter(
    (s) =>
      s.english_name.toLowerCase().includes(q) ||
      s.local_name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
  );
}
