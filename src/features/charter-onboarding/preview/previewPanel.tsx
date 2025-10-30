import type { Charter } from "@/dummy/charter";
import { registerLazyGroup } from "@features/charter-onboarding/analytics";
import {
  AboutSection,
  AmenitiesCard,
  BoatCard,
  BookingWidget,
  CaptainSection,
  GuestFeedback,
  PhotoGallery,
  TechniqueCard,
} from "@fishon/ui/charter";
import dynamic from "next/dynamic";
import { buildMapEmbedSrc } from "./previewUtils";
// Dynamically loaded heavy/interactive preview components (only needed in Review step)
// Register group once (idempotent)
registerLazyGroup("review_preview", [
  "PhotoGallery",
  "GuestFeedback",
  "LocationMap",
  "PoliciesCard",
  "TechniqueCard",
]);
// Individual dynamic imports with timing instrumentation + group tracking
// PhotoGallery is now imported from @fishon/ui/charter

import { LocationMap, PoliciesCard } from "@fishon/ui/charter";

type PreviewPanelProps = {
  charter: Charter;
  videos?: { url: string; name?: string; thumbnailUrl?: string | null }[];
};

const VideoPreviewCarousel = dynamic(
  async () => {
    const mod = await import("@/components/charter/VideoPreviewCarousel");
    return mod.VideoPreviewCarousel;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] sm:h-[240px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-400">Loading videos…</div>
      </div>
    ),
  }
);

export function PreviewPanel({ charter, videos }: PreviewPanelProps) {
  const images =
    charter.images && charter.images.length ? charter.images : undefined;
  const mapEmbedSrc = buildMapEmbedSrc(charter);
  const personsMax = charter.boat.capacity || undefined;

  // Debug: log videos prop to diagnose loading issue
  if (typeof window !== "undefined") {
    console.log("[PreviewPanel] videos prop:", {
      hasVideos: !!videos,
      length: videos?.length ?? 0,
      sample: videos?.[0],
    });
  }

  return (
    <section className="w-full bg-white border shadow-sm rounded-3xl border-neutral-200">
      <div className="px-6 py-5 border-b border-neutral-200">
        <h2 className="text-xl font-semibold text-slate-900">
          Preview listing
        </h2>
        <p className="text-sm text-slate-500">
          Snapshot of how anglers will view your charter on Fishon.
        </p>
      </div>
      <div className="px-6 pt-6">
        <header className="flex flex-col gap-1 mt-3">
          <h3 className="text-2xl font-bold text-slate-900">
            {charter.name || "Your charter name"}
          </h3>
          {charter.address ? (
            <p className="text-sm text-slate-500">{charter.address}</p>
          ) : null}
          <p className="text-sm text-slate-500">{charter.location}</p>
        </header>
      </div>
      <div className="w-full px-5 mt-6 space-y-8 overflow-hidden">
        <PhotoGallery images={images ? images : []} title={charter.name} />
        {videos && videos.length > 0 ? (
          <VideoPreviewCarousel
            videos={videos}
            className="pt-6 border-t border-neutral-200"
          />
        ) : null}
      </div>
      <section className="mt-6 grid grid-cols-1 gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
        <div className="lg:col-span-1">
          <AboutSection description={charter.description} />
          <CaptainSection charter={charter} />
          <BoatCard boat={charter?.boat} />
          <TechniqueCard techniques={charter.techniques} />
          <AmenitiesCard includes={charter.includes} />
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
      <div className="px-6 py-6 space-y-6 border-t border-neutral-100">
        <PoliciesCard
          policies={charter.policies}
          pickup={{
            ...charter.pickup,
            fee: charter.pickup.fee ?? null,
            areas: charter.pickup.areas ?? [],
          }}
        />
        <GuestFeedback
          reviews={[]}
          ratingAvg={0}
          ratingCount={0}
          summariseBadges={() => []}
        />
      </div>
    </section>
  );
}
