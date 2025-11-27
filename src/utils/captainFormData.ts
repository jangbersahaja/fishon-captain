export type MalaysiaStateOption = {
  state: string;
  city: string[];
  coast?: boolean;
};

/**
 * Malaysian state and city/town options for charter registration.
 *
 * Cities are organized at the town level (not district level) for granular
 * location selection. This allows captains to specify their exact location
 * (e.g., "Port Klang" instead of just "Klang").
 *
 * The city-district-mapping.ts in fishon-market maps these city names
 * to their parent districts for image lookups.
 */
export const MALAYSIA_LOCATIONS: MalaysiaStateOption[] = [
  {
    state: "Kuala Lumpur",
    coast: false,
    city: ["Kuala Lumpur"],
  },
  {
    state: "Putrajaya",
    coast: false,
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
      // Batu Pahat District
      "Batu Pahat",
      "Yong Peng",
      "Parit Raja",
      // Johor Bahru District
      "Johor Bahru",
      "Iskandar Puteri",
      "Pasir Gudang",
      "Skudai",
      "Gelang Patah",
      "Ulu Tiram",
      "Masai",
      // Kluang District
      "Kluang",
      "Simpang Renggam",
      // Kota Tinggi District
      "Kota Tinggi",
      "Pengerang",
      "Desaru",
      // Kulai District
      "Kulai",
      "Senai",
      // Mersing District
      "Mersing",
      "Endau",
      // Muar District
      "Muar",
      "Pagoh",
      "Bakri",
      // Pontian District
      "Pontian",
      "Kukup",
      "Pekan Nenas",
      // Segamat District
      "Segamat",
      "Labis",
      // Tangkak District
      "Tangkak",
    ],
  },
  {
    state: "Kedah",
    coast: true,
    city: [
      // Kota Setar District
      "Alor Setar",
      "Kuala Kedah",
      // Kuala Muda District
      "Sungai Petani",
      "Bedong",
      "Gurun",
      // Kulim District
      "Kulim",
      "Lunas",
      // Kubang Pasu District
      "Jitra",
      "Changlun",
      // Langkawi District
      "Langkawi",
      "Kuah",
      "Pantai Cenang",
      // Baling District
      "Baling",
      // Bandar Baharu District
      "Bandar Baharu",
      // Padang Terap District
      "Kuala Nerang",
      // Pendang District
      "Pendang",
      // Sik District
      "Sik",
      // Yan District
      "Yan",
    ],
  },
  {
    state: "Kelantan",
    coast: true,
    city: [
      // Kota Bharu District
      "Kota Bharu",
      "Kubang Kerian",
      "Pengkalan Chepa",
      // Pasir Mas District
      "Pasir Mas",
      "Rantau Panjang",
      // Gua Musang District
      "Gua Musang",
      // Jeli District
      "Jeli",
      // Kuala Krai District
      "Kuala Krai",
      "Dabong",
      // Machang District
      "Machang",
      // Pasir Puteh District
      "Pasir Puteh",
      // Tanah Merah District
      "Tanah Merah",
      // Tumpat District
      "Tumpat",
      // Bachok District
      "Bachok",
    ],
  },
  {
    state: "Melaka",
    coast: true,
    city: [
      // Melaka Tengah District
      "Melaka",
      "Ayer Keroh",
      "Batu Berendam",
      "Klebang",
      "Tanjung Kling",
      // Alor Gajah District
      "Alor Gajah",
      "Masjid Tanah",
      // Jasin District
      "Jasin",
      "Merlimau",
    ],
  },
  {
    state: "Negeri Sembilan",
    coast: true,
    city: [
      // Seremban District
      "Seremban",
      "Senawang",
      "Nilai",
      // Port Dickson District
      "Port Dickson",
      "Teluk Kemang",
      "Lukut",
      // Kuala Pilah District
      "Kuala Pilah",
      // Jelebu District
      "Jelebu",
      "Kuala Klawang",
      // Rembau District
      "Rembau",
      // Tampin District
      "Tampin",
      "Gemas",
      // Jempol District
      "Bahau",
    ],
  },
  {
    state: "Pahang",
    coast: true,
    city: [
      // Kuantan District
      "Kuantan",
      "Gambang",
      "Balok",
      "Beserah",
      "Sungai Lembing",
      // Pekan District
      "Pekan",
      "Nenasi",
      // Rompin District
      "Rompin",
      "Kuala Rompin",
      "Tioman",
      // Temerloh District
      "Temerloh",
      "Mentakab",
      // Jerantut District
      "Jerantut",
      // Bentong District
      "Bentong",
      "Karak",
      // Cameron Highlands District
      "Cameron Highlands",
      "Tanah Rata",
      "Brinchang",
      // Raub District
      "Raub",
      // Lipis District
      "Kuala Lipis",
      // Maran District
      "Maran",
      "Jengka",
      // Bera District
      "Bera",
    ],
  },
  {
    state: "Penang",
    coast: true,
    city: [
      // Northeast Penang Island District
      "George Town",
      "Tanjung Tokong",
      "Tanjung Bungah",
      "Batu Ferringhi",
      "Teluk Bahang",
      "Air Itam",
      "Jelutong",
      // Southwest Penang Island District
      "Bayan Lepas",
      "Balik Pulau",
      "Teluk Kumbar",
      "Batu Maung",
      // Central Seberang Perai District
      "Bukit Mertajam",
      "Seberang Jaya",
      "Batu Kawan",
      "Permatang Pauh",
      // North Seberang Perai District
      "Butterworth",
      "Perai",
      "Kepala Batas",
      // South Seberang Perai District
      "Nibong Tebal",
      "Sungai Jawi",
    ],
  },
  {
    state: "Perak",
    coast: true,
    city: [
      // Kinta District
      "Ipoh",
      "Batu Gajah",
      "Gopeng",
      "Tanjung Rambutan",
      // Larut, Matang and Selama District
      "Taiping",
      "Kamunting",
      "Kuala Sepetang",
      // Manjung District
      "Lumut",
      "Sitiawan",
      "Seri Manjung",
      "Pangkor",
      // Hilir Perak District
      "Teluk Intan",
      "Bagan Datoh",
      // Kuala Kangsar District
      "Kuala Kangsar",
      // Kampar District
      "Kampar",
      // Batang Padang District
      "Tapah",
      "Bidor",
      // Hulu Perak District
      "Gerik",
      "Lenggong",
      // Kerian District
      "Parit Buntar",
      "Bagan Serai",
      // Perak Tengah District
      "Seri Iskandar",
      // Muallim District
      "Tanjung Malim",
      "Slim River",
    ],
  },
  {
    state: "Perlis",
    coast: true,
    city: ["Kangar", "Arau", "Kuala Perlis", "Padang Besar", "Kaki Bukit"],
  },
  {
    state: "Sabah",
    coast: true,
    city: [
      // Kota Kinabalu District
      "Kota Kinabalu",
      "Inanam",
      "Likas",
      "Menggatal",
      "Tanjung Aru",
      // Sandakan District
      "Sandakan",
      // Tawau District
      "Tawau",
      // Lahad Datu District
      "Lahad Datu",
      // Keningau District
      "Keningau",
      // Beaufort District
      "Beaufort",
      "Kuala Penyu",
      // Kota Belud District
      "Kota Belud",
      // Papar District
      "Papar",
      "Kinarut",
      // Penampang District
      "Penampang",
      "Donggongon",
      // Ranau District
      "Ranau",
      "Kundasang",
      // Tuaran District
      "Tuaran",
      "Tamparuli",
      // Kudat District
      "Kudat",
      // Semporna District
      "Semporna",
      // Kunak District
      "Kunak",
      // Putatan District
      "Putatan",
      // Tenom District
      "Tenom",
      // Tambunan District
      "Tambunan",
      // Sipitang District
      "Sipitang",
      // Kota Marudu District
      "Kota Marudu",
      // Beluran District
      "Beluran",
      "Telupid",
      // Tongod District
      "Tongod",
      // Nabawan District
      "Nabawan",
      // Kinabatangan District
      "Kinabatangan",
      // Pitas District
      "Pitas",
    ],
  },
  {
    state: "Sarawak",
    coast: true,
    city: [
      // Kuching District
      "Kuching",
      "Bau",
      "Lundu",
      // Miri District
      "Miri",
      "Niah",
      "Bekenu",
      // Sibu District
      "Sibu",
      "Kanowit",
      // Bintulu District
      "Bintulu",
      "Tatau",
      // Limbang District
      "Limbang",
      // Sarikei District
      "Sarikei",
      "Bintangor",
      // Sri Aman District
      "Sri Aman",
      // Kapit District
      "Kapit",
      "Song",
      "Belaga",
      // Mukah District
      "Mukah",
      "Dalat",
      // Betong District
      "Betong",
      "Saratok",
      // Lawas District
      "Lawas",
      // Marudi District
      "Marudi",
      // Serian District
      "Serian",
      // Samarahan District
      "Samarahan",
      "Kota Samarahan",
    ],
  },
  {
    state: "Selangor",
    coast: true,
    city: [
      // Petaling District - Major towns
      "Petaling Jaya",
      "Shah Alam",
      "Subang Jaya",
      "Puchong",
      "Seri Kembangan",
      "Kelana Jaya",
      "Damansara",
      "Kota Damansara",
      "USJ",
      // Klang District
      "Klang",
      "Port Klang",
      "Kapar",
      "Meru",
      // Hulu Langat District
      "Kajang",
      "Ampang",
      "Cheras",
      "Bangi",
      "Semenyih",
      "Balakong",
      // Gombak District
      "Gombak",
      "Selayang",
      "Batu Caves",
      "Rawang",
      "Setapak",
      // Hulu Selangor District
      "Hulu Selangor",
      "Kuala Kubu Bharu",
      "Batang Kali",
      // Kuala Selangor District
      "Kuala Selangor",
      "Tanjung Karang",
      "Sekinchan",
      // Kuala Langat District
      "Banting",
      "Morib",
      "Tanjung Sepat",
      "Jenjarom",
      // Sabak Bernam District
      "Sabak Bernam",
      "Sungai Besar",
      // Sepang District
      "Sepang",
      "Cyberjaya",
      "Salak Tinggi",
    ],
  },
  {
    state: "Terengganu",
    coast: true,
    city: [
      // Kuala Terengganu District
      "Kuala Terengganu",
      "Chendering",
      // Kemaman District
      "Kemaman",
      "Chukai",
      "Kerteh",
      "Paka",
      "Kijal",
      // Dungun District
      "Dungun",
      "Kuala Dungun",
      // Marang District
      "Marang",
      "Rusila",
      // Hulu Terengganu District
      "Kuala Berang",
      "Tasik Kenyir",
      // Besut District
      "Jerteh",
      "Kuala Besut",
      "Kampung Raja",
      // Setiu District
      "Setiu",
      "Bandar Permaisuri",
      "Penarik",
      // Kuala Nerus District
      "Kuala Nerus",
      "Batu Rakit",
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
