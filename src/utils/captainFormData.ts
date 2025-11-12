export type MalaysiaStateOption = {
  state: string;
  city: string[];
  coast?: boolean;
};

export const MALAYSIA_LOCATIONS: MalaysiaStateOption[] = [
  {
    state: "Kuala Lumpur",
    coast: true,
    city: ["Kuala Lumpur"],
  },
  {
    state: "Putrajaya",
    coast: true,
    city: ["Putrajaya"],
  },
  {
    state: "Labuan",
    coast: true,
    city: ["Labuan"],
  },
  {
    state: "Johor",
    coast: true,
    city: [
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
    city: [
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
    city: ["Melaka Tengah", "Alor Gajah", "Jasin"],
  },
  {
    state: "Pahang",
    coast: true,
    city: [
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
    city: [
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
    city: [
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
    city: [
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
    city: ["Kuching", "Miri", "Sibu", "Bintulu", "Limbang", "Sri Aman"],
  },
  {
    state: "Perlis",
    coast: true,
    city: [
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
    city: [
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
    city: [
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
    city: [
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
    city: [
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
  { value: "lake", label: "Lake / Dam" },
  { value: "stream", label: "Stream" },
  { value: "inshore", label: "Inshore / Island" },
  { value: "offshore", label: "Offshore / Deepsea" },
  { value: "jungle", label: "Jungle / Waterfall" },
];

export const TECHNIQUE_OPTIONS = [
  { key: "bottom_fishing", label: "Bottom Fishing" },
  { key: "casting", label: "Casting" },
  { key: "deep_sea_fishing", label: "Deep Sea Fishing" },
  { key: "drift_fishing", label: "Drift Fishing" },
  { key: "jigging", label: "Jigging" },
  { key: "eging", label: "Eging" },
  { key: "fly_fishing", label: "Fly Fishing" },
  { key: "prawn_fishing", label: "Prawn Fishing" },
  { key: "trolling", label: "Trolling" },
  { key: "apollo", label: "Apollo" },
];

export const AMENITIES_OPTIONS = [
  { key: "live_bait", label: "Live bait", labelMy: "Umpan Hidup" },
  { key: "lures", label: "Lures", labelMy: "Umpan Tiruan" },
  { key: "rod_reel", label: "Rod & reel", labelMy: "Rod & Reel" },
  {
    key: "terminal_tackle",
    label: "Terminal Tackle",
    labelMy: "Terminal Tackle",
  },
  { key: "snacks", label: "Snacks", labelMy: "Makanan Ringan" },
  { key: "drinks", label: "Drinks", labelMy: "Minuman" },
  { key: "meals", label: "Meals", labelMy: "Lunch/Dinner" },
  { key: "life_jackets", label: "Life jackets", labelMy: "Jaket Keselamatan" },
];

export const BOAT_FEATURE_OPTIONS = [
  { key: "gps", label: "GPS", labelMy: "GPS" },
  { key: "fishfinder", label: "Fishfinder", labelMy: "Fishfinder" },
  { key: "toilet", label: "Toilet", labelMy: "Tandas" },
  { key: "ice_box", label: "Ice Box", labelMy: "Kotak Ais" },
  {
    key: "trolling_motor",
    label: "Trolling Motor",
    labelMy: "Throlling Motor",
  },
  { key: "sound_system", label: "Sound System", labelMy: "Sistem Bunyi" },
  {
    key: "thruster",
    label: "Thruster",
    labelMy: "Thruster",
  },
  { key: "kitchen", label: "Kitchen", labelMy: "Dapur" },
  { key: "dorm", label: "Dorm", labelMy: "Dorm" },
  { key: "rod_holders", label: "Rod Holders", labelMy: "Pemegang Rod" },
  {
    key: "air_conditioning",
    label: "Air Conditioning",
    labelMy: "Penyaman Udara",
  },
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
  "Inflatable",
];

export const TRIP_TYPE_OPTIONS = [
  { value: "Half-Day Trip", label: "Half-Day Trip" },
  { value: "Full Day Trip", label: "Full Day Trip" },
  { value: "Overnight Trip", label: "Overnight Trip" },
  { value: "Custom", label: "Custom" },
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
