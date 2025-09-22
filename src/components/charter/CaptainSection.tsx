import type { Charter } from "@/dummy/charter";

export default function CaptainSection({ charter }: { charter: Charter }) {
  if (!charter.captain) return null;
  const c = charter.captain;
  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">Charter Operator</h3>
      <div className="mt-3 flex items-start gap-4 flex-col lg:flex-row">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.avatarUrl || "/images/captain.svg"}
            alt={c.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="text-base font-semibold">{c.name}</h4>
            <span className="text-xs text-gray-500">
              {c.yearsExperience} yrs experience • {c.crewCount} crew
            </span>
          </div>
          {c.intro && (
            <p className="mt-2 text-sm leading-6 text-gray-700">{c.intro}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2.5 py-1">
              {charter.location}
            </span>
            {charter.fishingType && (
              <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2.5 py-1 capitalize">
                {charter.fishingType} fishing
              </span>
            )}
            {charter.boat?.name && (
              <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2.5 py-1">
                Boat: {charter.boat.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
