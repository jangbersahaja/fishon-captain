import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CharterEditButton } from "./CharterEditButton";

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
  | {
      toNumber?: () => number;
      toString(): string;
    };

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
  if (num === null) return "—";
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatCoordinate(value: DecimalLike): string {
  const num = toFiniteNumber(value);
  return num === null ? "—" : num.toFixed(5);
}

function InfoCard({
  title,
  children,
  rows,
}: {
  title: string;
  children?: React.ReactNode;
  rows?: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
      <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-slate-500">
        {title}
      </h3>
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-right text-slate-900">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {children && (
        <div className="space-y-3 text-sm text-slate-600">{children}</div>
      )}
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">
        {label}
      </p>
      {items.length ? (
        <ul className="flex flex-wrap gap-2 mt-2 text-xs">
          {items.map((item) => (
            <li
              key={item}
              className="px-3 py-1 border rounded-full border-slate-200 bg-slate-50 text-slate-600"
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

export default async function CharterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const resolvedParams = await params;
  const charterId = resolvedParams.id;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId =
    typeof resolvedSearchParams?.adminUserId === "string"
      ? resolvedSearchParams.adminUserId
      : undefined;

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: {
      id: true,
      name: true,
      charterType: true,
      startingPoint: true,
      city: true,
      state: true,
      postcode: true,
      latitude: true,
      longitude: true,
      description: true,
      isActive: true,
      backupPhone: true,
      updatedAt: true,
      ownerId: true,
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
    },
  });

  if (!charter) {
    redirect("/captain/charters");
  }

  // Verify ownership
  if (charter.ownerId !== effectiveUserId) {
    redirect("/captain/charters");
  }

  const role = session?.user?.role as string | undefined;
  let targetUserInfo = null;
  if (role === "ADMIN" && adminUserId) {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true },
    });
  }

  const amenityLabels = charter.amenities.map((a) => a.label).filter(Boolean);
  const policyLabels = Object.entries(charter.policies || {})
    .filter(([, value]) => !!value)
    .map(([key]) => POLICY_LABELS[key] || key);
  const pickupAreas = (charter.pickup?.areas || [])
    .map((a) => a.label)
    .filter(Boolean);

  const backQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";
  const backHref = `/captain/charters${backQuery}`;

  return (
    <div className="px-6 py-8 space-y-8">
      {targetUserInfo && (
        <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-orange-800">
                🛡️ Admin Override Active
              </h2>
              <p className="text-xs text-orange-700">
                Viewing charter for:{" "}
                {targetUserInfo.name || targetUserInfo.email} (
                {targetUserInfo.id})
              </p>
            </div>
            <Link
              href="/staff"
              className="px-3 py-1 text-xs font-semibold text-white bg-orange-600 rounded-full hover:bg-orange-700"
            >
              Exit Admin Mode
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Charters
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {charter.name}
              </h1>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  charter.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {charter.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-slate-500">{charter.charterType}</p>
          </div>
          <p className="text-xs tracking-wide uppercase text-slate-400">
            Last updated{" "}
            {charter.updatedAt.toLocaleString("en-MY", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kuala_Lumpur",
            })}
          </p>
        </div>
        <CharterEditButton
          charter={{
            id: charter.id,
            name: charter.name,
            charterType: charter.charterType,
            startingPoint: charter.startingPoint || "",
            city: charter.city || "",
            state: charter.state,
            postcode: charter.postcode || "",
            latitude: toFiniteNumber(charter.latitude),
            longitude: toFiniteNumber(charter.longitude),
            description: charter.description,
            amenities: charter.amenities,
            policies: charter.policies,
            pickup: charter.pickup
              ? {
                  fee: toFiniteNumber(charter.pickup.fee),
                  notes: charter.pickup.notes,
                  areas: charter.pickup.areas,
                }
              : null,
          }}
          adminUserId={adminUserId}
        />
      </div>

      {/* Charter Details */}
      <div className="space-y-6">
        {/* Location */}
        <div className="grid gap-5 lg:grid-cols-1">
          <InfoCard
            title="Location Details"
            rows={[
              { label: "Starting point", value: charter.startingPoint || "—" },
              {
                label: "City",
                value: charter.city ? `${charter.city}, ${charter.state}` : "—",
              },
              { label: "Postcode", value: charter.postcode || "—" },
              {
                label: "Coordinates",
                value: `${formatCoordinate(charter.latitude)}, ${formatCoordinate(
                  charter.longitude
                )}`,
              },
            ]}
          />
        </div>

        {/* Amenities & Policies */}
        <div className="grid gap-5 lg:grid-cols-2">
          <InfoCard title="Amenities">
            <ChipList label="Available amenities" items={amenityLabels} />
          </InfoCard>
          <InfoCard title="Policies">
            <ChipList label="Enabled policies" items={policyLabels} />
          </InfoCard>
        </div>

        {/* Pickup */}
        <InfoCard title="Pickup Service">
          {charter.pickup ? (
            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Pickup fee</span>
                <span className="font-medium text-slate-900">
                  {charter.pickup.fee === null
                    ? "Complimentary"
                    : formatCurrency(charter.pickup.fee)}
                </span>
              </div>
              <ChipList label="Pickup areas" items={pickupAreas} />
              {charter.pickup.notes && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">
                    Notes
                  </p>
                  <p className="text-sm text-slate-600">
                    {charter.pickup.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Pickup service not offered for this charter.
            </p>
          )}
        </InfoCard>

        {/* Description */}
        <InfoCard title="Charter Description">
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">
            {charter.description || "No description provided yet."}
          </p>
        </InfoCard>
      </div>
    </div>
  );
}
