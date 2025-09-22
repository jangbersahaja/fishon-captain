import type { Charter } from "@/dummy/charter";
import {
  Check,
  Droplet,
  Fish,
  LifeBuoy,
  Radio,
  Satellite,
  Shield,
  Ship,
  ShowerHead,
  Snowflake,
  Umbrella,
  User,
  Utensils,
  X,
} from "lucide-react";

const BRAND = "#ec2227";

/** Canonical amenity keys to help dedupe & show consistent labels */
type CanonicalKey =
  | "drinks"
  | "meals"
  | "tackle"
  | "live-bait"
  | "life-jackets"
  | "safety-gear"
  | "ice-box"
  | "skipper"
  | "fuel"
  | "toilet"
  | "shade"
  | "gps-fishfinder"
  | "radio"
  | "boat-generic"
  | "other";

/** Normalize varied strings -> canonical key + display label */
function normalizeAmenity(raw: string): {
  key: CanonicalKey;
  label: string;
  raw: string;
} {
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  // Drinks / water
  if (/(bottled\s*water|drinks?|water)/i.test(lower)) {
    return { key: "drinks", label: "Drinks / Bottled water", raw: s };
  }
  // Meals
  if (/(meals?|lunch|snack)/i.test(lower)) {
    return { key: "meals", label: "Meals (snacks & lunch)", raw: s };
  }
  // Tackle / gear / rods / reels / bait (non-live handled by tackle)
  if (/(tackle|gear|rods?|reels?|fishing\s*gear)/i.test(lower)) {
    return { key: "tackle", label: "Rods, reels & tackle", raw: s };
  }
  // Live bait
  if (/(live\s*bait)/i.test(lower)) {
    return { key: "live-bait", label: "Live bait", raw: s };
  }
  // Life jackets
  if (/(life\s*jackets?)/i.test(lower)) {
    return { key: "life-jackets", label: "Life jackets", raw: s };
  }
  // Safety gear (keep separate from life jackets)
  if (/(safety\s*gear|first\s*aid)/i.test(lower)) {
    return { key: "safety-gear", label: "Safety gear", raw: s };
  }
  // Ice box / cooler
  if (/(ice\s*box|cooler|icebox)/i.test(lower)) {
    return { key: "ice-box", label: "Ice box", raw: s };
  }
  // Skipper / captain / crew (as included amenity)
  if (/(skipper|captain)/i.test(lower)) {
    return { key: "skipper", label: "Skipper / Captain", raw: s };
  }
  // Fuel
  if (/fuel/i.test(lower)) {
    return { key: "fuel", label: "Fuel", raw: s };
  }
  // Toilet / head
  if (/(toilet|head\b)/i.test(lower)) {
    return { key: "toilet", label: "Toilet", raw: s };
  }
  // Shade / bimini / canopy
  if (/(bimini|shade|canopy)/i.test(lower)) {
    return { key: "shade", label: "Shade / Bimini", raw: s };
  }
  // GPS / Fishfinder / sonar
  if (/(gps|fish\s*finder|fishfinder|sonar)/i.test(lower)) {
    return { key: "gps-fishfinder", label: "GPS / Fishfinder", raw: s };
  }
  // VHF / Radio
  if (/(vhf|radio)/i.test(lower)) {
    return { key: "radio", label: "VHF / Radio", raw: s };
  }
  // Boat generic features as fallback
  if (/(boat|deck|panga|center\s*console|cabin|catamaran)/i.test(lower)) {
    return { key: "boat-generic", label: s, raw: s };
  }

  return { key: "other", label: s, raw: s };
}

function IconIncluded({ k }: { k: CanonicalKey }) {
  switch (k) {
    case "drinks":
      return <Droplet color={BRAND} size={16} />;
    case "meals":
      return <Utensils color={BRAND} size={16} />;
    case "tackle":
    case "live-bait":
      return <Fish color={BRAND} size={16} />;
    case "life-jackets":
      return <LifeBuoy color={BRAND} size={16} />;
    case "safety-gear":
      return <Shield color={BRAND} size={16} />;
    case "ice-box":
      return <Snowflake color={BRAND} size={16} />;
    case "skipper":
      return <User color={BRAND} size={16} />;
    case "fuel":
    case "boat-generic":
      return <Ship color={BRAND} size={16} />;
    case "toilet":
      return <ShowerHead color={BRAND} size={16} />;
    case "shade":
      return <Umbrella color={BRAND} size={16} />;
    case "gps-fishfinder":
      return <Satellite color={BRAND} size={16} />;
    case "radio":
      return <Radio color={BRAND} size={16} />;
    default:
      return <Check color={BRAND} size={16} />;
  }
}

function IconExcluded({ k }: { k: CanonicalKey }) {
  switch (k) {
    case "drinks":
      return <Droplet color={BRAND} size={16} />;
    case "meals":
      return <Utensils color={BRAND} size={16} />;
    case "tackle":
    case "live-bait":
      return <Fish color={BRAND} size={16} />;
    case "life-jackets":
      return <LifeBuoy color={BRAND} size={16} />;
    case "safety-gear":
      return <Shield color={BRAND} size={16} />;
    case "ice-box":
      return <Snowflake color={BRAND} size={16} />;
    case "skipper":
      return <User color={BRAND} size={16} />;
    case "fuel":
    case "boat-generic":
      return <Ship color={BRAND} size={16} />;
    case "toilet":
      return <ShowerHead color={BRAND} size={16} />;
    case "shade":
      return <Umbrella color={BRAND} size={16} />;
    case "gps-fishfinder":
      return <Satellite color={BRAND} size={16} />;
    case "radio":
      return <Radio color={BRAND} size={16} />;
    default:
      return <X color={BRAND} size={16} />;
  }
}

export default function AmenitiesCard({ charter }: { charter: Charter }) {
  const hasInc = Array.isArray(charter.includes) && charter.includes.length > 0;
  const hasExc = Array.isArray(charter.excludes) && charter.excludes.length > 0;
  if (!hasInc && !hasExc) return null;

  // 1) Normalize both lists to canonical keys, keep raw for simple tooltips
  const incPairs = (hasInc ? charter.includes : []).map((i) =>
    normalizeAmenity(i)
  );
  const excPairs = (hasExc ? charter.excludes : []).map((e) =>
    normalizeAmenity(e)
  );

  // 2) Build maps with precedence: if something appears both included & excluded, keep INCLUDED
  const map = new Map<
    CanonicalKey,
    { label: string; included: boolean; raws: Set<string> }
  >();

  for (const p of excPairs) {
    if (!map.has(p.key)) {
      map.set(p.key, {
        label: p.label,
        included: false,
        raws: new Set([p.raw]),
      });
    } else {
      map.get(p.key)!.raws.add(p.raw);
    }
  }
  for (const p of incPairs) {
    if (!map.has(p.key)) {
      map.set(p.key, {
        label: p.label,
        included: true,
        raws: new Set([p.raw]),
      });
    } else {
      // Included takes precedence
      const node = map.get(p.key)!;
      node.included = true;
      node.label = p.label;
      node.raws.add(p.raw);
    }
  }

  // 3) Split back into arrays, stable sort by label
  const included = Array.from(map.entries())
    .filter(([, v]) => v.included)
    .map(([k, v]) => ({
      key: k as CanonicalKey,
      label: v.label,
      tooltip: Array.from(v.raws).join(", "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const excluded = Array.from(map.entries())
    .filter(([, v]) => !v.included)
    .map(([k, v]) => ({
      key: k as CanonicalKey,
      label: v.label,
      tooltip: Array.from(v.raws).join(", "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (included.length === 0 && excluded.length === 0) return null;

  const incCount = included.length;
  const excCount = excluded.length;

  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold sm:text-lg">Amenities</h3>
        <p className="text-xs text-gray-500 sm:text-sm">
          {incCount} included{excCount ? ` • ${excCount} not included` : ""}
        </p>
      </div>

      {/* Included — on top */}
      {incCount > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-700">Included</h4>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800 sm:grid-cols-2">
            {included.map(({ key, label, tooltip }) => (
              <li
                key={`inc-${key}`}
                className="flex items-center gap-2"
                title={tooltip}
              >
                <IconIncluded k={key} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Not included — at bottom */}
      {excCount > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700">Not included</h4>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800 sm:grid-cols-2">
            {excluded.map(({ key, label, tooltip }) => (
              <li
                key={`exc-${key}`}
                className="flex items-center gap-2"
                title={tooltip}
              >
                <IconExcluded k={key} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
