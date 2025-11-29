import {
  AMENITIES_OPTIONS,
  BOAT_FEATURE_OPTIONS,
  TECHNIQUE_OPTIONS,
} from "@/utils/captainFormData";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";

// --- Types -----------------------------------------------------------------
export type Tone = "friendly" | "adventurous" | "professional";
export type Language = "en" | "ms";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Label Translation Helpers ---------------------------------------------
type LabelOption = { key: string; label: string; labelMy?: string };

function translateLabel(
  key: string,
  options: LabelOption[],
  lang: Language
): string {
  const option = options.find((o) => o.key === key || o.label === key);
  if (!option) return key;
  return lang === "ms" && option.labelMy ? option.labelMy : option.label;
}

function translateAmenity(amenity: string, lang: Language): string {
  return translateLabel(amenity, AMENITIES_OPTIONS, lang);
}

function translateBoatFeature(feature: string, lang: Language): string {
  return translateLabel(feature, BOAT_FEATURE_OPTIONS, lang);
}

function translateTechnique(technique: string, lang: Language): string {
  // TECHNIQUE_OPTIONS uses { key, label } format without labelMy yet
  // We'll add basic translations inline for now
  const techniqueMy: Record<string, string> = {
    bottom_fishing: "Bottom Fishing",
    casting: "Casting",
    deep_sea_fishing: "Deep Sea Fishing",
    drift_fishing: "Drift Fishing",
    jigging: "Jigging",
    eging: "Eging",
    fly_fishing: "Fly Fishing",
    prawn_fishing: "Memancing Udang",
    trolling: "Trolling",
    apollo: "Apollo",
  };
  const option = TECHNIQUE_OPTIONS.find(
    (o) => o.key === technique || o.label === technique
  );
  if (!option) return technique;
  if (lang === "ms") {
    return techniqueMy[option.key] || option.label;
  }
  return option.label;
}

// --- Context Extraction ----------------------------------------------------
interface GenerationContext {
  city: string;
  state: string;
  charterName?: string;
  charterType?: string;
  captainName?: string;
  experienceYears?: number;
  species: string[];
  techniques: string[];
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
    licenseProvided?: boolean;
    liveBaitProvided?: boolean;
    alcoholNotAllowed?: boolean;
    smokingNotAllowed?: boolean;
  };
  trips: { durationHours?: number; startTimes?: string[]; tripType?: string }[];
  description?: string;
  generatedDescription?: string;
}

export function buildContext(values: CharterFormValues): GenerationContext {
  const speciesSet = new Set<string>();
  const techniquesSet = new Set<string>();
  (values.trips || []).forEach((t) => {
    (t.species || []).forEach((s) => speciesSet.add(s));
    const maybe = t as unknown as { techniques?: unknown };
    if (Array.isArray(maybe.techniques)) {
      maybe.techniques.forEach((tech) => {
        if (typeof tech === "string") techniquesSet.add(tech);
      });
    }
  });
  return {
    city: values.city?.trim() || "your area",
    state: values.state?.trim() || "Malaysia",
    charterName: values.charterName?.trim() || undefined,
    charterType: values.charterType?.trim() || undefined,
    captainName: values.operator?.displayName?.trim() || undefined,
    experienceYears: Number.isFinite(values.operator?.experienceYears)
      ? (values.operator?.experienceYears as number)
      : undefined,
    species: Array.from(speciesSet).slice(0, 6),
    techniques: Array.from(techniquesSet).slice(0, 5),
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
      licenseProvided: values.policies?.licenseProvided,
      liveBaitProvided: values.policies?.liveBaitProvided,
      alcoholNotAllowed: values.policies?.alcoholNotAllowed,
      smokingNotAllowed: values.policies?.smokingNotAllowed,
    },
    trips: (values.trips || []).map((t) => ({
      durationHours: Number.isFinite(t.durationHours)
        ? t.durationHours
        : undefined,
      startTimes: t.startTimes || [],
      tripType: (t as unknown as { tripType?: string }).tripType,
    })),
    description: values.description,
    generatedDescription: values.generatedDescription,
  };
}

// --- Bilingual Copy Fragments ----------------------------------------------
const OPENERS: Record<Language, Record<Tone, string[]>> = {
  en: {
    friendly: [
      "Welcome to {{charterName}} in {{city}}, {{state}} — where relaxed vibes meet great fishing.",
      "{{charterName}} based in {{city}}, {{state}} offers a welcoming experience for anglers of all levels.",
    ],
    adventurous: [
      "Get ready for action with {{charterName}} out of {{city}}, {{state}} — where every trip promises excitement.",
      "{{charterName}} from {{city}}, {{state}} delivers thrilling fishing adventures for those who chase the bite.",
    ],
    professional: [
      "{{charterName}} departing from {{city}}, {{state}} provides a structured, results-focused fishing experience.",
      "Experience professional-grade fishing with {{charterName}} based in {{city}}, {{state}}.",
    ],
  },
  ms: {
    friendly: [
      "Selamat datang ke {{charterName}} di {{city}}, {{state}} — tempat santai untuk memancing dengan seronok.",
      "{{charterName}} di {{city}}, {{state}} menawarkan pengalaman mesra untuk pemancing semua peringkat.",
    ],
    adventurous: [
      "Bersedia untuk aksi dengan {{charterName}} dari {{city}}, {{state}} — setiap trip penuh dengan keseronokan.",
      "{{charterName}} dari {{city}}, {{state}} menawarkan pengembaraan memancing yang mengujakan.",
    ],
    professional: [
      "{{charterName}} dari {{city}}, {{state}} menyediakan pengalaman memancing yang tersusun dan profesional.",
      "Alami memancing bertaraf profesional dengan {{charterName}} di {{city}}, {{state}}.",
    ],
  },
};

const CLOSERS: Record<Language, Record<Tone, string[]>> = {
  en: {
    friendly: [
      "Ready to make some memories? Book your trip and let's get fishing!",
      "Bring your friends, bring your curiosity — we'll handle the rest.",
    ],
    adventurous: [
      "The water's calling. Book now and chase something worth talking about.",
      "Adventure awaits — secure your spot and let's make it happen.",
    ],
    professional: [
      "Prime conditions fill fast. Reserve your slot and let's discuss your goals.",
      "Book in advance to secure the best conditions and preparation.",
    ],
  },
  ms: {
    friendly: [
      "Sedia untuk mencipta kenangan? Tempah trip anda dan jom memancing!",
      "Bawa kawan-kawan anda — kami uruskan yang lain.",
    ],
    adventurous: [
      "Air sedang memanggil. Tempah sekarang dan kejar sesuatu yang berbaloi.",
      "Pengembaraan menanti — pastikan tempat anda hari ini.",
    ],
    professional: [
      "Kondisi terbaik cepat penuh. Tempah slot anda dan mari bincang matlamat anda.",
      "Tempah awal untuk memastikan keadaan dan persediaan terbaik.",
    ],
  },
};

// --- Section Labels --------------------------------------------------------
const SECTION_LABELS: Record<
  Language,
  {
    highlights: string;
    targetSpecies: string;
    techniques: string;
    boat: string;
    included: string;
    policies: string;
  }
> = {
  en: {
    highlights: "Trip Highlights",
    targetSpecies: "Target Species",
    techniques: "Fishing Techniques",
    boat: "Your Vessel",
    included: "What's Included",
    policies: "Good to Know",
  },
  ms: {
    highlights: "Kelebihan Trip",
    targetSpecies: "Spesies Sasaran",
    techniques: "Teknik Memancing",
    boat: "Bot Anda",
    included: "Termasuk",
    policies: "Info Penting",
  },
};

// --- Helpers ---------------------------------------------------------------
function durationsPhrase(
  trips: GenerationContext["trips"],
  lang: Language
): string {
  const set = Array.from(
    new Set(trips.map((t) => t.durationHours).filter(Boolean))
  ) as number[];
  if (!set.length)
    return lang === "ms" ? "Tempoh fleksibel" : "Flexible durations";
  set.sort((a, b) => a - b);
  const hourWord = lang === "ms" ? "jam" : "hour";
  const optionsWord = lang === "ms" ? "pilihan" : "options";
  if (set.length === 1) return `${set[0]} ${hourWord}`;
  if (set.length === 2)
    return `${set[0]} & ${set[1]} ${hourWord} ${optionsWord}`;
  return `${set.slice(0, -1).join(", ")} & ${set[set.length - 1]} ${hourWord} ${optionsWord}`;
}

function boatSummary(ctx: GenerationContext, lang: Language): string {
  const segs: string[] = [];
  if (ctx.boat.lengthFeet) segs.push(`${ctx.boat.lengthFeet}'`);
  if (ctx.boat.type) segs.push(ctx.boat.type);
  const base = segs.join(" ") || (lang === "ms" ? "bot" : "boat");
  const guestWord = lang === "ms" ? "tetamu" : "guests";
  const upToWord = lang === "ms" ? "sehingga" : "up to";
  const cap = ctx.boat.capacity
    ? ` (${upToWord} ${ctx.boat.capacity} ${guestWord})`
    : "";
  return base + cap;
}

// --- Highlight Bullets Generator -------------------------------------------
function generateHighlights(
  ctx: GenerationContext,
  tone: Tone,
  lang: Language
): string[] {
  const highlights: string[] = [];
  const dur = durationsPhrase(ctx.trips, lang);

  // Experience bullet
  if (ctx.captainName && ctx.experienceYears && ctx.experienceYears > 0) {
    if (lang === "ms") {
      highlights.push(
        `Dipandu oleh ${ctx.captainName} dengan ${ctx.experienceYears} tahun pengalaman`
      );
    } else {
      highlights.push(
        `Guided by ${ctx.captainName} with ${ctx.experienceYears} years of experience`
      );
    }
  } else if (ctx.captainName) {
    if (lang === "ms") {
      highlights.push(`Dipandu oleh Kapten ${ctx.captainName}`);
    } else {
      highlights.push(`Guided by Captain ${ctx.captainName}`);
    }
  }

  // Duration bullet
  if (lang === "ms") {
    highlights.push(`Trip ${dur} tersedia`);
  } else {
    highlights.push(`${dur} trips available`);
  }

  // Capacity bullet
  if (ctx.boat.capacity) {
    if (lang === "ms") {
      highlights.push(`Boleh memuatkan sehingga ${ctx.boat.capacity} orang`);
    } else {
      highlights.push(`Accommodates up to ${ctx.boat.capacity} guests`);
    }
  }

  // Child-friendly bullet
  if (ctx.policies.childFriendly) {
    if (lang === "ms") {
      highlights.push(`Sesuai untuk keluarga dan kanak-kanak`);
    } else {
      highlights.push(`Family and kid-friendly`);
    }
  }

  // License bullet
  if (ctx.policies.licenseProvided) {
    if (lang === "ms") {
      highlights.push(`Lesen memancing disediakan`);
    } else {
      highlights.push(`Fishing license provided`);
    }
  }

  // Bait bullet
  if (ctx.policies.liveBaitProvided) {
    if (lang === "ms") {
      highlights.push(`Umpan hidup disediakan`);
    } else {
      highlights.push(`Live bait provided`);
    }
  }

  return highlights;
}

// --- Species Section -------------------------------------------------------
function generateSpeciesSection(
  ctx: GenerationContext,
  lang: Language
): string | null {
  if (!ctx.species.length) return null;
  const label = SECTION_LABELS[lang].targetSpecies;
  const speciesList = ctx.species.map((s) => `• ${s}`).join("\n");
  return `**${label}:**\n${speciesList}`;
}

// --- Techniques Section ----------------------------------------------------
function generateTechniquesSection(
  ctx: GenerationContext,
  lang: Language
): string | null {
  if (!ctx.techniques.length) return null;
  const label = SECTION_LABELS[lang].techniques;
  const techList = ctx.techniques
    .map((t) => `• ${translateTechnique(t, lang)}`)
    .join("\n");
  return `**${label}:**\n${techList}`;
}

// --- Boat Section ----------------------------------------------------------
function generateBoatSection(
  ctx: GenerationContext,
  lang: Language
): string | null {
  const boat = boatSummary(ctx, lang);
  const label = SECTION_LABELS[lang].boat;
  const bullets: string[] = [];

  bullets.push(`• ${boat}`);

  if (ctx.boat.features && ctx.boat.features.length > 0) {
    ctx.boat.features.slice(0, 4).forEach((f) => {
      bullets.push(`• ${translateBoatFeature(f, lang)}`);
    });
  }

  return `**${label}:**\n${bullets.join("\n")}`;
}

// --- Amenities Section -----------------------------------------------------
function generateAmenitiesSection(
  ctx: GenerationContext,
  lang: Language
): string | null {
  if (!ctx.amenities.length) return null;
  const label = SECTION_LABELS[lang].included;
  const amenList = ctx.amenities
    .slice(0, 6)
    .map((a) => `• ${translateAmenity(a, lang)}`)
    .join("\n");
  return `**${label}:**\n${amenList}`;
}

// --- Policies Section ------------------------------------------------------
function generatePoliciesSection(
  ctx: GenerationContext,
  lang: Language
): string | null {
  const policies: string[] = [];

  if (ctx.policies.catchAndRelease && ctx.policies.catchAndKeep) {
    policies.push(
      lang === "ms"
        ? "• Tangkap & lepas atau simpan (ikut keadaan)"
        : "• Catch & release or keep (conditions apply)"
    );
  } else if (ctx.policies.catchAndRelease) {
    policies.push(
      lang === "ms" ? "• Amalan tangkap & lepas" : "• Catch & release practice"
    );
  } else if (ctx.policies.catchAndKeep) {
    policies.push(
      lang === "ms"
        ? "• Boleh simpan tangkapan yang sah"
        : "• Keep your legal catch"
    );
  }

  if (ctx.policies.alcoholNotAllowed) {
    policies.push(
      lang === "ms" ? "• Alkohol tidak dibenarkan" : "• No alcohol on board"
    );
  }

  if (ctx.policies.smokingNotAllowed) {
    policies.push(
      lang === "ms" ? "• Dilarang merokok di atas bot" : "• No smoking on board"
    );
  }

  if (!ctx.policies.childFriendly && ctx.policies.childFriendly !== undefined) {
    policies.push(
      lang === "ms"
        ? "• Sesuai untuk pemancing berpengalaman"
        : "• Best suited for experienced anglers"
    );
  }

  if (!policies.length) return null;

  const label = SECTION_LABELS[lang].policies;
  return `**${label}:**\n${policies.join("\n")}`;
}

// --- Main Generation Function ----------------------------------------------
export function generateCharterDescription(
  values: CharterFormValues,
  lang: Language = "en"
): string {
  const tone = (values.tone as Tone) || "friendly";
  const ctx = buildContext(values);
  const includePlaceholders = !ctx.generatedDescription;

  // Opening paragraph
  const opener = pick(OPENERS[lang][tone])
    .replace(/{{city}}/g, ctx.city)
    .replace(/{{state}}/g, ctx.state)
    .replace(
      /{{charterName}}/g,
      ctx.charterName || (lang === "ms" ? "Charter ini" : "This charter")
    );

  // Highlights section
  const highlights = generateHighlights(ctx, tone, lang);
  const highlightsLabel = SECTION_LABELS[lang].highlights;
  const highlightsSection =
    highlights.length > 0
      ? `**${highlightsLabel}:**\n${highlights.map((h) => `• ${h}`).join("\n")}`
      : null;

  // Content sections
  const speciesSection = generateSpeciesSection(ctx, lang);
  const techniquesSection = generateTechniquesSection(ctx, lang);
  const boatSection = generateBoatSection(ctx, lang);
  const amenitiesSection = generateAmenitiesSection(ctx, lang);
  const policiesSection = generatePoliciesSection(ctx, lang);

  // Closing
  const closer = pick(CLOSERS[lang][tone]);

  // Add placeholder for personalization on first generation
  const placeholder = includePlaceholders
    ? lang === "ms"
      ? "\n\n[[Tambah nota peribadi atau cerita menarik di sini]]"
      : "\n\n[[Add a personal note or interesting story here]]"
    : "";

  // Assemble description
  const sections = [
    opener,
    highlightsSection,
    speciesSection,
    techniquesSection,
    boatSection,
    amenitiesSection,
    policiesSection,
    closer + placeholder,
  ].filter(Boolean);

  return sections.join("\n\n");
}

// --- Legacy function for backward compatibility ----------------------------
export { generateCharterDescription as default };

// --- Bilingual Description Generator ---------------------------------------
export function generateBilingualDescription(values: CharterFormValues): {
  en: string;
  ms: string;
} {
  return {
    en: generateCharterDescription(values, "en"),
    ms: generateCharterDescription(values, "ms"),
  };
}

// --- Personalization Score -------------------------------------------------
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
