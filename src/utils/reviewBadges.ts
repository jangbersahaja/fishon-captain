// utils/reviewBadges.ts
// Deterministic helpers for assigning and summarising guest feedback badges.

export type ReviewBadge = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

export const REVIEW_BADGES: ReviewBadge[] = [
  {
    id: "crew_mvp",
    label: "Crew MVP",
    icon: "🧑‍✈️",
    description: "Crew felt attentive, friendly, and easy to learn from.",
  },
  {
    id: "safety_first",
    label: "Safety First",
    icon: "🛟",
    description: "Briefings, gear, and handling made the trip feel secure.",
  },
  {
    id: "expert_guide",
    label: "Expert Guide",
    icon: "🎯",
    description: "Captain read the water well and shared useful tactics.",
  },
  {
    id: "epic_catch",
    label: "Epic Catch",
    icon: "🐟",
    description: "Guests landed memorable fish or filled the cooler.",
  },
  {
    id: "family_friendly",
    label: "Family Friendly",
    icon: "👨‍👩‍👧",
    description: "Kids and elders were comfortable and engaged throughout.",
  },
  {
    id: "smooth_sailing",
    label: "Smooth Sailing",
    icon: "⛵",
    description: "Schedule, boarding, and ride quality were hassle free.",
  },
  {
    id: "top_gear",
    label: "Top Gear",
    icon: "🧰",
    description: "Rods, reels, bait, and electronics were dialed in.",
  },
  {
    id: "scenic_escape",
    label: "Scenic Escape",
    icon: "🌅",
    description: "Routes included photogenic views or wildlife moments.",
  },
  {
    id: "eco_minded",
    label: "Eco Minded",
    icon: "🌿",
    description: "Catch care and clean practices respected the water.",
  },
  {
    id: "worth_the_price",
    label: "Worth the Price",
    icon: "💰",
    description: "Trip value felt strong compared to its cost.",
  },
  {
    id: "night_owl",
    label: "Night Owl",
    icon: "🌙",
    description: "Night missions ran smoothly with good lighting and vibe.",
  },
  {
    id: "photo_ready",
    label: "Photo Ready",
    icon: "📸",
    description: "Crew captured great shots or set up scenic backdrops.",
  },
];

export type ReviewBadgeId = (typeof REVIEW_BADGES)[number]["id"];

const BADGE_LOOKUP: Record<ReviewBadgeId, ReviewBadge> = REVIEW_BADGES.reduce(
  (acc, badge) => {
    acc[badge.id as ReviewBadgeId] = badge;
    return acc;
  },
  {} as Record<ReviewBadgeId, ReviewBadge>
);

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function createRng(seed: string) {
  let state = hashSeed(seed) || 0x1f123bb5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRandomBadges(seed: string, minimum = 2, maximum = 4): ReviewBadgeId[] {
  const rng = createRng(seed);
  const pool = [...REVIEW_BADGES];
  const result: ReviewBadgeId[] = [];
  const count = Math.min(
    maximum,
    Math.max(minimum, Math.floor(rng() * (maximum - minimum + 1)) + minimum)
  );

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = Math.floor(rng() * pool.length);
    const [badge] = pool.splice(index, 1);
    if (badge) {
      result.push(badge.id as ReviewBadgeId);
    }
  }

  return result;
}

export function resolveBadges(ids: ReviewBadgeId[]): ReviewBadge[] {
  return ids
    .map((id) => BADGE_LOOKUP[id])
    .filter((badge): badge is ReviewBadge => Boolean(badge));
}

export function summariseBadges(
  reviews: { badges?: ReviewBadgeId[] }[]
): Array<{ badge: ReviewBadge; count: number }> {
  const tally = new Map<ReviewBadgeId, number>();
  reviews.forEach((review) => {
    review.badges?.forEach((id) => {
      tally.set(id, (tally.get(id) || 0) + 1);
    });
  });

  const list = Array.from(tally.entries())
    .map(([id, count]) => ({ badge: BADGE_LOOKUP[id], count }))
    .filter((item) => Boolean(item.badge))
    .sort((a, b) => b.count - a.count || a.badge.label.localeCompare(b.badge.label));

  return list;
}
