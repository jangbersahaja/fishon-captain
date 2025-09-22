import type { Charter } from "@/dummy/charter";

export default function SpeciesTechniquesCard({
  charter,
}: {
  charter: Charter;
}) {
  const hasSpecies =
    Array.isArray(charter.species) && charter.species.length > 0;
  const hasTech =
    Array.isArray(charter.techniques) && charter.techniques.length > 0;
  if (!hasSpecies && !hasTech) return null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {hasSpecies && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">Target species</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {charter.species.map((s) => (
              <span
                key={s}
                className="rounded-full border border-black/10 bg-gray-50 px-2 py-1"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasTech && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">Techniques</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {charter.techniques.map((t) => (
              <span
                key={t}
                className="rounded-full border border-black/10 bg-gray-50 px-2 py-1"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
