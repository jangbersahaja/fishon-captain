import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  Clock,
  Edit3,
  Home as HomeIcon,
  Image as ImageIcon,
  Ship,
  UploadCloud,
  Video,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RemoveDraftButton } from "./_components/RemoveDraftButton";

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
  if (!profile || !profile.charters.length) {
    redirect("/auth?next=/captain/form");
  }
  const charter = profile.charters[0];
  return { profile, charter, userId };
}

async function fetchActiveDraft(userId: string) {
  // Find latest active draft (not submitted) that is associated to a charter (edit in progress)
  return prisma.charterDraft.findFirst({
    where: { userId, status: "DRAFT", charterId: { not: null } },
    select: { id: true, charterId: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
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
  const draft = await fetchActiveDraft(userId);
  const photoCount = charter.media.filter(
    (m) => m.kind === "CHARTER_PHOTO"
  ).length;
  const videoCount = charter.media.filter(
    (m) => m.kind === "CHARTER_VIDEO"
  ).length;
  const { totalHours, avgPrice } = computeTripStats(
    charter.trips.map((t) => ({
      durationHours: t.durationHours,
      price: t.price,
    }))
  );

  return (
    <div className="px-6 py-8 space-y-8">
      {draft && draft.charterId && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                <Edit3 className="h-4 w-4" /> You have unsaved changes in a
                draft
              </p>
              <p className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Last edited{" "}
                {new Date(draft.updatedAt).toLocaleString()} — resume editing to
                finalize your updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/captain/form?editCharterId=${draft.charterId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-500"
                prefetch={false}
                aria-label="Resume draft"
                title="Resume draft"
              >
                <UploadCloud className="h-3.5 w-3.5" /> Resume
              </Link>
              <RemoveDraftButton draftId={draft.id} />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {profile.displayName}
          </h1>
          <p className="text-sm text-slate-500">
            Manage your charter and upcoming features here.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/captain/form?editCharterId=${charter.id}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full bg-[#ec2227] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#d81e23]"
          >
            <Edit3 className="h-4 w-4" /> Edit charter
          </Link>
          <Link
            href={`/`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400"
          >
            <HomeIcon className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-700 flex items-center gap-2">
            <Ship className="h-4 w-4" /> Charter
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-900">
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
