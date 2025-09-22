import type { CharterFormValues } from "../charterForm.schema";

export type Tone = "friendly" | "adventurous" | "professional";

// Helper to pick a random element (deterministic could be added later)
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface GenerationContext {
  city: string;
  state: string;
  species: string[];
  boat: {
    type?: string;
    lengthFeet?: number;
    capacity?: number;
    features?: string[];
  };
  amenities: string[];
  policies: {
    catchAndRelease?: boolean;
    catchAndKeep?: boolean;
    childFriendly?: boolean;
  };
  trips: { durationHours?: number; startTimes?: string[] }[];
}

export function buildContext(values: CharterFormValues): GenerationContext {
  const speciesSet = new Set<string>();
  (values.trips || []).forEach((t) =>
    (t.targetSpecies || []).forEach((s) => speciesSet.add(s))
  );
  return {
    city: values.city?.trim() || "your area",
    state: values.state?.trim() || "Malaysia",
    species: Array.from(speciesSet).slice(0, 6),
    boat: {
      type: values.boat?.type,
      lengthFeet: (Number.isFinite(values.boat?.lengthFeet)
        ? values.boat?.lengthFeet
        : undefined) as number | undefined,
      capacity: (Number.isFinite(values.boat?.capacity)
        ? values.boat?.capacity
        : undefined) as number | undefined,
      features: values.boat?.features || [],
    },
    amenities: values.amenities || [],
    policies: {
      catchAndRelease: values.policies?.catchAndRelease,
      catchAndKeep: values.policies?.catchAndKeep,
      childFriendly: values.policies?.childFriendly,
    },
    trips: (values.trips || []).map((t) => ({
      durationHours: Number.isFinite(t.durationHours)
        ? t.durationHours
        : undefined,
      startTimes: t.startTimes || [],
    })),
  };
}

const OPENERS: Record<Tone, string[]> = {
  friendly: [
    "Ready for a relaxed day on the water in {{city}}, {{state}}? Let’s get you hooked.",
    "Join us out of {{city}} for a fun, easygoing charter experience.",
  ],
  adventurous: [
    "Gear up for an action-packed trip off {{city}}, {{state}}—we're chasing thrills and tight lines.",
    "If you crave fast runs and bent rods, {{city}} is your launch point.",
  ],
  professional: [
    "Operating from {{city}}, {{state}}, this charter delivers a well-organized, efficient angling experience.",
    "Departing {{city}}, we provide a structured program focused on productive fishing time.",
  ],
};

const SPECIES_LINES: Record<Tone, string[]> = {
  friendly: [
    "We often target {{speciesList}}—and switch it up based on conditions.",
    "Expect opportunities for {{speciesList}} (plus the surprises that keep it fun).",
  ],
  adventurous: [
    "Targets include hard fighters like {{speciesList}}—we adapt aggressively as the bite shifts.",
    "Primary focus: {{speciesList}} with tactical pivots if the pattern breaks.",
  ],
  professional: [
    "Typical target set: {{speciesList}}, adjusted via real-time observations.",
    "Core species plan centers on {{speciesList}} with contingency structure as required.",
  ],
};

const BOAT_LINES: Record<Tone, string[]> = {
  friendly: [
    "You’ll fish from a {{boat}} that’s set up for comfort and practical fishing space.",
    "Our {{boat}} balances stability and good deck layout for everyone aboard.",
  ],
  adventurous: [
    "The {{boat}} is rigged for fast repositioning and efficient drifts.",
    "A purpose-ready {{boat}} platform keeps us nimble between spots.",
  ],
  professional: [
    "A {{boat}} platform supports orderly gear staging and safe movement.",
    "Vessel layout ({{boat}}) is optimized for workflow and angler rotation.",
  ],
};

const AMENITIES_PREFIX: Record<Tone, string> = {
  friendly: "Included onboard:",
  adventurous: "Operational assets:",
  professional: "Provided resources:",
};

const POLICY_LINES: Record<Tone, string[]> = {
  friendly: [
    "Family friendly? {{family}}. Catch & release approach: {{catchRelease}}.",
  ],
  adventurous: [
    "Catch handling: {{catchRelease}}. Family suitability: {{family}}.",
  ],
  professional: [
    "Policy summary — Catch & release: {{catchRelease}}; Family suitability: {{family}}.",
  ],
};

const CLOSERS: Record<Tone, string[]> = {
  friendly: [
    "This is a smart starting point—add your personal touch! What stories define your charter? [[Add a sentence about your captain’s style]]",
    "Tweak this with your voice. Share memorable catches or guest reactions here. [[Add your signature welcome]]",
  ],
  adventurous: [
    "Dial this up with real moments—describe the adrenaline, the chase, the pivot when the bite shifts. [[Add a hype line]]",
    "Make it yours: mention a big fight or a wild weather win. [[Add a short story]]",
  ],
  professional: [
    "Consider adding credentials, safety focus or methodology to reassure guests. [[Add an expertise note]]",
    "Refine this with specifics: seasonal patterns, prep routine, quality standards. [[Add a professionalism detail]]",
  ],
};

function formatSpecies(list: string[]) {
  if (!list.length) return "local species";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function buildBoatString(ctx: GenerationContext) {
  const parts: string[] = [];
  if (ctx.boat.lengthFeet) parts.push(`${ctx.boat.lengthFeet} ft`);
  if (ctx.boat.type) parts.push(ctx.boat.type);
  const base = parts.join(" ").trim() || "charter boat";
  return (
    base + (ctx.boat.capacity ? ` (up to ${ctx.boat.capacity} anglers)` : "")
  );
}

function buildAmenities(ctx: GenerationContext) {
  const take = ctx.amenities.slice(0, 6);
  if (!take.length) return "Core safety gear";
  return take.join(", ");
}

function buildPolicies(ctx: GenerationContext) {
  const cr = ctx.policies.catchAndRelease
    ? ctx.policies.catchAndKeep
      ? "Both practiced"
      : "Primarily release"
    : ctx.policies.catchAndKeep
    ? "Keep allowed"
    : "Standard local practice";
  const fam = ctx.policies.childFriendly ? "Yes" : "Ask for suitability";
  return { catchRelease: cr, family: fam };
}

export function generateCharterDescription(values: CharterFormValues): string {
  const tone = (values.tone as Tone) || "friendly";
  const ctx = buildContext(values);
  const opener = pick(OPENERS[tone])
    .replace(/{{city}}/g, ctx.city)
    .replace(/{{state}}/g, ctx.state);

  const speciesList = formatSpecies(ctx.species);
  const speciesLine = pick(SPECIES_LINES[tone]).replace(
    /{{speciesList}}/g,
    speciesList
  );
  const boatLine = pick(BOAT_LINES[tone]).replace(
    /{{boat}}/g,
    buildBoatString(ctx)
  );
  const amenitiesLine = `${AMENITIES_PREFIX[tone]} ${buildAmenities(ctx)}.`;
  const { catchRelease, family } = buildPolicies(ctx);
  const policyLine = pick(POLICY_LINES[tone])
    .replace(/{{catchRelease}}/g, catchRelease)
    .replace(/{{family}}/g, family);
  const closer = pick(CLOSERS[tone]);

  return [opener, speciesLine, boatLine, amenitiesLine, policyLine, closer]
    .filter(Boolean)
    .join("\n\n");
}

export function personalizationScore(
  base: string | undefined,
  current: string | undefined
): number {
  if (!base || !current) return 0;
  if (base === current) return 0;
  // Simple diff metric: proportion of characters changed (Levenshtein-lite approximation)
  const minLen = Math.min(base.length, current.length);
  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (base[i] === current[i]) same++;
  }
  const similarity = same / Math.max(base.length, current.length);
  const changed = 1 - similarity;
  return Math.min(100, Math.round(changed * 100));
}
