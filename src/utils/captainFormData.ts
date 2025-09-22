export type MalaysiaStateOption = {
  state: string;
  districts: string[];
  coast?: boolean;
};

export const MALAYSIA_LOCATIONS: MalaysiaStateOption[] = [
  {
    state: "Johor",
    coast: true,
    districts: [
      "Batu Pahat",
      "Johor Bahru",
      "Kluang",
      "Kota Tinggi",
      "Kulai",
      "Mersing",
      "Muar",
      "Pontian",
      "Segamat",
      "Tangkak",
    ],
  },
  {
    state: "Kedah",
    coast: true,
    districts: [
      "Langkawi",
      "Kuala Kedah",
      "Kulim",
      "Padang Terap",
      "Kubang Pasu",
      "Baling",
    ],
  },
  {
    state: "Melaka",
    coast: true,
    districts: ["Melaka Tengah", "Alor Gajah", "Jasin"],
  },
  {
    state: "Pahang",
    coast: true,
    districts: [
      "Kuantan",
      "Pekan",
      "Rompin",
      "Temerloh",
      "Jerantut",
      "Cameron Highlands",
    ],
  },
  {
    state: "Penang",
    coast: true,
    districts: [
      "Timur Laut",
      "Barat Daya",
      "Seberang Perai Utara",
      "Seberang Perai Selatan",
    ],
  },
  {
    state: "Perak",
    coast: true,
    districts: [
      "Manjung",
      "Kuala Kangsar",
      "Larut Matang",
      "Hulu Perak",
      "Kampar",
      "Kinta",
    ],
  },
  {
    state: "Sabah",
    coast: true,
    districts: [
      "Kota Kinabalu",
      "Sandakan",
      "Kudat",
      "Semporna",
      "Kota Belud",
      "Tawau",
    ],
  },
  {
    state: "Sarawak",
    coast: true,
    districts: ["Kuching", "Miri", "Bintulu", "Sibu", "Mukah", "Limbang"],
  },
  {
    state: "Selangor",
    districts: [
      "Gombak",
      "Hulu Langat",
      "Petaling",
      "Sepang",
      "Kuala Selangor",
      "Klang",
    ],
  },
  {
    state: "Terengganu",
    coast: true,
    districts: [
      "Kuala Terengganu",
      "Kemaman",
      "Besut",
      "Dungun",
      "Marang",
      "Setiu",
    ],
  },
];

export const CHARTER_TYPES = [
  { value: "lake", label: "Lake" },
  { value: "stream", label: "Stream & River" },
  { value: "inshore", label: "Inshore / Mangrove" },
  { value: "offshore", label: "Offshore / Bluewater" },
];

export const SPECIES_OPTIONS = [
  "Barramundi",
  "Mangrove Jack",
  "Grouper",
  "Trevally",
  "Queenfish",
  "Cobia",
  "Snapper",
  "Squid",
  "Peacock Bass",
  "Toman (Giant Snakehead)",
  "Sebarau",
  "Sailfish",
  "Patin",
  "Catfish",
  "Rohu",
  "Tilapia",
  "Mud Crab",
  "Barracuda",
  "Spanish Mackerel",
  "Giant Grouper",
];

export const TECHNIQUE_OPTIONS = [
  "Light Tackle",
  "Heavy Tackle",
  "Jigging",
  "Popping",
  "Fly Fishing",
  "Bottom Fishing",
  "Drift Fishing",
  "Trolling",
  "Casting",
  "Live Baiting",
  "Spearfishing",
];

export const AMENITIES_OPTIONS = [
  "Live bait",
  "Ice box",
  "Rods, reels & tackle",
  "Bait & lures",
  "Snacks",
  "Light drinks",
  "Lunch",
  "Crew & guide",
  "Fuel",
  "Safety gear",
  "Licenses",
];

export const BOAT_FEATURE_OPTIONS = [
  "GPS",
  "Fishfinder",
  "Cabin",
  "Toilet",
  "Trolling motor",
  "Livewell",
  "Cooler",
  "Sound system",
  "Hardtop",
  "Casting deck",
];

export const BOAT_TYPES = [
  "Center Console",
  "Cabin Cruiser",
  "Longboat",
  "Pontoon",
  "Catamaran",
  "Skiff",
  "Traditional Wooden",
];

export const TRIP_TYPE_OPTIONS = [
  { value: "Half-Day Trip", label: "Half-Day Trip" },
  { value: "Full Day Trip", label: "Full Day Trip" },
  { value: "Night Trip", label: "Night Trip" },
  { value: "Multiple Day Trip", label: "Custom · Multi-Day" },
];

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
    )
    .join(" ");
}
