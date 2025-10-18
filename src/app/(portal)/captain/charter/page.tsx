import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import { STEP_SEQUENCE } from "@features/charter-onboarding/formSteps";
import { mapCharterToDraftValues } from "@features/charter-onboarding/server";
import type { StepKey } from "@features/charter-onboarding/types";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const STEP_DESCRIPTIONS: Partial<Record<StepKey, string>> = {
  basics:
    "Captain profile, contact details, and charter location pulled from your latest submission.",
  experience:
    "Boat basics, amenities, policies, and pickup options available to anglers.",
  trips:
    "Active trip lineup with pricing, durations, species, and available start times.",
  description:
    "Long-form charter description and tone that anglers see on FishOn.",
  media: "Published photo gallery and processed short-form videos.",
  review:
    "Final review step used when publishing updates through the onboarding flow.",
};

const POLICY_LABELS: Record<string, string> = {
  licenseProvided: "License provided",
  catchAndKeep: "Catch & keep allowed",
  catchAndRelease: "Catch & release supported",
  childFriendly: "Child friendly",
  liveBaitProvided: "Live bait provided",
  alcoholNotAllowed: "Alcohol not allowed",
  smokingNotAllowed: "Smoking not allowed",
};

type DecimalLike =
  | number
  | null
  | undefined
  | { toNumber?: () => number; toString(): string };

type PhotoMedia = {
  id: string;
  url: string;
  sortOrder: number;
  storageKey: string | null;
};

type CharterDetail = {
  id: string;
  charterType: string;
  name: string;
  state: string;
  city: string;
  startingPoint: string;
  postcode: string;
  latitude: DecimalLike;
  longitude: DecimalLike;
  description: string;
  backupPhone: string | null;
  updatedAt: Date;
  boat: {
    name: string | null;
    type: string | null;
    lengthFt: DecimalLike;
    capacity: DecimalLike;
  } | null;
  features: { label: string }[];
  amenities: { label: string }[];
  policies: {
    licenseProvided: boolean;
    catchAndKeep: boolean;
    catchAndRelease: boolean;
    childFriendly: boolean;
    liveBaitProvided: boolean;
    alcoholNotAllowed: boolean;
    smokingNotAllowed: boolean;
  } | null;
  pickup: {
    fee: DecimalLike;
    notes: string | null;
    areas: { label: string }[];
  } | null;
  trips: Array<{
    id: string;
    name: string;
    tripType: string;
    price: DecimalLike;
    durationHours: number | null;
    maxAnglers: number | null;
    style: string;
    description: string | null;
    startTimes: { value: string }[];
    species: { value: string }[];
    techniques: { value: string }[];
  }>;
  media: PhotoMedia[];
  captain: { avatarUrl: string | null } | null;
};

type CaptainVideoRow = {
  id: string;
  originalUrl: string;
  ready720pUrl: string | null;
  processStatus: string;
  errorMessage: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  processedDurationSec: number | null;
};

type StepSummaryProps = {
  stepId: StepKey;
  draft: DraftValues;
  charter: CharterDetail;
  photos: PhotoMedia[];
  videos: CaptainVideoRow[];
};

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

type MappingInput = Parameters<typeof mapCharterToDraftValues>[0];

const currencyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function toFiniteNumber(value: DecimalLike): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof value.toNumber === "function"
  ) {
    const num = value.toNumber();
    return Number.isFinite(num) ? num : null;
  }
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: DecimalLike): string {
  const num = toFiniteNumber(value);
  return num === null ? "—" : currencyFormatter.format(num);
}

function formatCoordinate(value: DecimalLike): string {
  const num = toFiniteNumber(value);
  return num === null ? "—" : num.toFixed(5);
}

function formatList(items: string[], fallback = "Not provided"): string {
  return items.length ? items.join(", ") : fallback;
}

function formatDuration(hours: number | null | undefined): string {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
    return "—";
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function formatYears(years: number | null | undefined): string {
  if (typeof years !== "number" || !Number.isFinite(years) || years < 0) {
    return "—";
  }
  const rounded = Math.round(years);
  return `${rounded} year${rounded === 1 ? "" : "s"}`;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSeconds(seconds: number | null | undefined): string {
  if (
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "—";
  }
  return `${Math.round(seconds)}s`;
}

function deriveFileName(
  source: string | null | undefined,
  fallback: string
): string {
  if (!source) return fallback;
  try {
    const decoded = decodeURIComponent(source);
    const parts = decoded.split("/");
    return parts[parts.length - 1] || fallback;
  } catch {
    return fallback;
  }
}

function InfoCard({
  title,
  children,
  rows,
}: {
  title: string;
  children?: ReactNode;
  rows?: InfoRowProps[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {rows && rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 text-sm text-slate-600"
            >
              <span className="text-slate-500">{row.label}</span>
              <span className="text-right font-medium text-slate-900">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {children && (
        <div className="mt-4 space-y-3 text-sm text-slate-600">{children}</div>
      )}
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {items.length ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Not provided</p>
      )}
    </div>
  );
}

function renderStepContent({
  stepId,
  draft,
  charter,
  photos,
  videos,
}: StepSummaryProps): ReactNode {
  if (stepId === "basics") {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <InfoCard
          title="Captain Detail"
          rows={[
            {
              label: "Display name",
              value: draft.operator.displayName || "—",
            },
            { label: "Phone", value: draft.operator.phone || "—" },
            {
              label: "Backup phone",
              value: charter.backupPhone || "—",
            },
            {
              label: "Experience",
              value: formatYears(
                draft.operator.experienceYears as number | null | undefined
              ),
            },
          ]}
        >
          <p>{draft.operator.bio || "No captain bio yet."}</p>
        </InfoCard>
        <InfoCard
          title="Charter Location"
          rows={[
            { label: "Charter name", value: draft.charterName || "—" },
            { label: "Charter type", value: draft.charterType || "—" },
            {
              label: "City",
              value: draft.city ? `${draft.city}, ${draft.state}` : "—",
            },
            { label: "Starting point", value: draft.startingPoint || "—" },
            { label: "Postcode", value: draft.postcode || "—" },
            {
              label: "Coordinates",
              value: `${formatCoordinate(charter.latitude)}, ${formatCoordinate(
                charter.longitude
              )}`,
            },
          ]}
        />
      </div>
    );
  }

  if (stepId === "experience") {
    const boat = charter.boat;
    const featureLabels = charter.features.map((f) => f.label).filter(Boolean);
    const amenityLabels = charter.amenities.map((a) => a.label).filter(Boolean);
    const policyLabels = Object.entries(charter.policies || {})
      .filter(([, value]) => !!value)
      .map(([key]) => POLICY_LABELS[key] || key);
    const pickupAreas = (charter.pickup?.areas || [])
      .map((a) => a.label)
      .filter(Boolean);
    return (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <InfoCard
            title="Boat"
            rows={[
              { label: "Name", value: boat?.name || "—" },
              { label: "Type", value: boat?.type || "—" },
              {
                label: "Length",
                value: (() => {
                  const num = toFiniteNumber(boat?.lengthFt);
                  return num === null ? "—" : `${num} ft`;
                })(),
              },
              {
                label: "Capacity",
                value: (() => {
                  const num = toFiniteNumber(boat?.capacity);
                  return num === null ? "—" : `${num} anglers`;
                })(),
              },
            ]}
          />
          <InfoCard title="Pickup">
            <p>
              {charter.pickup
                ? "Pickup service available"
                : "Pickup service not offered"}
            </p>
            {charter.pickup && (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Pickup fee</span>
                  <span className="font-medium text-slate-900">
                    {charter.pickup.fee === null
                      ? "Complimentary"
                      : formatCurrency(charter.pickup.fee)}
                  </span>
                </div>
                <ChipList label="Areas" items={pickupAreas} />
                {charter.pickup.notes && (
                  <p className="text-xs text-slate-500">
                    Notes: {charter.pickup.notes}
                  </p>
                )}
              </div>
            )}
          </InfoCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <InfoCard title="Amenities">
            <ChipList label="Amenities" items={amenityLabels} />
          </InfoCard>
          <InfoCard title="Policies">
            <ChipList label="Enabled policies" items={policyLabels} />
          </InfoCard>
        </div>
        <InfoCard title="Boat Features">
          <ChipList label="Features" items={featureLabels} />
        </InfoCard>
      </div>
    );
  }

  if (stepId === "trips") {
    if (!charter.trips.length) {
      return <p className="text-sm text-slate-500">No trips configured yet.</p>;
    }
    return (
      <div className="space-y-4">
        {charter.trips.map((trip) => {
          const priceLabel = formatCurrency(trip.price);
          const startTimes = trip.startTimes
            .map((s) => s.value)
            .filter(Boolean);
          const species = trip.species.map((s) => s.value).filter(Boolean);
          const techniques = trip.techniques
            .map((t) => t.value)
            .filter(Boolean);
          const maxAnglers =
            typeof trip.maxAnglers === "number" &&
            Number.isFinite(trip.maxAnglers)
              ? trip.maxAnglers
              : null;
          const styleLabel =
            trip.style === "SHARED"
              ? "Shared"
              : trip.style === "PRIVATE"
              ? "Private"
              : trip.style || "—";
          return (
            <div
              key={trip.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {trip.name || "Untitled trip"}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {trip.tripType || "No trip type"}
                  </p>
                </div>
                <div className="text-sm font-semibold text-[#ec2227]">
                  {priceLabel}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">Duration</span>
                  <p className="font-medium text-slate-700">
                    {formatDuration(trip.durationHours)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Max anglers</span>
                  <p className="font-medium text-slate-700">
                    {maxAnglers ?? "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Style</span>
                  <p className="font-medium text-slate-700">{styleLabel}</p>
                </div>
                <div>
                  <span className="text-slate-400">Start times</span>
                  <p className="font-medium text-slate-700">
                    {formatList(startTimes)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">Species</span>
                  <p className="font-medium text-slate-700">
                    {formatList(species)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Techniques</span>
                  <p className="font-medium text-slate-700">
                    {formatList(techniques)}
                  </p>
                </div>
              </div>
              {trip.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {trip.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (stepId === "description") {
    return (
      <div className="space-y-5">
        <InfoCard title="Description">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {charter.description || "No description provided yet."}
          </p>
        </InfoCard>
        <InfoCard
          title="Tone & AI Draft"
          rows={[
            {
              label: "Preferred tone",
              value: draft.tone || "—",
            },
            {
              label: "AI generated draft",
              value: draft.generatedDescription ? "Available" : "Not generated",
            },
          ]}
        >
          {draft.generatedDescription && (
            <p className="whitespace-pre-line text-xs text-slate-500">
              {draft.generatedDescription}
            </p>
          )}
        </InfoCard>
      </div>
    );
  }

  if (stepId === "media") {
    const photoCount = photos.length;
    const videoCount = videos.length;
    const photoSamples = photos.slice(0, 6);
    const videoSamples = videos.slice(0, 6);
    return (
      <div className="space-y-5">
        <InfoCard
          title="Photos"
          rows={[
            {
              label: "Total photos",
              value: photoCount ? photoCount.toString() : "0",
            },
          ]}
        >
          {photoCount ? (
            <ul className="space-y-2 text-xs text-slate-600">
              {photoSamples.map((photo) => (
                <li
                  key={photo.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">
                    {deriveFileName(photo.storageKey || photo.url, "Photo")}
                  </span>
                  <span className="text-slate-400">#{photo.sortOrder + 1}</span>
                </li>
              ))}
              {photoCount > photoSamples.length && (
                <li className="text-xs text-slate-400">
                  +{photoCount - photoSamples.length} more photos in gallery
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No photos uploaded yet.</p>
          )}
        </InfoCard>
        <InfoCard
          title="Short Videos"
          rows={[
            {
              label: "Total videos",
              value: videoCount ? videoCount.toString() : "0",
            },
          ]}
        >
          {videoCount ? (
            <ul className="space-y-2 text-xs text-slate-600">
              {videoSamples.map((video) => {
                const fileUrl = video.ready720pUrl || video.originalUrl;
                const fileName = deriveFileName(fileUrl, "Video");
                return (
                  <li
                    key={video.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-700">
                        {fileName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatStatus(video.processStatus)} ·{" "}
                        {formatSeconds(video.processedDurationSec)}
                      </p>
                      {video.processStatus === "failed" &&
                        video.errorMessage && (
                          <p className="mt-1 text-[11px] text-red-500">
                            {video.errorMessage}
                          </p>
                        )}
                    </div>
                    {fileUrl && (
                      <Link
                        href={fileUrl}
                        prefetch={false}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[#ec2227] hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </li>
                );
              })}
              {videoCount > videoSamples.length && (
                <li className="text-xs text-slate-400">
                  +{videoCount - videoSamples.length} more videos in library
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No videos uploaded yet.</p>
          )}
        </InfoCard>
      </div>
    );
  }

  if (stepId === "review") {
    return (
      <InfoCard
        title="Review & Publish"
        rows={[
          {
            label: "Last updated",
            value: charter.updatedAt.toLocaleString("en-MY", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          },
          {
            label: "Media summary",
            value: `${photos.length} photos · ${videos.length} videos`,
          },
        ]}
      >
        <p>
          Use the review step in the onboarding flow to preview every section
          and publish updates to FishOn.
        </p>
        <p className="text-xs text-slate-500">
          Selecting Edit opens the form at the review step so you can submit
          changes or download the PDF summary.
        </p>
      </InfoCard>
    );
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function CharterStepsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { id?: string } | undefined)?.id)
    redirect("/auth?mode=signin");

  const resolvedParams = searchParams ? await searchParams : {};
  const adminUserId =
    typeof resolvedParams?.adminUserId === "string"
      ? resolvedParams.adminUserId
      : undefined;
  const requestedStep =
    typeof resolvedParams?.step === "string" ? resolvedParams.step : undefined;

  let targetUserInfo: {
    id: string;
    email: string | null;
    name: string | null;
  } | null = null;
  const role = session?.user
    ? (session.user as { role?: string } | undefined)?.role
    : undefined;
  if (role === "ADMIN" && adminUserId) {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true },
    });
    if (!targetUserInfo) {
      redirect("/staff");
    }
  } else if ((role === "STAFF" || role === "ADMIN") && !adminUserId) {
    redirect("/staff");
  }

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  const profile = await prisma.captainProfile.findUnique({
    where: { userId: effectiveUserId },
    select: {
      id: true,
      displayName: true,
      phone: true,
      bio: true,
      experienceYrs: true,
      avatarUrl: true,
      charters: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          charterType: true,
          name: true,
          state: true,
          city: true,
          startingPoint: true,
          postcode: true,
          latitude: true,
          longitude: true,
          description: true,
          backupPhone: true,
          updatedAt: true,
          boat: {
            select: {
              name: true,
              type: true,
              lengthFt: true,
              capacity: true,
            },
          },
          features: { select: { label: true } },
          amenities: { select: { label: true } },
          policies: {
            select: {
              licenseProvided: true,
              catchAndKeep: true,
              catchAndRelease: true,
              childFriendly: true,
              liveBaitProvided: true,
              alcoholNotAllowed: true,
              smokingNotAllowed: true,
            },
          },
          pickup: {
            select: {
              fee: true,
              notes: true,
              areas: { select: { label: true } },
            },
          },
          trips: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              tripType: true,
              price: true,
              durationHours: true,
              maxAnglers: true,
              style: true,
              description: true,
              startTimes: { select: { value: true } },
              species: { select: { value: true } },
              techniques: { select: { value: true } },
            },
          },
          media: {
            where: { kind: "CHARTER_PHOTO" },
            select: {
              id: true,
              url: true,
              sortOrder: true,
              storageKey: true,
            },
            orderBy: { sortOrder: "asc" },
          },
          captain: {
            select: { avatarUrl: true },
          },
        },
      },
    },
  });

  const typed = profile as typeof profile & { charters?: unknown[] };
  if (!typed || !typed.charters || !typed.charters.length) {
    redirect("/auth?next=/captain/form");
  }
  const charter = typed.charters[0] as unknown as CharterDetail;
  const photos = [...charter.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const videos = (await prisma.captainVideo.findMany({
    where: { ownerId: effectiveUserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalUrl: true,
      ready720pUrl: true,
      processStatus: true,
      errorMessage: true,
      thumbnailUrl: true,
      createdAt: true,
      processedDurationSec: true,
    },
  })) as CaptainVideoRow[];

  const imageMetas = photos
    .filter((photo) => !!photo.url)
    .map((photo, index) => ({
      name: deriveFileName(photo.storageKey || photo.url, `photo-${index + 1}`),
      url: photo.url,
    }));
  const videoMetas = videos
    .map((video, index) => {
      const fileUrl = video.ready720pUrl || video.originalUrl;
      if (!fileUrl) return null;
      return {
        name: deriveFileName(fileUrl, `video-${index + 1}`),
        url: fileUrl,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.processedDurationSec ?? undefined,
      };
    })
    .filter(Boolean) as {
    name: string;
    url: string;
    thumbnailUrl?: string | null;
    durationSeconds?: number;
  }[];

  const mappingPayload: MappingInput = {
    charter: charter as MappingInput["charter"],
    captainProfile: {
      displayName: profile?.displayName ?? "",
      phone: profile?.phone ?? "",
      bio: profile?.bio ?? "",
      experienceYrs: profile?.experienceYrs ?? 0,
    },
    media: {
      images: imageMetas,
      videos: videoMetas,
      avatar: profile?.avatarUrl || charter.captain?.avatarUrl || undefined,
      imagesCoverIndex: 0,
    },
  };

  const draftValues = mapCharterToDraftValues(mappingPayload) as DraftValues;

  const defaultStepId = (STEP_SEQUENCE[0]?.id ?? "basics") as StepKey;
  const activeStepId = (STEP_SEQUENCE.find((step) => step.id === requestedStep)
    ?.id ?? defaultStepId) as StepKey;
  const activeStep =
    STEP_SEQUENCE.find((step) => step.id === activeStepId) ?? STEP_SEQUENCE[0];

  const adminQuery = adminUserId ? `&adminUserId=${adminUserId}` : "";
  const editHref = `/captain/form?editCharterId=${charter.id}${adminQuery}#${activeStep.id}`;
  const tabHref = (stepId: StepKey) => {
    const params = new URLSearchParams();
    params.set("step", stepId);
    if (adminUserId) params.set("adminUserId", adminUserId);
    const query = params.toString();
    return query ? `/captain/charter?${query}` : "/captain/charter";
  };

  const description =
    STEP_DESCRIPTIONS[activeStep.id as StepKey] ||
    "Review the data captured for this step before editing.";

  const stepContent = renderStepContent({
    stepId: activeStep.id as StepKey,
    draft: draftValues,
    charter,
    photos,
    videos,
  });

  const lastUpdatedLabel = charter.updatedAt.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const targetLabel = targetUserInfo?.name || targetUserInfo?.email || null;

  return (
    <div className="px-6 py-8 space-y-8">
      {targetUserInfo && (
        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-orange-800">
                🛡️ Admin Override Active
              </h2>
              <p className="text-xs text-orange-700">
                Viewing charter setup for {targetLabel} ({targetUserInfo.id})
              </p>
            </div>
            <Link
              href="/staff"
              className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Exit Admin Mode
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {targetUserInfo
              ? `Charter Setup – ${targetUserInfo.name || targetUserInfo.email}`
              : "Charter Setup"}
          </h1>
          <p className="text-sm text-slate-500">
            Review your published charter data step-by-step and jump straight to
            the form section you want to edit.
          </p>
        </div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Last updated {lastUpdatedLabel}
        </p>
      </div>

      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto rounded-full bg-slate-100 p-2 text-sm"
      >
        {STEP_SEQUENCE.map((step) => {
          const isActive = step.id === activeStepId;
          return (
            <Link
              key={step.id}
              href={tabHref(step.id as StepKey)}
              role="tab"
              aria-selected={isActive}
              prefetch={false}
              className={
                "whitespace-nowrap rounded-full px-4 py-1.5 font-medium transition " +
                (isActive
                  ? "bg-[#ec2227] text-white shadow"
                  : "text-slate-600 hover:bg-white")
              }
            >
              {step.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {activeStep.label}
            </h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <Link
            href={editHref}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full bg-[#ec2227] px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#d81e23]"
          >
            Edit step
          </Link>
        </div>
        <div className="mt-6 space-y-4">{stepContent}</div>
      </div>
    </div>
  );
}
