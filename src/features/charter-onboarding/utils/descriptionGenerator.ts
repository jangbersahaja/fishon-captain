import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";

// --- Tone handling ---------------------------------------------------------
export type Tone = "friendly" | "adventurous" | "professional";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Context Extraction ----------------------------------------------------
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
  (values.trips || []).forEach((t) => (t.species || []).forEach((s) => speciesSet.add(s)));
  return {
    city: values.city?.trim() || "your area",
    state: values.state?.trim() || "Malaysia",
    species: Array.from(speciesSet).slice(0, 6),
    boat: {
      type: values.boat?.type,
      lengthFeet: (Number.isFinite(values.boat?.lengthFeet) ? values.boat?.lengthFeet : undefined) as
        | number
        | undefined,
      capacity: (Number.isFinite(values.boat?.capacity) ? values.boat?.capacity : undefined) as
        | number
        | undefined,
      features: values.boat?.features || [],
    },
    amenities: values.amenities || [],
    policies: {
      catchAndRelease: values.policies?.catchAndRelease,
      catchAndKeep: values.policies?.catchAndKeep,
      childFriendly: values.policies?.childFriendly,
    },
    trips: (values.trips || []).map((t) => ({
      durationHours: Number.isFinite(t.durationHours) ? t.durationHours : undefined,
      startTimes: t.startTimes || [],
    })),
  };
}

// --- Copy Fragments -------------------------------------------------------
const OPENERS: Record<Tone, string[]> = {
  friendly: [
    "Located in {{city}}, {{state}}, this trip is about relaxed time on the water, good company, and fish that keep things interesting.",
    "Based out of {{city}}, {{state}}, we keep things welcoming and easygoing while still putting you on quality fish.",
  ],
  adventurous: [
    "Launch out of {{city}}, {{state}} and chase fast strikes, sudden blow‑ups, and that next surge of drag you came for.",
    "Operating from {{city}}, {{state}}, this trip leans into movement, reaction, and dialing in patterns before the window closes.",
  ],
  professional: [
    "Departing {{city}}, {{state}}, this charter emphasizes a well-prepared approach—structured, efficient, and focused on productive water.",
    "From {{city}}, {{state}} we run a clean, methodical program built around seasonal positioning and steady execution.",
  ],
};

const CLOSERS: Record<Tone, string[]> = {
  friendly: [
    "Ready to trade screen time for reel time? Lock in a date and make a few memories. [[Add a personal welcome or fun promise]]",
    "Bring a friend, bring the kids—just bring some curiosity. The rest we’ll handle. [[Add a sentence about your captain’s style]]",
  ],
  adventurous: [
    "If you like story-worthy moments and gear that earns its keep, this is your run. [[Add a short recent catch moment]]",
    "Hook up, reset, repeat—that’s the rhythm. Book it and chase something with shoulders. [[Add a hype closer]]",
  ],
  professional: [
    "Add any certifications, methodology, or safety assurances here to reinforce confidence. [[Add credentials / approach]]",
    "Bookings fill as prime conditions line up—secure your slot and refine goals with us in advance. [[Add professional sign-off]]",
  ],
};

// --- Helpers ---------------------------------------------------------------
function oxford(list: string[]): string {
  if (!list.length) return "local species";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function boatSummary(ctx: GenerationContext) {
  const segs: string[] = [];
  if (ctx.boat.lengthFeet) segs.push(`${ctx.boat.lengthFeet}’`);
  if (ctx.boat.type) segs.push(ctx.boat.type);
  const base = segs.join(" ") || "boat";
  const cap = ctx.boat.capacity ? ` that takes up to ${ctx.boat.capacity} guest${ctx.boat.capacity > 1 ? "s" : ""}` : "";
  return base + cap;
}

function amenitiesLine(ctx: GenerationContext) {
  if (!ctx.amenities.length) return "Standard safety gear and tackle are ready when you arrive.";
  const sample = ctx.amenities.slice(0, 5);
  return `Gear and onboard extras often include ${oxford(sample)}${ctx.amenities.length > sample.length ? ", with more as needed" : ""}.`;
}

function durationsPhrase(trips: GenerationContext["trips"]) {
  const set = Array.from(new Set(trips.map((t) => t.durationHours).filter(Boolean))) as number[];
  if (!set.length) return "Flexible trip lengths";
  set.sort((a, b) => a - b);
  if (set.length === 1) return `${set[0]} hour trip`;
  if (set.length === 2) return `${set[0]} and ${set[1]} hour options`;
  return `${set.slice(0, -1).join(", ")} and ${set[set.length - 1]} hour options`;
}

function policyNarrative(ctx: GenerationContext) {
  const bits: string[] = [];
  if (ctx.policies.childFriendly != null) {
    bits.push(ctx.policies.childFriendly ? "Kid‑friendly" : "Best suited to capable anglers");
  }
  if (ctx.policies.catchAndRelease && ctx.policies.catchAndKeep) bits.push("Mix of keep & release by conditions");
  else if (ctx.policies.catchAndRelease) bits.push("Catch & release focused");
  else if (ctx.policies.catchAndKeep) bits.push("Keeping a legal fish for the table is fine");
  return bits.length ? bits.join(". ") + "." : "";
}

function toneBridge(tone: Tone) {
  switch (tone) {
    case "adventurous":
      return "We stay light on our feet—adjusting when wind shifts or bait shows elsewhere.";
    case "professional":
      return "Decisions are guided by structure, water clarity, and current seasonal movements.";
    default:
      return "We read the conditions and keep things flexible so everyone stays engaged.";
  }
}

// --- Main Generation -------------------------------------------------------
export function generateCharterDescription(values: CharterFormValues): string {
  const tone = (values.tone as Tone) || "friendly";
  const ctx = buildContext(values);

  // Paragraph 1 – Sense of place & vibe
  const opener = pick(OPENERS[tone])
    .replace(/{{city}}/g, ctx.city)
    .replace(/{{state}}/g, ctx.state);

  // Paragraph 2 – Targets, approach & trip structure
  const speciesList = oxford(ctx.species);
  const dur = durationsPhrase(ctx.trips);
  let approach: string;
  if (tone === "adventurous") {
    approach = `Expect an active rhythm across structure or shoreline—casting for ${speciesList} with ${dur} to match your pace.`;
  } else if (tone === "professional") {
    approach = `Programs are planned around seasonal positioning, aiming for ${speciesList} over a structured ${dur}.`;
  } else {
    approach = `You’ll target ${speciesList} at an easy pace with ${dur} that let the day breathe.`;
  }
  const bridge = toneBridge(tone);
  const paragraph2 = `${approach} ${bridge}`.trim();

  // Paragraph 3 – Boat, gear, comfort
  const boat = boatSummary(ctx);
  const features = ctx.boat.features?.slice(0, 4) || [];
  const featLine = features.length ? ` It’s outfitted with ${oxford(features)} to keep things smooth.` : "";
  const amen = amenitiesLine(ctx);
  const paragraph3 = `You’ll fish from a ${boat}.${featLine} ${amen}`.replace(/  +/g, " ").trim();

  // Paragraph 4 – Policies + call to action + personalization placeholder
  const policy = policyNarrative(ctx);
  const closer = pick(CLOSERS[tone]);
  const paragraph4 = [policy, closer].filter(Boolean).join(" ");

  return [opener, paragraph2, paragraph3, paragraph4].filter(Boolean).join("\n\n");
}

export function personalizationScore(
  base: string | undefined,
  current: string | undefined
): number {
  if (!base || !current) return 0;
  if (base === current) return 0;
  const minLen = Math.min(base.length, current.length);
  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (base[i] === current[i]) same++;
  }
  const similarity = same / Math.max(base.length, current.length);
  const changed = 1 - similarity;
  return Math.min(100, Math.round(changed * 100));
}
