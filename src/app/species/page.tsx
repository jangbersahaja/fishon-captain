import { FRESH_WATER_SPECIES } from "@/lib/data/freshwater";
import { SALTWATER_SPECIES } from "@/lib/data/saltwater";
import { SQUID_SPECIES } from "@/lib/data/squid";
import Image from "next/image";

const FishSpeciesPage = () => {
  return (
    <div className="mx-auto">
      <section className="max-w-6xl w-full px-5 py-10">
        <h2 className="text-xl font-bold">Fresh Water Species</h2>
        <h3 className="text-lg">Spesies Air Tawar</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {FRESH_WATER_SPECIES.map((species) => (
            <div key={species.id} className="p-3 flex flex-col fap-1">
              <div className="border p-4 rounded relative h-30">
                <Image
                  src={species.image}
                  alt={species.english_name}
                  className=""
                  objectFit="contain"
                  fill
                />
              </div>
              <h4 className="font-bold">{species.english_name}</h4>
              <p className="text-sm">{species.local_name}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl w-full px-5 py-10">
        <h2 className="text-xl font-bold">Salt Water Species</h2>
        <h3 className="text-lg">Spesies Air Masin</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SALTWATER_SPECIES.map((species) => (
            <div key={species.id} className="p-3 flex flex-col fap-1">
              <div className="border p-4 rounded relative h-30">
                <Image
                  src={species.image}
                  alt={species.english_name}
                  className=""
                  objectFit="contain"
                  fill
                />
              </div>
              <h4 className="font-bold">{species.english_name}</h4>
              <p className="text-sm">{species.local_name}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl w-full px-5 py-10">
        <h2 className="text-xl font-bold">Squid Species</h2>
        <h3 className="text-lg">Spesies Sotong</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SQUID_SPECIES.map((species) => (
            <div key={species.id} className="p-3 flex flex-col fap-1">
              <div className="border p-4 rounded relative h-30">
                <Image
                  src={species.image}
                  alt={species.english_name}
                  className=""
                  objectFit="contain"
                  fill
                />
              </div>
              <h4 className="font-bold">{species.english_name}</h4>
              <p className="text-sm">{species.local_name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FishSpeciesPage;
