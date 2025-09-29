import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  Edit3,
  Image as ImageIcon,
  Ship,
  Video,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import NotificationCenter, {
  NotificationItem,
} from "@/components/NotificationCenter";
interface ProfileWithCharter {
  id: string;
  displayName: string;
  charters: {
    id: string;
    name: string;
    updatedAt: Date;
    city: string;
    state: string;
    media: { kind: string }[];
    trips: { durationHours: number; price: unknown }[];
  }[];
}
async function getCharter() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth?mode=signin");
  const profile = await prisma.captainProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      displayName: true,
      charters: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
          city: true,
          state: true,
          media: true,
          trips: true,
        },
      },
    },
  });
  const typed = profile as ProfileWithCharter | null;
  if (!typed || !typed.charters || !typed.charters.length) {
    redirect("/auth?next=/captain/form");
  }
  const charter = typed.charters[0];
  return { profile: typed, charter, userId };
}

interface DocStatusShape {
  status?: string;
  [k: string]: unknown;
}
interface VerificationRow {
  idFront?: DocStatusShape | null;
  idBack?: DocStatusShape | null;
  captainLicense?: DocStatusShape | null;
  boatRegistration?: DocStatusShape | null;
  fishingLicense?: DocStatusShape | null;
  additional?: unknown;
}
async function getVerification(
  userId: string
): Promise<VerificationRow | null> {
  const row = await prisma.captainVerification.findUnique({
    where: { userId },
  });
  return row as VerificationRow | null;
}

function computeTripStats(trips: { durationHours: number; price: unknown }[]) {
  if (!trips.length) return { totalHours: 0, avgPrice: 0 };
  const totalHours = trips.reduce(
    (acc, t) => acc + (Number.isFinite(t.durationHours) ? t.durationHours : 0),
    0
  );
  const totalPrice = trips.reduce((acc, t) => {
    const num = Number(t.price);
    return acc + (Number.isFinite(num) ? num : 0);
  }, 0);
  return { totalHours, avgPrice: totalPrice / trips.length };
}

export default async function CaptainDashboardPage() {
  const { profile, charter, userId } = await getCharter();
  const verification = await getVerification(userId);
  const govFront = !!verification?.idFront;
  const govBack = !!verification?.idBack;
  function badgeStatus(doc: unknown): NotificationItem["status"] {
    if (!doc) return "missing";
    if (
      typeof doc === "object" &&
      doc &&
      (doc as DocStatusShape).status === "validated"
    )
      return "validated";
    if (
      typeof doc === "object" &&
      doc &&
      (doc as DocStatusShape).status === "processing"
    )
      return "processing";
    return "processing";
  }
  const items: NotificationItem[] = [
    {
      id: "govId",
      label: "Government ID (front & back)",
      status:
        govFront && govBack
          ? badgeStatus(verification?.idFront) === "validated" &&
            badgeStatus(verification?.idBack) === "validated"
            ? "validated"
            : badgeStatus(verification?.idFront) === "processing" ||
              badgeStatus(verification?.idBack) === "processing"
            ? "processing"
            : "processing"
          : govFront || govBack
          ? "partial"
          : "missing",
      detail:
        !govFront && !govBack
          ? "Both sides required"
          : govFront && !govBack
          ? "Back side missing"
          : !govFront && govBack
          ? "Front side missing"
          : undefined,
      href: "/captain/verification",
    },
    {
      id: "captainLicense",
      label: "Captain license",
      status: badgeStatus(verification?.captainLicense),
      href: "/captain/verification",
    },
    {
      id: "boatRegistration",
      label: "Boat registration certificate",
      status: badgeStatus(verification?.boatRegistration),
      href: "/captain/verification",
    },
    {
      id: "fishingLicense",
      label: "Fishing license",
      status: badgeStatus(verification?.fishingLicense),
      href: "/captain/verification",
    },
  ];
  const photoCount = charter.media.filter(
    (m: { kind: string }) => m.kind === "CHARTER_PHOTO"
  ).length;
  const videoCount = charter.media.filter(
    (m: { kind: string }) => m.kind === "CHARTER_VIDEO"
  ).length;
  const { totalHours, avgPrice } = computeTripStats(
    charter.trips.map((t: { durationHours: number; price: unknown }) => ({
      durationHours: t.durationHours,
      price: t.price,
    }))
  );

  // Grouped status summary for consolidated offline banner
  const missingDocs = items.filter(
    (i) => i.status === "missing" || i.status === "partial"
  );
  const processingDocs = items.filter((i) => i.status === "processing");
  const anyActionable = missingDocs.length > 0 || processingDocs.length > 0;
  // Charter considered offline if any required doc not validated
  const charterOffline = anyActionable; // future: refine with explicit charter.isActive gate if needed

  function renderOfflineBanner() {
    if (!charterOffline) return null;
    const missingList = missingDocs.map((d) => d.label).join(", ");
    const processingList = processingDocs.map((d) => d.label).join(", ");
    return (
      <div className="mt-2 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold text-red-900">
          Your charter is currently offline.
        </p>
        <div className="mt-1 space-y-1">
          <p className="leading-snug">
            Verification incomplete. Please provide the required documents
            below.
          </p>
          {missingList && (
            <p className="leading-snug">
              <span className="font-medium">Missing:</span> {missingList}
            </p>
          )}
          {processingList && (
            <p className="leading-snug">
              <span className="font-medium">Processing:</span> {processingList}
            </p>
          )}
        </div>
        <div className="mt-3">
          <Link
            href="/captain/verification"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800"
            prefetch={false}
          >
            Manage documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {profile.displayName}
          </h1>
          <p className="text-sm text-slate-500">
            Manage your charter and documents here.
          </p>
        </div>
        {renderOfflineBanner()}
        {/* Keep granular list of items below the banner for clarity */}
        <NotificationCenter items={items} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium text-slate-700 flex items-center gap-2">
              <Ship className="h-4 w-4" /> Charter
            </h2>
            <Link
              href={`/captain/form?editCharterId=${charter.id}`}
              prefetch={false}
              className="inline-flex items-center gap-1 rounded-full bg-[#ec2227] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#d81e23]"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900 truncate">
            {charter.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {charter.city}, {charter.state}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-400">
            Updated {new Date(charter.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-700 flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Media
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {photoCount} photos · {videoCount} videos
          </p>
          <Link
            href={`/captain/form?editCharterId=${charter.id}#media`}
            prefetch={false}
            className="mt-3 inline-flex text-xs font-semibold text-[#ec2227] hover:underline"
          >
            Manage media
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-700 flex items-center gap-2">
            <Video className="h-4 w-4" /> Trips
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {charter.trips.length} active trip(s)
          </p>
          <Link
            href={`/captain/form?editCharterId=${charter.id}#trips`}
            prefetch={false}
            className="mt-3 inline-flex text-xs font-semibold text-[#ec2227] hover:underline"
          >
            Edit trips
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Performance
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {totalHours} total trip hours
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Avg base price RM {avgPrice.toFixed(0)}
          </p>
        </div>
      </div>

      {/* NotificationCenter already shown at top; legacy reminders removed */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Upcoming features
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            "Bookings",
            "Calendar",
            "Reviews",
            "Analytics",
            "Pricing",
            "Messages",
            "Angler media",
          ].map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-slate-500"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ec2227]" />
              {label}
              <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
                Soon
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
