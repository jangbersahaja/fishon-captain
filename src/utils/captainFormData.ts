export type MalaysiaStateOption = {
  state: string;
  districts: string[];
  coast?: boolean;
};

export const MALAYSIA_LOCATIONS: MalaysiaStateOption[] = [
  {
    state: "Wilayah Persekutuan",
    coast: true,
    districts: ["Kuala Lumpur", "Putrajaya", "Labuan"],
  },
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
      "Baling",
      "Bandar Baharu",
      "Kota Setar",
      "Kubang Pasu",
      "Kulim",
      "Langkawi",
      "Padang Terap",
      "Pendang",
      "Sik",
      "Yan",
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
      "Timur Laut (George Town)",
      "Barat Daya",
      "Seberang Perai Utara",
      "Seberang Perai Tengah",
      "Seberang Perai Selatan",
    ],
  },
  {
    state: "Perak",
    coast: true,
    districts: [
      "Kinta",
      "Larut, Matang & Selama",
      "Manjung",
      "Kerian",
      "Hilir Perak",
      "Kuala Kangsar",
      "Batang Padang",
      "Kampar",
      "Perak Tengah",
      "Muallim",
    ],
  },
  {
    state: "Sabah",
    coast: true,
    districts: [
      "Kota Kinabalu",
      "Sandakan",
      "Tawau",
      "Keningau",
      "Beaufort",
      "Ranau",
      "Semporna",
      "Sipitang",
      "Lahad Datu",
      "Papar",
      "Putatan",
      "Penampang",
      "Kota Belud",
      "Nabawan",
      "Tambunan",
      "Tenom",
      "Kunak",
      "Tongod",
      "Kalabakan",
      "Beluran",
      "Kinabatangan",
      "Kudat",
      "Pitas",
      "Tombulu",
    ],
  },

  {
    state: "Sarawak",
    coast: true,
    districts: ["Kuching", "Miri", "Sibu", "Bintulu", "Limbang", "Sri Aman"],
  },
  {
    state: "Perlis",
    coast: true,
    districts: [
      "Kangar",
      "Kuala Perlis",
      "Arau",
      "Padang Besar",
      "Kaki Bukit",
      "Kayang",
    ],
  },
  {
    state: "Selangor",
    districts: [
      "Gombak",
      "Hulu Langat",
      "Hulu Selangor",
      "Klang",
      "Kuala Langat",
      "Kuala Selangor",
      "Petaling",
      "Sabak Bernam",
      "Sepang",
    ],
  },
  {
    state: "Negeri Sembilan",
    districts: [
      "Jelebu",
      "Jempol",
      "Kuala Pilah",
      "Port Dickson",
      "Rembau",
      "Seremban",
      "Tampin",
    ],
  },
  {
    state: "Terengganu",
    coast: true,
    districts: [
      "Kuala Terengganu",
      "Dungun",
      "Hulu Terengganu",
      "Kemaman",
      "Marang",
      "Setiu",
    ],
  },
  {
    state: "Kelantan",
    coast: true,
    districts: [
      "Bachok",
      "Gua Musang",
      "Jeli",
      "Kota Bharu",
      "Kuala Krai",
      "Machang",
      "Pasir Mas",
      "Pasir Puteh",
      "Tanah Merah",
      "Tumpat",
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
  "Bottom",
  "Casting",
  "Deep Sea Fishing",
  "Drift Fishing",
  "Jigging",
  "Eging",
  "Fly Fishing",
  "Jigging",
  "Prawn Fishing",
  "Trolling",
];

export const AMENITIES_OPTIONS = [
  "Bait & lures",
  "Rods, reels & tackle",
  "Snacks",
  "Light drinks",
  "Lunch",
  "Life jackets",
];

export const BOAT_FEATURE_OPTIONS = [
  "GPS",
  "Fishfinder",
  "Cabin",
  "Toilet",
  "Ice box",
  "Trolling motor",
  "Livewell",
  "Cooler",
  "Sound system",
  "Hardtop",
  "Casting deck",
  "Shade",
  "Rod holders",
  "Underwater lights",
];

export const BOAT_TYPES = [
  "Joan Boat",
  "Pontoon",
  "Center Console",
  "Cabin Cruiser",
  "Longboat",
  "Catamaran",
  "Skiff",
  "Traditional Wooden",
  "Yacht",
  "Other",
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
