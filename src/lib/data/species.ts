import { FRESH_WATER_SPECIES } from "./freshwater";
import { SALTWATER_SPECIES } from "./saltwater";
import { SQUID_SPECIES } from "./squid";

// Category constants for consistency when filtering/grouping
export const SPECIES_CATEGORIES = {
  SALTWATER: "saltwater",
  FRESHWATER: "freshwater",
  SQUID: "squid",
} as const;

export type SpeciesCategory =
  (typeof SPECIES_CATEGORIES)[keyof typeof SPECIES_CATEGORIES];

export interface SpeciesItem {
  id: string;
  english_name: string;
  local_name: string;
  // The imported image modules from Next.js static imports resolve to a static metadata object
  // with at least a src string. We type as unknown to avoid 'any' while keeping flexibility.
  image: unknown;
  category: SpeciesCategory;
}

export const ALL_SPECIES: SpeciesItem[] = [
  ...SALTWATER_SPECIES.map((s) => ({
    ...s,
    category: SPECIES_CATEGORIES.SALTWATER,
  })),
  ...FRESH_WATER_SPECIES.map((s) => ({
    ...s,
    category: SPECIES_CATEGORIES.FRESHWATER,
  })),
  ...SQUID_SPECIES.map((s) => ({ ...s, category: SPECIES_CATEGORIES.SQUID })),
];

// Quick lookup by id (case-sensitive). Useful for resolving stored ids to full objects.
export const SPECIES_BY_ID: Record<string, SpeciesItem> = ALL_SPECIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, SpeciesItem>
);

// Grouped by category if you need to render grouped lists.
export const SPECIES_BY_CATEGORY: Record<SpeciesCategory, SpeciesItem[]> = {
  [SPECIES_CATEGORIES.SALTWATER]: [],
  [SPECIES_CATEGORIES.FRESHWATER]: [],
  [SPECIES_CATEGORIES.SQUID]: [],
};
ALL_SPECIES.forEach((item) => {
  SPECIES_BY_CATEGORY[item.category].push(item);
});

export type SpeciesId = keyof typeof SPECIES_BY_ID;
