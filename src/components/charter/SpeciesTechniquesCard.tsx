import type { Charter } from "@/dummy/charter";
import { SPECIES_BY_ID } from "@/lib/data/species";
import { SpeciesPills } from "./SpeciesPills";

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
    <div className="mt-6 grid grid-cols-1 gap-4">
      {hasSpecies && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">Target species</h3>
          <SpeciesPills
            className="mt-2"
            items={charter.species.map((english) => {
              const item = Object.values(SPECIES_BY_ID).find(
                (sp) => sp.english_name === english
              );
              if (!item)
                return {
                  label: english,
                };
              const imageSrc =
                typeof item.image === "object" &&
                item.image &&
                "src" in (item.image as Record<string, unknown>)
                  ? (item.image as { src?: string }).src
                  : (item.image as string | undefined) || undefined;
              return {
                id: item.id,
                english: item.english_name,
                local: item.local_name,
                imageSrc,
              };
            })}
            size="md"
            stackedNames
          />
        </div>
      )}
      {hasTech && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">Techniques</h3>
          <SpeciesPills
            className="mt-2"
            items={charter.techniques.map((t) => ({ label: t }))}
            size="md"
            stackedNames={false}
            showImage={false}
          />
        </div>
      )}
    </div>
  );
}
