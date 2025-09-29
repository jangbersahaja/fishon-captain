import AboutSection from "@/components/charter/AboutSection";
import AmenitiesCard from "@/components/charter/AmenitiesCard";
import BoatCard from "@/components/charter/BoatCard";
import BookingWidget from "@/components/charter/BookingWidget";
import CaptainSection from "@/components/charter/CaptainSection";
import type { Charter } from "@/dummy/charter";
import {
  registerLazyGroup,
  trackLazyComponentLoad,
} from "@features/charter-onboarding/analytics";
import { PREVIEW_PLACEHOLDER_IMAGES } from "@features/charter-onboarding/constants";
import dynamic from "next/dynamic";
import { buildMapEmbedSrc } from "./previewUtils";
// Dynamically loaded heavy/interactive preview components (only needed in Review step)
// Register group once (idempotent)
registerLazyGroup("review_preview", [
  "CharterGallery",
  "GuestFeedbackPanel",
  "LocationMap",
  "PoliciesInfoCard",
  "ReviewsList",
  "SpeciesTechniquesCard",
]);
// Individual dynamic imports with timing instrumentation + group tracking
const CharterGallery = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/CharterGallery");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "CharterGallery", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="CharterGallery loading"
      >
        Loading gallery…
      </div>
    ),
  }
);
const GuestFeedbackPanel = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/GuestFeedbackPanel");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "GuestFeedbackPanel", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="GuestFeedbackPanel loading"
      >
        Loading feedback…
      </div>
    ),
  }
);
const LocationMap = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/LocationMap");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "LocationMap", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="LocationMap loading"
      >
        Loading map…
      </div>
    ),
  }
);
const PoliciesInfoCard = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/PoliciesInfoCard");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "PoliciesInfoCard", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="PoliciesInfoCard loading"
      >
        Loading policies…
      </div>
    ),
  }
);
const ReviewsList = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/ReviewsList");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "ReviewsList", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="ReviewsList loading"
      >
        Loading reviews…
      </div>
    ),
  }
);
const SpeciesTechniquesCard = dynamic(
  async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const mod = await import("@/components/charter/SpeciesTechniquesCard");
    const ms =
      typeof performance !== "undefined" ? performance.now() - t0 : undefined;
    trackLazyComponentLoad("review_preview", "SpeciesTechniquesCard", ms);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="text-[10px] text-slate-400"
        aria-label="SpeciesTechniquesCard loading"
      >
        Loading species & techniques…
      </div>
    ),
  }
);

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
      <div className="text-[10px] text-slate-400">Loading videos…</div>
    ),
  }
);

export function PreviewPanel({ charter, videos }: PreviewPanelProps) {
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
      <div className="mt-6 px-5 space-y-8">
        <CharterGallery images={images} title={charter.name} />
        {videos && videos.length > 0 && (
          <VideoPreviewCarousel
            videos={videos}
            className="border-t border-neutral-200 pt-6"
          />
        )}
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
