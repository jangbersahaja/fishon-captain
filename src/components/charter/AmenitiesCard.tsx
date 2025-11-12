import type { Charter } from "@/dummy/charter";
import { AMENITIES_OPTIONS } from "@/utils/captainFormData";
// Switch to phosphor-react for broader icon coverage
import {
  AmenityDefaultIcon,
  DrinksIcon,
  LifeJacketIcon,
  LiveBaitIcon,
  LureIcon,
  MealsIcon,
  RodReelIcon,
  SnacksIcon,
  TerminalTackleIcon,
} from "@/components/icons/AmenityCustomIcons";

export default function AmenitiesCard({ charter }: { charter: Charter }) {
  // Use only the canonical AMENITIES_OPTIONS list, in order
  const charterIncludes = Array.isArray(charter.includes)
    ? charter.includes.map((a) => a.toLowerCase())
    : [];

  const included = AMENITIES_OPTIONS.filter((a) =>
    charterIncludes.includes(a.label.toLowerCase())
  );

  if (included.length === 0) return null;

  function getAmenityIcon(label: string) {
    const l = label.toLowerCase();
    if (l.includes("live bait")) return <LiveBaitIcon />;
    if (l.includes("lures")) return <LureIcon />;
    if (l.includes("rod") || l.includes("reel")) return <RodReelIcon />;
    if (l.includes("terminal tackle")) return <TerminalTackleIcon />;
    if (l.includes("snack")) return <SnacksIcon />;
    if (l.includes("drinks")) return <DrinksIcon />;
    if (l.includes("meals")) return <MealsIcon />;
    if (l.includes("life jacket")) return <LifeJacketIcon />;
    return <AmenityDefaultIcon />;
  }

  return (
    <section className="p-5 mt-6 bg-white border rounded-2xl border-black/10 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold sm:text-lg">Amenities</h3>
        <p className="text-xs text-gray-500 sm:text-sm">
          {included.length} included
        </p>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-gray-700">Included</h4>
        <ul className="grid grid-cols-2 mt-2 text-sm text-gray-800 gap-x-4 gap-y-4 sm:grid-cols-2">
          {included.map((label) => (
            <li key={`inc-${label.key}`} className="flex items-center gap-3">
              {getAmenityIcon(label.label)}
              <span>{label.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
