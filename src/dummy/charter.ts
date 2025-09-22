// /src/dummy/charter.ts
// Rich dummy data for Fishon — inspired by charter marketplace pages

// -------- Types --------
export type Trip = {
  name: string;
  price: number; // RM
  duration: string; // e.g. "4 hours", "8 hours"
  description?: string;
  startTimes?: string[]; // 24h strings e.g. ["07:00","13:30"]
  maxAnglers?: number; // max pax fishing
  private?: boolean; // whole boat vs shared
};

export type Policies = {
  catchAndKeep: boolean;
  catchAndRelease: boolean;
  childFriendly: boolean;
  wheelchairAccessible?: boolean;
  liveBaitProvided?: boolean;
  alcoholAllowed?: boolean;
  smokingAllowed?: boolean;
};

export type Pickup = {
  available: boolean;
  included: boolean;
  fee?: number; // RM if not included
  areas?: string[]; // pickup coverage
  notes?: string;
};

export type Captain = {
  name: string;
  avatarUrl?: string; // logo/photo
  yearsExperience: number;
  crewCount: number;
  intro: string; // short intro paragraph
};

export type FishingType = "lake" | "stream" | "inshore" | "offshore";
export type Tier = "basic" | "silver" | "gold";

export type Charter = {
  id: number;
  name: string;
  location: string; // "Klang, Selangor"
  address: string; // meeting point or jetty
  coordinates?: { lat: number; lng: number };
  images?: string[];
  imageUrl?: string;

  description: string; // will be expanded to 3–4 paragraphs

  trip: Trip[];
  species: string[]; // target species
  techniques: string[]; // e.g. "Light Tackle", "Jigging"

  includes: string[]; // included in price (we may add Drinks/Snacks/Lunch for some)
  excludes: string[]; // not included (e.g. fishing license, meals)

  licenseProvided: boolean;
  pickup: Pickup;
  policies: Policies;

  languages?: string[]; // spoken by crew

  boat: {
    name: string;
    type: string;
    length: string;
    capacity: number; // boat pax capacity
    features: string[];
  };

  // NEW
  captain: Captain;
  fishingType: FishingType;
  tier: Tier;
};

// --- Internal helper type: keep your original data shape intact so we can transform it ---
// Your current objects include `cancellation`; we’ll strip it during augmentation.
type RawCharter = Omit<
  Charter,
  "captain" | "fishingType" | "tier" | "description"
> & {
  description: string; // still present in raw
  cancellation?: {
    freeUntilHours: number;
    afterPolicy: string;
  };
};

// -------- Helpers / common sets --------
const COMMON_INCLUDES = [
  "Safety gear",
  "Life jackets",
  "Ice box",
  "Bottled water",
];
const COMMON_EXCLUDES = ["Meals", "Hotel pickup (unless stated)", "Gratuities"];

const SHORE_POND_INCLUDES = [...COMMON_INCLUDES, "Basic tackle (rods & lures)"];
const BOAT_INCLUDES = [
  ...COMMON_INCLUDES,
  "Rods, reels & tackle",
  "Fuel",
  "Skipper",
];

const CXL_AFTER = "50% charge after cutoff; 100% within 12 hours or no-show.";

const LANG_BM_EN = ["BM", "English"];

// Quick species lists per area flavor
const SPECIES_MANGROVE = ["Barramundi", "Mangrove Jack", "Grouper", "Grunter"];
const SPECIES_JUNGLE = ["Peacock Bass", "Toman (Giant Snakehead)", "Sebarau"];
const SPECIES_COAST = ["Trevally", "Queenfish", "Cobia", "Snapper", "Squid"];

// -------- Data --------
// AFTER
const rawCharters: RawCharter[] = [
  {
    id: 1001,
    name: "Gombak stream Light Tackle",
    location: "Gombak, Selangor",
    address: "Gombak stream, 53100 Gombak, Selangor",
    coordinates: { lat: 3.246, lng: 101.737 },
    images: [
      "https://images.unsplash.com/photo-1474667686408-59e71a2a7e36?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508182311256-e3f3e78dc8d0?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Explore the upper Gombak with light tackle for toman and snakehead. Short runs, calm water, and lush jungle banks.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 350,
        duration: "4 hours",
        startTimes: ["07:00", "13:30"],
        maxAnglers: 2,
        private: true,
        description: "Morning or afternoon casting session on light gear.",
      },
      {
        name: "Full-Day Trip",
        price: 600,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 2,
        private: true,
        description: "Longer range and more spots explored throughout the day.",
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Light Tackle", "Casting", "Topwater"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: {
      available: false,
      included: false,
      notes: "Meet at designated stream access point.",
    },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: false,
      alcoholAllowed: false,
      smokingAllowed: false,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Temenggor 1",
      type: "Fiberglass Skiff",
      length: "16 ft",
      capacity: 3,
      features: ["Trolling Motor", "Casting Deck", "Dry Storage"],
    },
  },
  {
    id: 1002,
    name: "Hulu Langat Freshwater Charter",
    location: "Hulu Langat, Selangor",
    address: "Jalan Sungai Lui, 43100 Hulu Langat, Selangor",
    coordinates: { lat: 3.1405, lng: 101.8502 },
    images: [
      "https://images.unsplash.com/photo-1500367215255-0e0b25b396af?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1474314881477-04c4aac40a51?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Beginner-friendly freshwater sessions near Hulu Langat—easy ponds and short stream drifts for fast action.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 300,
        duration: "4 hours",
        startTimes: ["08:00", "14:00"],
        maxAnglers: 3,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 520,
        duration: "8 hours",
        startTimes: ["08:00"],
        maxAnglers: 3,
        private: true,
      },
    ],
    species: ["Peacock Bass", "Catfish", "Carp"],
    techniques: ["Light Tackle", "Float Fishing", "Soft Plastics"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: {
      available: true,
      included: false,
      fee: 60,
      areas: ["Kajang", "Ampang"],
      notes: "Pickups beyond 15km charged per km.",
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Langat Runner",
      type: "Aluminium Jon Boat",
      length: "14 ft",
      capacity: 3,
      features: ["Fishfinder", "Bimini Shade", "Life Jackets"],
    },
  },
  {
    id: 1003,
    name: "Hulu Selangor Jungle Casting",
    location: "Hulu Selangor, Selangor",
    address: "Hulu Selangor Backwaters, 44000 Hulu Selangor, Selangor",
    coordinates: { lat: 3.544, lng: 101.665 },
    images: [
      "https://images.unsplash.com/photo-1520697222860-6c05b12a7b83?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464851707681-f9d5fdaccea8?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Surface action for peacock bass and toman in wild backwaters. Early starts, compact access and plenty of topwater strikes.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 420,
        duration: "4 hours",
        startTimes: ["06:30", "13:00"],
        maxAnglers: 2,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 700,
        duration: "8 hours",
        startTimes: ["06:30"],
        maxAnglers: 2,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Topwater", "Casting", "Fly Fishing"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: false,
      liveBaitProvided: false,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Jelajah Hulu",
      type: "Bass Boat",
      length: "17 ft",
      capacity: 2,
      features: ["Trolling Motor", "Livewell", "Rod Holders"],
    },
  },
  {
    id: 1004,
    name: "Klang Straits Inshore",
    location: "Klang, Selangor",
    address: "Port Klang, 42000 Pelabuhan Klang, Selangor",
    coordinates: { lat: 3.005, lng: 101.392 },
    images: [
      "https://images.unsplash.com/photo-1508184964240-ee76b36e3b20?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520975922284-9d6a62a3a67c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Inshore sessions around structures and creek mouths for barra, mangrove jack and grouper. Stable boat with shade.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 650,
        duration: "5 hours",
        startTimes: ["07:00", "13:00"],
        maxAnglers: 4,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 980,
        duration: "9 hours",
        startTimes: ["07:00"],
        maxAnglers: 4,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Light Tackle", "Bottom Fishing", "Jigging"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: true,
      areas: ["Port Klang Jetty", "Pulau Ketam Jetty"],
      notes: "Hotel pickup available on request (fees may apply).",
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Selat Klang",
      type: "Center Console",
      length: "23 ft",
      capacity: 5,
      features: ["GPS/Fishfinder", "Bimini Shade", "Ice Box", "VHF Radio"],
    },
  },
  {
    id: 1005,
    name: "Kuala Langat Estuary Drifts",
    location: "Kuala Langat, Selangor",
    address: "Morib & Estuary Systems, 42700 Kuala Langat, Selangor",
    coordinates: { lat: 2.797, lng: 101.498 },
    images: [
      "https://images.unsplash.com/photo-1532619249780-8e3c1b3dfd5f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1514070706115-0a0b42da3f81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504718855392-c0f33b372e72?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Relaxed estuary drifts and light jigging—ideal for mixed-experience groups who want an easy day on the water.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 520,
        duration: "4 hours",
        startTimes: ["07:30", "14:00"],
        maxAnglers: 5,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 860,
        duration: "8 hours",
        startTimes: ["07:30"],
        maxAnglers: 5,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Light Tackle", "Drifting", "Jigging"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: true, included: false, fee: 80, areas: ["Banting"] },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Langat Explorer",
      type: "Open Deck",
      length: "21 ft",
      capacity: 6,
      features: ["Life Jackets", "Rod Holders", "First Aid Kit"],
    },
  },
  {
    id: 1006,
    name: "Kuala Selangor Mangrove Trip",
    location: "Kuala Selangor, Selangor",
    address: "Jeram & Mangrove Creeks, 45800 Jeram, Selangor",
    coordinates: { lat: 3.215, lng: 101.289 },
    images: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508182311256-e3f3e78dc8d0?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Sight-casting around mangroves and creek junctions for barra and jacks. Short runs, flexible hours.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 580,
        duration: "4 hours",
        startTimes: ["07:00", "14:00"],
        maxAnglers: 3,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 920,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 3,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Sight Casting", "Soft Plastics", "Light Tackle"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Jeram 2",
      type: "Panga",
      length: "22 ft",
      capacity: 4,
      features: ["Casting Deck", "Ice Box", "Life Jackets"],
    },
  },
  {
    id: 1007,
    name: "Petaling Urban Pond Session",
    location: "Petaling, Selangor",
    address: "Shah Alam & Subang Area, Petaling, Selangor",
    coordinates: { lat: 3.073, lng: 101.518 },
    images: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Convenient half-day pond sessions around Petaling. Perfect for first-timers—gear and coaching included.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 180,
        duration: "4 hours",
        startTimes: ["09:00", "14:00"],
        maxAnglers: 4,
        private: false,
        description: "Shared pond session with on-site coaching.",
      },
      {
        name: "Full-Day Trip",
        price: 320,
        duration: "8 hours",
        startTimes: ["09:00"],
        maxAnglers: 4,
        private: false,
      },
    ],
    species: ["Catfish", "Tilapia", "Patin"],
    techniques: ["Float Fishing", "Bread & Dough Baits", "Light Tackle"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      wheelchairAccessible: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Shah Alam Lite",
      type: "Shore / Pond Platform",
      length: "—",
      capacity: 4,
      features: ["Tackle Provided", "Drinks", "Basic Coaching"],
    },
  },
  {
    id: 1008,
    name: "Sabak Bernam Coastal Jigging",
    location: "Sabak Bernam, Selangor",
    address: "Sabak Bernam Coast, 45200 Sabak Bernam, Selangor",
    coordinates: { lat: 3.754, lng: 100.988 },
    images: [
      "https://images.unsplash.com/photo-1533499513792-c3a3e7a1e3d4?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520975922284-9d6a62a3a67c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Near-shore jigging and bait sessions off Sabak Bernam. Target trevally and grouper with an experienced local crew.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 780,
        duration: "6 hours",
        startTimes: ["07:00"],
        maxAnglers: 5,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 1200,
        duration: "10 hours",
        startTimes: ["06:30"],
        maxAnglers: 5,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Jigging", "Bottom Fishing", "Trolling"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 100,
      areas: ["Sabak Bernam"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Bernam Seeker",
      type: "Cabin Boat",
      length: "27 ft",
      capacity: 6,
      features: ["Cabin", "Toilet", "GPS/Fishfinder", "Ice Box"],
    },
  },
  {
    id: 1009,
    name: "Sepang Inshore Trolling",
    location: "Sepang, Selangor",
    address: "Bagan Lalang & Coastal Line, 43950 Sepang, Selangor",
    coordinates: { lat: 2.589, lng: 101.699 },
    images: [
      "https://images.unsplash.com/photo-1504718855392-c0f33b372e72?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508182311256-e3f3e78dc8d0?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Inshore trolling and bottom fishing around Sepang’s coastline. Comfortable ride with shade and plenty of space.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 600,
        duration: "5 hours",
        startTimes: ["07:00", "13:30"],
        maxAnglers: 4,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 980,
        duration: "9 hours",
        startTimes: ["07:00"],
        maxAnglers: 4,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Trolling", "Light Tackle", "Bottom Fishing"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Bagan Lalang",
      type: "Center Console",
      length: "24 ft",
      capacity: 5,
      features: ["Bimini Shade", "Ice Box", "Life Jackets"],
    },
  },
  {
    id: 1010,
    name: "Klang Straits Night Trip",
    location: "Klang, Selangor",
    address: "North Klang Straits, 42000 Pelabuhan Klang, Selangor",
    coordinates: { lat: 3.014, lng: 101.343 },
    images: [
      "https://images.unsplash.com/photo-1482192505345-5655af888cc4?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464851707681-f9d5fdaccea8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Cooler night-time session in the Klang Straits for squid and predators under lights—unique atmosphere and calm seas.",
    trip: [
      {
        name: "Night Trip",
        price: 700,
        duration: "6 hours",
        startTimes: ["18:30"],
        maxAnglers: 5,
        private: true,
      },
      {
        name: "Overnight Trip",
        price: 1200,
        duration: "10 hours",
        startTimes: ["20:00"],
        maxAnglers: 5,
        private: true,
      },
    ],
    species: ["Squid", "Barracuda", "Snapper"],
    techniques: ["Squid Jigging", "Drift Fishing", "Light Tackle"],
    includes: [...BOAT_INCLUDES, "LED night lights"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: true, included: true, areas: ["Port Klang Jetty"] },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Malam Klang",
      type: "Open Deck w/ Lights",
      length: "22 ft",
      capacity: 6,
      features: ["LED Night Lights", "Ice Box", "Safety Gear"],
    },
  },
  {
    id: 1011,
    name: "Pulau Indah Offshore Catamaran",
    location: "Pulau Indah, Selangor",
    address: "Westport Marina, Pulau Indah, Selangor",
    coordinates: { lat: 2.955, lng: 101.317 },
    images: [
      "https://images.unsplash.com/photo-1529963183134-4f6c1b1b1d3b?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1458442310124-dde6edb43d10?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Stable twin-hull catamaran for offshore runs off Pulau Indah—ideal for larger groups seeking comfort and deck space.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1400,
        duration: "6 hours",
        startTimes: ["07:00", "13:30"],
        maxAnglers: 10,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 2200,
        duration: "10 hours",
        startTimes: ["07:00"],
        maxAnglers: 10,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Bottom Fishing", "Jigging", "Trolling"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: true,
      areas: ["Pulau Indah", "Port Klang"],
      notes: "Hotel pickup on request (fees may apply).",
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "TwinCat 30",
      type: "Power Catamaran",
      length: "30 ft",
      capacity: 12,
      features: ["Twin Engines", "Wide Beam", "Toilet", "GPS/Fishfinder"],
    },
  },
  {
    id: 1012,
    name: "Port Klang Sportfisher",
    location: "Port Klang, Selangor",
    address: "Royal Selangor Yacht Club, Port Klang, Selangor",
    coordinates: { lat: 3.003, lng: 101.392 },
    images: [
      "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Well-equipped sportfisher built for long days—shade, cockpit space, and offshore capability in the Klang Straits.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1200,
        duration: "5 hours",
        startTimes: ["07:00", "13:00"],
        maxAnglers: 6,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 1800,
        duration: "9 hours",
        startTimes: ["07:00"],
        maxAnglers: 6,
        private: true,
      },
      {
        name: "Night Trip",
        price: 1500,
        duration: "6 hours",
        startTimes: ["19:00"],
        maxAnglers: 6,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Jigging", "Live Bait", "Trolling"],
    includes: [...BOAT_INCLUDES, "Toilet"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 80,
      areas: ["Port Klang", "Shah Alam"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Klang Marlin",
      type: "Sportfisher",
      length: "28 ft",
      capacity: 8,
      features: ["Hardtop Shade", "Toilet", "Ice Box", "VHF/GPS"],
    },
  },
  {
    id: 1013,
    name: "Carey Island Mangrove Explorer",
    location: "Carey Island, Selangor",
    address: "Pulau Carey Jetty, Kuala Langat, Selangor",
    coordinates: { lat: 2.896, lng: 101.376 },
    images: [
      "https://images.unsplash.com/photo-1504718855392-c0f33b372e72?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508182311256-e3f3e78dc8d0?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Shaded longboat to explore the creeks and mangroves of Carey Island—great for family-friendly light tackle trips.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 480,
        duration: "4 hours",
        startTimes: ["07:30", "14:00"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 820,
        duration: "8 hours",
        startTimes: ["07:30"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Light Tackle", "Float Fishing", "Sight Casting"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 60,
      areas: ["Banting", "Teluk Panglima Garang"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Carey Explorer",
      type: "Longboat (Shaded)",
      length: "26 ft",
      capacity: 10,
      features: ["Bimini Shade", "Life Jackets", "Rod Holders"],
    },
  },
  {
    id: 1014,
    name: "Cyberjaya Lakes Pontoon",
    location: "Cyberjaya, Selangor",
    address: "Cyberjaya Lake Gardens, 63000 Cyberjaya, Selangor",
    coordinates: { lat: 2.927, lng: 101.657 },
    images: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500367215255-0e0b25b396af?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Spacious pontoon for relaxed freshwater outings—stable deck, railings, and easy movement for groups and kids.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 300,
        duration: "4 hours",
        startTimes: ["09:00", "14:00"],
        maxAnglers: 8,
        private: false,
      },
      {
        name: "Full-Day Trip",
        price: 520,
        duration: "8 hours",
        startTimes: ["09:00"],
        maxAnglers: 8,
        private: false,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Float Fishing", "Bread & Dough Baits", "Light Tackle"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      wheelchairAccessible: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Cyber Pontoon",
      type: "Pontoon Boat",
      length: "20 ft",
      capacity: 10,
      features: ["Railings", "Shade", "Bench Seating"],
    },
  },
  {
    id: 1015,
    name: "Shah Alam Reservoir Walkaround",
    location: "Shah Alam, Selangor",
    address: "Bukit Jelutong Reservoir, Shah Alam, Selangor",
    coordinates: { lat: 3.083, lng: 101.544 },
    images: [
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Compact walkaround suited to lure casting on city reservoirs—easy rail access and 360° fishability.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 420,
        duration: "4 hours",
        startTimes: ["07:00", "13:30"],
        maxAnglers: 4,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 720,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 4,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Casting", "Topwater", "Soft Plastics"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Jelutong Runner",
      type: "Walkaround",
      length: "18 ft",
      capacity: 5,
      features: ["Front Rails", "Trolling Motor", "Rod Holders"],
    },
  },
  {
    id: 1016,
    name: "Kuala Selangor stream Deck Boat",
    location: "Kuala Selangor, Selangor",
    address: "Pasir Penambang Jetty, Kuala Selangor, Selangor",
    coordinates: { lat: 3.345, lng: 101.256 },
    images: [
      "https://images.unsplash.com/photo-1514070706115-0a0b42da3f81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508184964240-ee76b36e3b20?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Wide-beam deck boat perfect for easy stream drifts and family trips—lots of seating and stable ride.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 560,
        duration: "4 hours",
        startTimes: ["07:30", "14:30"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 900,
        duration: "8 hours",
        startTimes: ["07:30"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Drifting", "Light Tackle", "Float Fishing"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 70,
      areas: ["Kuala Selangor Town", "Ikan Bakar Jeram"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Selangor Decky",
      type: "Deck Boat",
      length: "23 ft",
      capacity: 10,
      features: ["Bench Seating", "Shade", "Life Jackets"],
    },
  },
  {
    id: 1017,
    name: "Sabak Bernam Trawler Day Boat",
    location: "Sabak Bernam, Selangor",
    address: "Sabak Bernam Fishing Port, Selangor",
    coordinates: { lat: 3.767, lng: 100.988 },
    images: [
      "https://images.unsplash.com/photo-1453491945771-a1e904948959?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533499513792-c3a3e7a1e3d4?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520975922284-9d6a62a3a67c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Traditional trawler day boat converted for charter—huge deck space and shade, ideal for big groups and socials.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1600,
        duration: "6 hours",
        startTimes: ["07:00"],
        maxAnglers: 12,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 2600,
        duration: "10 hours",
        startTimes: ["07:00"],
        maxAnglers: 12,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Bottom Fishing", "Jigging"],
    includes: [...BOAT_INCLUDES, "Toilet"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 120,
      areas: ["Sabak Bernam", "Sungai Besar"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Bernam Trawler",
      type: "Converted Trawler",
      length: "32 ft",
      capacity: 14,
      features: ["Huge Deck", "Toilet", "Shade", "Rod Holders"],
    },
  },
  {
    id: 1018,
    name: "Sepang Twin-Engine Offshore",
    location: "Sepang, Selangor",
    address: "Bagan Lalang Jetty, Sepang, Selangor",
    coordinates: { lat: 2.594, lng: 101.693 },
    images: [
      "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1482192505345-5655af888cc4?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Fast offshore center console with twin engines—cover more ground and hit the productive reefs off Sepang.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 900,
        duration: "5 hours",
        startTimes: ["06:30", "13:00"],
        maxAnglers: 6,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 1500,
        duration: "9 hours",
        startTimes: ["06:30"],
        maxAnglers: 6,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Jigging", "Trolling", "Live Bait"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Sepang TwinSix",
      type: "Center Console (Twin)",
      length: "25 ft",
      capacity: 8,
      features: ["Twin Engines", "Livewell", "GPS/Fishfinder"],
    },
  },
  {
    id: 1019,
    name: "Kajang Family Pontoon",
    location: "Kajang, Selangor",
    address: "Tasik Cempaka, Bandar Baru Bangi, Selangor",
    coordinates: { lat: 2.959, lng: 101.774 },
    images: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Easygoing pond and lake sessions around Kajang/Bangi—great for birthdays and company outings.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 260,
        duration: "4 hours",
        startTimes: ["09:00", "14:00"],
        maxAnglers: 8,
        private: false,
      },
      {
        name: "Full-Day Trip",
        price: 460,
        duration: "8 hours",
        startTimes: ["09:00"],
        maxAnglers: 8,
        private: false,
      },
    ],
    species: ["Tilapia", "Patin", "Catfish"],
    techniques: ["Float Fishing", "Light Tackle"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      wheelchairAccessible: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Cempaka Pontoon",
      type: "Pontoon Boat",
      length: "20 ft",
      capacity: 10,
      features: ["Railings", "Shade", "Life Jackets"],
    },
  },
  {
    id: 1020,
    name: "Subang Jaya Urban Bass Boat",
    location: "Subang Jaya, Selangor",
    address: "Subang Lakes, 47500 Subang Jaya, Selangor",
    coordinates: { lat: 3.081, lng: 101.585 },
    images: [
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464851707681-f9d5fdaccea8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Light and fast bass boat for quick sessions around Subang—perfect for after-work topwater runs.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 360,
        duration: "4 hours",
        startTimes: ["07:00", "16:00"],
        maxAnglers: 3,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 620,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 3,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Topwater", "Casting"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Subang Skiff",
      type: "Bass Boat",
      length: "16 ft",
      capacity: 4,
      features: ["Trolling Motor", "Casting Deck", "Livewell"],
    },
  },
  {
    id: 1021,
    name: "Ampang Reservoir RIB",
    location: "Ampang Jaya, Selangor",
    address: "Ampang Reservoir, 68000 Ampang Jaya, Selangor",
    coordinates: { lat: 3.161, lng: 101.785 },
    images: [
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520697222860-6c05b12a7b83?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "RIB (rigid inflatable) for quick, stable hops around reservoirs—safe and agile for small groups.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 420,
        duration: "4 hours",
        startTimes: ["07:30", "15:30"],
        maxAnglers: 4,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 700,
        duration: "8 hours",
        startTimes: ["07:30"],
        maxAnglers: 4,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Casting", "Light Tackle"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Ampang RIB 1",
      type: "RIB",
      length: "17 ft",
      capacity: 5,
      features: ["Inflatable Collar", "Front Rails", "Life Jackets"],
    },
  },
  {
    id: 1022,
    name: "Puchong Lakes Pontoon XL",
    location: "Puchong, Selangor",
    address: "Tasik Prima, 47100 Puchong, Selangor",
    coordinates: { lat: 3.027, lng: 101.618 },
    images: [
      "https://images.unsplash.com/photo-1500367215255-0e0b25b396af?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Large pontoon with rails and full shade—great for kids and seniors, ultra-stable for relaxed sessions.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 320,
        duration: "4 hours",
        startTimes: ["09:00", "14:00"],
        maxAnglers: 10,
        private: false,
      },
      {
        name: "Full-Day Trip",
        price: 540,
        duration: "8 hours",
        startTimes: ["09:00"],
        maxAnglers: 10,
        private: false,
      },
    ],
    species: ["Tilapia", "Catfish", "Patin"],
    techniques: ["Float Fishing", "Bread & Dough Baits"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      wheelchairAccessible: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Puchong Pontoon XL",
      type: "Pontoon Boat",
      length: "22 ft",
      capacity: 12,
      features: ["Full Shade", "Railings", "Bench Seating"],
    },
  },
  {
    id: 1023,
    name: "Klang Island-Hopping Cabin Cruiser",
    location: "Klang, Selangor",
    address: "Pulau Ketam Jetty, Klang, Selangor",
    coordinates: { lat: 3.011, lng: 101.278 },
    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Comfortable cabin cruiser with indoor seating and toilet—great for mixed groups and longer day trips.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1300,
        duration: "5 hours",
        startTimes: ["07:30", "13:30"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 2100,
        duration: "9 hours",
        startTimes: ["07:30"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Bottom Fishing", "Jigging", "Squid Jigging"],
    includes: [...BOAT_INCLUDES, "Toilet", "Cabin"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: { available: true, included: true, areas: ["Klang", "Port Klang"] },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Ketam Cruiser",
      type: "Cabin Cruiser",
      length: "27 ft",
      capacity: 10,
      features: ["Cabin", "Toilet", "GPS/Fishfinder", "Shade"],
    },
  },
  {
    id: 1024,
    name: "Teluk Panglima Garang Longboat Fleet",
    location: "Teluk Panglima Garang, Selangor",
    address: "Fishermen Jetty, 42500 Teluk Panglima Garang, Selangor",
    coordinates: { lat: 2.87, lng: 101.519 },
    images: [
      "https://images.unsplash.com/photo-1474314881477-04c4aac40a51?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1514070706115-0a0b42da3f81?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Local-style longboats with sun shade—simple, efficient platforms for mangrove edges and creek mouths.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 450,
        duration: "4 hours",
        startTimes: ["07:00", "14:00"],
        maxAnglers: 6,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 780,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 6,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Light Tackle", "Bottom Fishing"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 60,
      areas: ["Teluk Panglima Garang", "Carey Island"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "TPG Long 1",
      type: "Longboat",
      length: "24 ft",
      capacity: 8,
      features: ["Bimini Shade", "Rod Holders", "Life Jackets"],
    },
  },
  {
    id: 1025,
    name: "Tanjong Karang Coastal Cruiser",
    location: "Tanjong Karang, Selangor",
    address: "Tanjong Karang Jetty, 45500 Tanjong Karang, Selangor",
    coordinates: { lat: 3.427, lng: 101.184 },
    images: [
      "https://images.unsplash.com/photo-1508184964240-ee76b36e3b20?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532619249780-8e3c1b3dfd5f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Coastal cruiser with shade and seating—comfortable family days to nearby islands and reefs.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 880,
        duration: "5 hours",
        startTimes: ["07:30", "13:30"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 1450,
        duration: "9 hours",
        startTimes: ["07:30"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Bottom Fishing", "Light Jigging"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 90,
      areas: ["Tanjong Karang", "Kuala Selangor"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Karang Cruiser",
      type: "Cabin Cruiser",
      length: "26 ft",
      capacity: 10,
      features: ["Cabin", "Shade", "GPS/Fishfinder", "Ice Box"],
    },
  },
  {
    id: 1026,
    name: "Sungai Besar Big Deck Boat",
    location: "Sungai Besar, Selangor",
    address: "Sungai Besar Jetty, 45300 Sungai Besar, Selangor",
    coordinates: { lat: 3.675, lng: 100.988 },
    images: [
      "https://images.unsplash.com/photo-1453491945771-a1e904948959?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1514070706115-0a0b42da3f81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1520975922284-9d6a62a3a67c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Huge open deck with high capacity—company team days and large family groups welcome.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1800,
        duration: "6 hours",
        startTimes: ["07:00"],
        maxAnglers: 12,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 2900,
        duration: "10 hours",
        startTimes: ["07:00"],
        maxAnglers: 12,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Bottom Fishing", "Jigging"],
    includes: [...BOAT_INCLUDES, "Toilet"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 140,
      areas: ["Sungai Besar", "Sekinchan"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Sg Besar Deck XL",
      type: "Open Deck",
      length: "34 ft",
      capacity: 16,
      features: ["Huge Deck", "Toilet", "Shade", "VHF/GPS"],
    },
  },
  {
    id: 1027,
    name: "Petaling Catamaran Party Trip",
    location: "Petaling, Selangor",
    address: "Subang/Petaling Lakes, Selangor",
    coordinates: { lat: 3.055, lng: 101.59 },
    images: [
      "https://images.unsplash.com/photo-1458442310124-dde6edb43d10?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Pontoon-cat hybrid with music system—great for casual fishing socials and team builders around Petaling lakes.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 480,
        duration: "4 hours",
        startTimes: ["10:00", "15:00"],
        maxAnglers: 12,
        private: false,
      },
      {
        name: "Full-Day Trip",
        price: 780,
        duration: "8 hours",
        startTimes: ["10:00"],
        maxAnglers: 12,
        private: false,
      },
    ],
    species: ["Tilapia", "Catfish"],
    techniques: ["Float Fishing"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Petaling PartyCat",
      type: "Pontoon Cat",
      length: "24 ft",
      capacity: 14,
      features: ["Speakers", "Full Shade", "Rails"],
    },
  },
  {
    id: 1028,
    name: "Gombak stream Cabin Skiff",
    location: "Gombak, Selangor",
    address: "Gombak stream Access, 53100 Gombak, Selangor",
    coordinates: { lat: 3.255, lng: 101.737 },
    images: [
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Small skiff with cuddy cabin for rain shelter—comfortable runs into upper stream stretches.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 380,
        duration: "4 hours",
        startTimes: ["07:00", "13:30"],
        maxAnglers: 3,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 640,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 3,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Casting", "Soft Plastics", "Topwater"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Gombak Cuddy",
      type: "Cuddy Skiff",
      length: "16 ft",
      capacity: 4,
      features: ["Cuddy Cabin", "Trolling Motor", "Life Jackets"],
    },
  },
  {
    id: 1029,
    name: "Banting Estuary Walkthrough",
    location: "Banting, Selangor",
    address: "Banting stream Jetty, 42700 Banting, Selangor",
    coordinates: { lat: 2.804, lng: 101.501 },
    images: [
      "https://images.unsplash.com/photo-1514070706115-0a0b42da3f81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532619249780-8e3c1b3dfd5f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508184964240-ee76b36e3b20?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Open walkthrough with easy access bow-to-stern—ideal for drifting the Banting estuary systems.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 520,
        duration: "4 hours",
        startTimes: ["07:00", "14:00"],
        maxAnglers: 6,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 900,
        duration: "8 hours",
        startTimes: ["07:00"],
        maxAnglers: 6,
        private: true,
      },
    ],
    species: SPECIES_MANGROVE,
    techniques: ["Drifting", "Light Tackle"],
    includes: BOAT_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 60,
      areas: ["Banting", "Carey Island"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Banting Walk",
      type: "Walkthrough Open",
      length: "22 ft",
      capacity: 8,
      features: ["Open Layout", "Shade", "Rod Holders"],
    },
  },
  {
    id: 1030,
    name: "Pulau Carey Offshore Pilothouse",
    location: "Carey Island, Selangor",
    address: "Pulau Carey Offshore Ramp, Selangor",
    coordinates: { lat: 2.885, lng: 101.362 },
    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Pilothouse with enclosed helm and forward cabin—comfortable rides to offshore grounds south of Klang.",
    trip: [
      {
        name: "Half-Day Trip",
        price: 1500,
        duration: "6 hours",
        startTimes: ["06:30", "13:00"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Full-Day Trip",
        price: 2400,
        duration: "10 hours",
        startTimes: ["06:30"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Jigging", "Trolling", "Live Bait"],
    includes: [...BOAT_INCLUDES, "Cabin", "Toilet"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: true,
      areas: ["Carey Island", "Port Klang"],
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Carey Pilot 27",
      type: "Pilothouse",
      length: "27 ft",
      capacity: 10,
      features: ["Enclosed Helm", "Cabin", "Toilet", "GPS/Fishfinder"],
    },
  },
  {
    id: 1031,
    name: "Port Klang Night Squid Lights",
    location: "Port Klang, Selangor",
    address: "South Port Jetty, 42000 Port Klang, Selangor",
    coordinates: { lat: 3.002, lng: 101.392 },
    images: [
      "https://images.unsplash.com/photo-1516239325825-7fef83f07afa?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Night-time light jigging mission targeting squid and cuttlefish under the glow of deck lights off Port Klang.",
    trip: [
      {
        name: "Evening Trip",
        price: 780,
        duration: "6 hours",
        startTimes: ["18:00"],
        maxAnglers: 6,
        private: true,
        description:
          "Sunset departure focused on squid jigging around well-known light towers.",
      },
      {
        name: "Overnight Trip",
        price: 1250,
        duration: "10 hours",
        startTimes: ["19:00"],
        maxAnglers: 6,
        private: true,
        description:
          "Longer drift session that adds late-night reef edges for pelagics at first light.",
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Light Jigging", "Eging", "Drifting"],
    includes: [...BOAT_INCLUDES, "Deck Lights"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 70,
      areas: ["Port Klang", "Shah Alam"],
      notes: "Hotel pickups after 17:00 only.",
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: false,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "NightGlow",
      type: "Cabin Cruiser",
      length: "24 ft",
      capacity: 8,
      features: ["Deck Lights", "Toilet", "GPS/Fishfinder", "Livewell"],
    },
  },
  {
    id: 1032,
    name: "Putrajaya Lake Electric Pontoon",
    location: "Putrajaya, Wilayah Persekutuan",
    address: "Marina Putrajaya, Presint 5, Putrajaya",
    coordinates: { lat: 2.916, lng: 101.669 },
    images: [
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519669417670-68775a50919c?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Quiet, electric-powered pontoon sessions across Putrajaya Lake—ideal for corporate retreats and relaxed angling.",
    trip: [
      {
        name: "Morning Trip",
        price: 340,
        duration: "4 hours",
        startTimes: ["08:00"],
        maxAnglers: 8,
        private: false,
        description:
          "Low-noise cruise with light tackle and scenic city views.",
      },
      {
        name: "Sunset Trip",
        price: 360,
        duration: "4 hours",
        startTimes: ["16:30"],
        maxAnglers: 8,
        private: false,
        description: "Golden-hour cruise with optional canapés (pre-order).",
      },
      {
        name: "Full-Day Charter",
        price: 600,
        duration: "8 hours",
        startTimes: ["09:00"],
        maxAnglers: 8,
        private: true,
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Float Fishing", "Light Tackle", "Soft Plastics"],
    includes: [...SHORE_POND_INCLUDES, "Electric Drive"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: {
      available: true,
      included: false,
      fee: 50,
      areas: ["Putrajaya", "Cyberjaya"],
      notes: "Corporate transfers available via partner vans.",
    },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      wheelchairAccessible: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Putrajaya Glide",
      type: "Electric Pontoon",
      length: "22 ft",
      capacity: 10,
      features: ["Electric Motor", "Full Shade", "Railings", "Lounge Seating"],
    },
  },
  {
    id: 1033,
    name: "Sekinchan Deep Reef Runner",
    location: "Sekinchan, Selangor",
    address: "Sekinchan Fishing Jetty, 45400 Sekinchan, Selangor",
    coordinates: { lat: 3.512, lng: 101.102 },
    images: [
      "https://images.unsplash.com/photo-1508182311256-e3f3e78dc8d0?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1458442310124-dde6edb43d10?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "High-powered offshore runs to the deep reefs north of Sekinchan for cobia, snapper and pelagics.",
    trip: [
      {
        name: "Full-Day Trip",
        price: 2600,
        duration: "10 hours",
        startTimes: ["06:00"],
        maxAnglers: 8,
        private: true,
      },
      {
        name: "Overnight Banks",
        price: 3600,
        duration: "16 hours",
        startTimes: ["17:00"],
        maxAnglers: 8,
        private: true,
        description:
          "Run-and-gun itinerary hitting deep banks with night-time jigging rotations.",
      },
    ],
    species: SPECIES_COAST,
    techniques: ["Deep Jigging", "Bottom Fishing", "Trolling"],
    includes: [...BOAT_INCLUDES, "Deckhand"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: true,
    pickup: {
      available: true,
      included: false,
      fee: 150,
      areas: ["Sekinchan", "Kuala Selangor"],
      notes: "Pickup within 30km radius upon request.",
    },
    policies: {
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: false,
      liveBaitProvided: true,
    },
    cancellation: { freeUntilHours: 72, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Reef Runner 32",
      type: "Offshore Sportfisher",
      length: "32 ft",
      capacity: 10,
      features: ["Twin Engines", "Bunk Berths", "Toilet", "Electronics Suite"],
    },
  },
  {
    id: 1034,
    name: "Rawang Highlands Stream Trek",
    location: "Rawang, Selangor",
    address: "Sungai Sendat Trailhead, 48000 Rawang, Selangor",
    coordinates: { lat: 3.417, lng: 101.615 },
    images: [
      "https://images.unsplash.com/photo-1520697222860-6c05b12a7b83?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464851707681-f9d5fdaccea8?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Hike-in stream adventure with ultra-light tackle in the Rawang highlands chasing wild sebarau and toman.",
    trip: [
      {
        name: "Half-Day Trek",
        price: 280,
        duration: "5 hours",
        startTimes: ["07:00"],
        maxAnglers: 2,
        private: true,
        description:
          "Guided wading with instruction on reading pocket water and current seams.",
      },
      {
        name: "Full-Day Expedition",
        price: 480,
        duration: "9 hours",
        startTimes: ["06:30"],
        maxAnglers: 2,
        private: true,
        description:
          "Longer hike accessing remote pools with packed lunch option.",
      },
    ],
    species: SPECIES_JUNGLE,
    techniques: ["Ultra-Light", "Topwater", "Fly Fishing"],
    includes: SHORE_POND_INCLUDES,
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: {
      available: true,
      included: false,
      fee: 80,
      areas: ["Rawang", "Kuala Lumpur"],
      notes: "4x4 transport upgrade available.",
    },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: false,
      smokingAllowed: false,
    },
    cancellation: { freeUntilHours: 48, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Trail Support Jeep",
      type: "Support Vehicle",
      length: "—",
      capacity: 3,
      features: ["4x4 Transport", "Dry Storage", "Portable Cooler"],
    },
  },
  {
    id: 1035,
    name: "Damansara Sunset Pontoon Social",
    location: "Damansara, Selangor",
    address: "The Club Lakeside, Damansara, Selangor",
    coordinates: { lat: 3.141, lng: 101.623 },
    images: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510279770292-4b34de9f5c23?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "Late-afternoon social charter with relaxed float fishing and hosted canapés on a modern pontoon around Damansara.",
    trip: [
      {
        name: "Sunset Social",
        price: 420,
        duration: "3 hours",
        startTimes: ["17:30"],
        maxAnglers: 10,
        private: false,
        description:
          "Shared charter with light tackle, finger food and acoustic playlist.",
      },
      {
        name: "Private Evening",
        price: 720,
        duration: "4 hours",
        startTimes: ["18:00"],
        maxAnglers: 10,
        private: true,
      },
    ],
    species: ["Tilapia", "Catfish", "Rohu"],
    techniques: ["Float Fishing", "Light Tackle"],
    includes: [...SHORE_POND_INCLUDES, "Canapés"],
    excludes: COMMON_EXCLUDES,
    licenseProvided: false,
    pickup: { available: false, included: false },
    policies: {
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      alcoholAllowed: true,
    },
    cancellation: { freeUntilHours: 24, afterPolicy: CXL_AFTER },
    languages: LANG_BM_EN,
    boat: {
      name: "Damansara Drift",
      type: "Pontoon Boat",
      length: "24 ft",
      capacity: 12,
      features: ["Full Shade", "Railings", "Bluetooth Audio", "Lounge Seating"],
    },
  },
];

// -------- Augment + Export --------

// Brand-friendly placeholder avatars (replace with real assets anytime)
const avatar = (id: number) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${id}&backgroundType=gradientLinear`;

// Curated captain profiles per charter
const CAPTAINS: Record<number, Captain> = {
  1001: {
    name: "Capt. Amir Salleh",
    avatarUrl: avatar(1001),
    yearsExperience: 9,
    crewCount: 1,
    intro:
      "stream specialist who grew up fishing the Gombak backwaters. Patient teacher, obsessed with topwater strikes and reading current seams.",
  },
  1002: {
    name: "Capt. Hafiz Rahman",
    avatarUrl: avatar(1002),
    yearsExperience: 7,
    crewCount: 1,
    intro:
      "Freshwater all-rounder who loves getting beginners hooked. Gentle coaching, smart pond/rivulet rotations, and a calm vibe on board.",
  },
  1003: {
    name: "Capt. Farid Azmi",
    avatarUrl: avatar(1003),
    yearsExperience: 11,
    crewCount: 1,
    intro:
      "Jungle casting nut. First on the water, last to leave. Knows the sneaky inlets where peacocks and toman ambush bait.",
  },
  1004: {
    name: "Capt. Kumar",
    avatarUrl: avatar(1004),
    yearsExperience: 12,
    crewCount: 2,
    intro:
      "Inshore structure wizard around Klang. Stays mobile and keeps lines wet—expect steady adjustments to keep the bite alive.",
  },
  1005: {
    name: "Capt. Rizal",
    avatarUrl: avatar(1005),
    yearsExperience: 10,
    crewCount: 2,
    intro:
      "Laid-back estuary pro who runs easy drifts and light jigs—perfect for mixed groups and families.",
  },
  1006: {
    name: "Capt. Daniel Khoo",
    avatarUrl: avatar(1006),
    yearsExperience: 8,
    crewCount: 1,
    intro:
      "Sight-casting enthusiast with a soft spot for barra. Quiet mover in mangroves with precise boat positioning.",
  },
  1007: {
    name: "Coach Irfan",
    avatarUrl: avatar(1007),
    yearsExperience: 6,
    crewCount: 1,
    intro:
      "Pond session coach—great with first-timers and kids. Makes the setup simple and the day stress-free.",
  },
  1008: {
    name: "Capt. Zahir",
    avatarUrl: avatar(1008),
    yearsExperience: 13,
    crewCount: 2,
    intro:
      "Coastal jigging tactician. Runs clean setups and chases current lines for hard-charging trevally.",
  },
  1009: {
    name: "Capt. Rahman",
    avatarUrl: avatar(1009),
    yearsExperience: 9,
    crewCount: 2,
    intro:
      "Sepang inshore veteran—comfortable pace, shade, and consistent trolling passes over productive lanes.",
  },
  1010: {
    name: "Capt. Melissa",
    avatarUrl: avatar(1010),
    yearsExperience: 8,
    crewCount: 2,
    intro:
      "Night-trip specialist with tuned squid lights. Relaxed atmosphere and safe nighttime procedures.",
  },
  1011: {
    name: "Capt. Farhan",
    avatarUrl: avatar(1011),
    yearsExperience: 14,
    crewCount: 3,
    intro:
      "Catamaran offshore leader—space, comfort, and smart drift control for big groups.",
  },
  1012: {
    name: "Capt. Jason",
    avatarUrl: avatar(1012),
    yearsExperience: 12,
    crewCount: 3,
    intro:
      "Sportfisher skipper who lives for long runs and tidy decks. Great boat handling and crew coordination.",
  },
  1013: {
    name: "Capt. Anita",
    avatarUrl: avatar(1013),
    yearsExperience: 7,
    crewCount: 2,
    intro:
      "Carey Island mangrove guide with an eye for family-friendly action and scenic routes.",
  },
  1014: {
    name: "Coach Zarina",
    avatarUrl: avatar(1014),
    yearsExperience: 5,
    crewCount: 1,
    intro:
      "Pontoon facilitator—stable, safe, and geared for easy freshwater fun.",
  },
  1015: {
    name: "Capt. Hadi",
    avatarUrl: avatar(1015),
    yearsExperience: 8,
    crewCount: 1,
    intro:
      "Reservoir walkaround skipper who sets up clean lure lanes and reads shoreline structure.",
  },
  1016: {
    name: "Capt. Faris",
    avatarUrl: avatar(1016),
    yearsExperience: 10,
    crewCount: 2,
    intro:
      "stream deck boat pro—space management, smooth drifts, and family-friendly guidance.",
  },
  1017: {
    name: "Capt. Halim",
    avatarUrl: avatar(1017),
    yearsExperience: 15,
    crewCount: 3,
    intro:
      "Converted trawler captain—huge deck socials with simple, effective bottom rigs.",
  },
  1018: {
    name: "Capt. Desmond",
    avatarUrl: avatar(1018),
    yearsExperience: 11,
    crewCount: 2,
    intro:
      "Twin-engine hunter who covers water fast; mixes jigging and trolling for varied action.",
  },
  1019: {
    name: "Coach Nadia",
    avatarUrl: avatar(1019),
    yearsExperience: 5,
    crewCount: 1,
    intro:
      "Kajang/Bangi lakes facilitator—great for birthdays and casual groups with light tackle.",
  },
  1020: {
    name: "Capt. Ben",
    avatarUrl: avatar(1020),
    yearsExperience: 7,
    crewCount: 1,
    intro:
      "Urban bass-boat runner—quick after-work blasts and topwater moments.",
  },
  1021: {
    name: "Capt. Ariff",
    avatarUrl: avatar(1021),
    yearsExperience: 6,
    crewCount: 1,
    intro:
      "Agile RIB operations around reservoirs—safe, nimble, and efficient.",
  },
  1022: {
    name: "Coach Liyana",
    avatarUrl: avatar(1022),
    yearsExperience: 6,
    crewCount: 1,
    intro:
      "Pontoon XL host—stable platform with rails and full shade; great with kids/seniors.",
  },
  1023: {
    name: "Capt. Gavin",
    avatarUrl: avatar(1023),
    yearsExperience: 12,
    crewCount: 2,
    intro:
      "Cabin cruiser skipper—comfortable island hops and relaxed fishing for mixed groups.",
  },
  1024: {
    name: "Capt. Salleh",
    avatarUrl: avatar(1024),
    yearsExperience: 9,
    crewCount: 2,
    intro:
      "Local longboat operator who knows every creek mouth and tide window.",
  },
  1025: {
    name: "Capt. Haziq",
    avatarUrl: avatar(1025),
    yearsExperience: 10,
    crewCount: 2,
    intro:
      "Coastal family days with shade and simple tactics—stress-free and scenic.",
  },
  1026: {
    name: "Capt. Kelly",
    avatarUrl: avatar(1026),
    yearsExperience: 14,
    crewCount: 3,
    intro:
      "Big-deck logistics expert—corporate groups, tidy safety briefings, and smooth deck flow.",
  },
  1027: {
    name: "Host Mira",
    avatarUrl: avatar(1027),
    yearsExperience: 4,
    crewCount: 2,
    intro:
      "Party-cat facilitator—music, casual fishing, and good vibes around Petaling lakes.",
  },
  1028: {
    name: "Capt. Adrian",
    avatarUrl: avatar(1028),
    yearsExperience: 8,
    crewCount: 1,
    intro:
      "Cabin skiff handler—comfy shelter when drizzle hits, with steady upper-stream runs.",
  },
  1029: {
    name: "Capt. Faiz",
    avatarUrl: avatar(1029),
    yearsExperience: 7,
    crewCount: 2,
    intro:
      "Walkthrough estuary captain—easy movement bow to stern for Banting drifts.",
  },
  1030: {
    name: "Capt. Azhar",
    avatarUrl: avatar(1030),
    yearsExperience: 13,
    crewCount: 3,
    intro:
      "Pilothouse offshore skipper—enclosed helm comfort, efficient reef circuits south of Klang.",
  },
  1031: {
    name: "Capt. Syafiq Noor",
    avatarUrl: avatar(1031),
    yearsExperience: 9,
    crewCount: 2,
    intro:
      "Night-squid specialist who balances light placement and drift angles for steady bites through the dark.",
  },
  1032: {
    name: "Coach Melissa",
    avatarUrl: avatar(1032),
    yearsExperience: 6,
    crewCount: 1,
    intro:
      "Calm freshwater host focused on corporate and family lake days with inclusive coaching for all skills.",
  },
  1033: {
    name: "Capt. Raymond Lim",
    avatarUrl: avatar(1033),
    yearsExperience: 14,
    crewCount: 3,
    intro:
      "Offshore tactician who reads currents and keeps heavy jig rotations organized on busy decks.",
  },
  1034: {
    name: "Guide Hanif",
    avatarUrl: avatar(1034),
    yearsExperience: 8,
    crewCount: 1,
    intro:
      "Highland trek guide with a knack for spotting lies and setting up stealthy casts in skinny water.",
  },
  1035: {
    name: "Host Aida",
    avatarUrl: avatar(1035),
    yearsExperience: 5,
    crewCount: 2,
    intro:
      "Social pontoon facilitator—curates playlists, plating and relaxed fishing flow for lakeside sunsets.",
  },
};

// Fishing type per charter
const FISHING_TYPE: Record<number, FishingType> = {
  1001: "stream",
  1002: "stream",
  1003: "stream",
  1004: "inshore",
  1005: "inshore",
  1006: "inshore",
  1007: "lake",
  1008: "offshore",
  1009: "inshore",
  1010: "inshore",
  1011: "offshore",
  1012: "offshore",
  1013: "inshore",
  1014: "lake",
  1015: "lake",
  1016: "stream",
  1017: "offshore",
  1018: "offshore",
  1019: "lake",
  1020: "lake",
  1021: "lake",
  1022: "lake",
  1023: "inshore",
  1024: "inshore",
  1025: "inshore",
  1026: "offshore",
  1027: "lake",
  1028: "stream",
  1029: "inshore",
  1030: "offshore",
  1031: "inshore",
  1032: "lake",
  1033: "offshore",
  1034: "stream",
  1035: "lake",
};

// Tier per charter
const TIER: Record<number, Tier> = {
  1001: "basic",
  1002: "basic",
  1003: "basic",
  1004: "silver",
  1005: "silver",
  1006: "silver",
  1007: "basic",
  1008: "gold",
  1009: "silver",
  1010: "gold",
  1011: "gold",
  1012: "gold",
  1013: "silver",
  1014: "basic",
  1015: "basic",
  1016: "silver",
  1017: "gold",
  1018: "gold",
  1019: "basic",
  1020: "basic",
  1021: "basic",
  1022: "basic",
  1023: "silver",
  1024: "silver",
  1025: "silver",
  1026: "gold",
  1027: "basic",
  1028: "basic",
  1029: "silver",
  1030: "gold",
  1031: "silver",
  1032: "basic",
  1033: "gold",
  1034: "basic",
  1035: "silver",
};

// Optional meal/drink upgrades (added to includes)
const MEAL_UPGRADES: Record<number, string[]> = {
  // silver
  1004: ["Drinks"],
  1005: ["Drinks", "Snacks"],
  1006: ["Drinks"],
  1009: ["Drinks"],
  1013: ["Drinks", "Snacks"],
  1016: ["Drinks"],
  1023: ["Drinks", "Snacks"],
  1024: ["Drinks"],
  1025: ["Drinks", "Snacks"],
  1029: ["Drinks"],
  1031: ["Drinks"],
  1035: ["Drinks", "Snacks"],

  // gold
  1008: ["Drinks", "Snacks", "Lunch"],
  1010: ["Drinks", "Snacks"],
  1011: ["Drinks", "Snacks", "Lunch"],
  1012: ["Drinks", "Snacks", "Lunch"],
  1017: ["Drinks", "Snacks", "Lunch"],
  1018: ["Drinks", "Snacks", "Lunch"],
  1026: ["Drinks", "Snacks", "Lunch"],
  1030: ["Drinks", "Snacks", "Lunch"],
  1033: ["Drinks", "Snacks", "Lunch"],
};

// Expand to 3–4 paragraphs while reusing existing copy + context
function expandDescription(c: RawCharter): string {
  const p1 = c.description.trim();

  const p2 = `You’ll meet at ${
    c.address
  } and fish around ${c.location.toLowerCase()}. Expect a route tuned to conditions on the day, balancing travel time and time-on-spot to keep lines in the water.`;

  const p3 = `The ${c.boat.type.toLowerCase()} “${c.boat.name}” (${
    c.boat.length
  }, up to ${c.boat.capacity} pax) is set up for ${c.techniques
    .join(", ")
    .toLowerCase()}. On board you’ll find ${c.boat.features
    .join(", ")
    .toLowerCase()}.`;

  const p4 = `Target species typically include ${c.species
    .join(", ")
    .toLowerCase()}. Trips are ${c.trip
    .map((t) => t.name.toLowerCase())
    .join(" / ")} with start times like ${c.trip
    .flatMap((t) => t.startTimes ?? [])
    .slice(0, 3)
    .join(", ")}.`;

  return [p1, p2, p3, p4].join("\n\n");
}

// Build the final array, removing `cancellation` and injecting new fields
const charters: Charter[] = rawCharters.map((c) => {
  const rest = { ...c } as Omit<RawCharter, "cancellation">;
  // Drop the `cancellation` field from the produced objects
  // to match the final Charter type shape.
  const captain = CAPTAINS[c.id];
  const fishingType = FISHING_TYPE[c.id];
  const tier = TIER[c.id];

  // Add meal/drink upgrades where applicable (avoid duplicates)
  const addOns = MEAL_UPGRADES[c.id] ?? [];
  const includes = Array.from(new Set([...(rest.includes || []), ...addOns]));

  return {
    ...rest,
    description: expandDescription(c),
    includes,
    captain,
    fishingType,
    tier,
  };
});

export default charters;
