import AboutSection from "@/components/charter/AboutSection";
import AmenitiesCard from "@/components/charter/AmenitiesCard";
import BoatCard from "@/components/charter/BoatCard";
import BookingWidget from "@/components/charter/BookingWidget";
import CaptainSection from "@/components/charter/CaptainSection";
import CharterGallery from "@/components/charter/CharterGallery";
import GuestFeedbackPanel from "@/components/charter/GuestFeedbackPanel";
import LocationMap from "@/components/charter/LocationMap";
import PoliciesInfoCard from "@/components/charter/PoliciesInfoCard";
import ReviewsList from "@/components/charter/ReviewsList";
import SpeciesTechniquesCard from "@/components/charter/SpeciesTechniquesCard";
import type { Charter } from "@/dummy/charter";

import { PREVIEW_PLACEHOLDER_IMAGES } from "../constants";
import { buildMapEmbedSrc } from "./utils";

type PreviewPanelProps = {
  charter: Charter;
};

export function PreviewPanel({ charter }: PreviewPanelProps) {
  const images =
    charter.images && charter.images.length
      ? charter.images
      : PREVIEW_PLACEHOLDER_IMAGES;
  const mapEmbedSrc = buildMapEmbedSrc(charter);
  const personsMax = charter.boat.capacity || undefined;

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Preview listing
        </h2>
        <p className="text-sm text-slate-500">
          Snapshot of how anglers will view your charter on FishOn.
        </p>
      </div>

      <div className="px-6 pt-6">
        <header className="mt-3 flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-slate-900">
            {charter.name || "Your charter name"}
          </h3>
          {charter.address ? (
            <p className="text-sm text-slate-500">{charter.address}</p>
          ) : null}
          <p className="text-sm text-slate-500">{charter.location}</p>
        </header>
      </div>

      <div className="mt-6 px-5">
        <CharterGallery images={images} title={charter.name} />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
        <div className="lg:col-span-1">
          <AboutSection description={charter.description} />
          <CaptainSection charter={charter} />
          <BoatCard charter={charter} />
          <SpeciesTechniquesCard charter={charter} />
          <AmenitiesCard charter={charter} />
          <LocationMap title={charter.name} mapEmbedSrc={mapEmbedSrc} />
        </div>
        <div className="lg:col-span-1 lg:h-full">
          <div className="pointer-events-none select-none opacity-60 h-fit">
            <BookingWidget
              trips={charter.trip}
              defaultPersons={Math.min(2, personsMax ?? 2)}
              personsMax={personsMax}
              childFriendly={charter.policies.childFriendly}
              preview
              className="h-full"
            />
          </div>
        </div>
      </section>

      <div className="space-y-6 border-t border-neutral-100 px-6 py-6">
        <PoliciesInfoCard charter={charter} />
        <GuestFeedbackPanel reviews={[]} ratingAvg={0} ratingCount={0} />
        <ReviewsList reviews={[]} />
      </div>
    </section>
  );
}
