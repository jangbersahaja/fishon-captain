import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  Edit3,
  Home as HomeIcon,
  Image as ImageIcon,
  Ship,
  Video,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

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

interface VerificationRow {
  idFront?: unknown | null;
  idBack?: unknown | null;
  captainLicense?: unknown | null;
  boatRegistration?: unknown | null;
  fishingLicense?: unknown | null;
  additional?: unknown;
}
async function getVerification(userId: string): Promise<VerificationRow | null> {
  const row = await prisma.captainVerification.findUnique({ where: { userId } });
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
  const requiredMap: { key: string; label: string; present: boolean }[] = [
    {
      key: "govId",
      label: "Government ID (front & back)",
      present: !!(verification?.idFront && verification?.idBack),
    },
    {
      key: "captainLicense",
      label: "Captain license",
      present: !!verification?.captainLicense,
    },
    {
      key: "boatRegistration",
      label: "Boat registration certificate",
      present: !!verification?.boatRegistration,
    },
    {
      key: "fishingLicense",
      label: "Fishing license",
      present: !!verification?.fishingLicense,
    },
  ];
  const missing = requiredMap.filter((r) => !r.present);
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

      <div className="grid gap-6 md:grid-cols-2">
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

      {/* Reminders / Notifications */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">Reminders</h2>
        </div>
        {missing.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> All required verification documents have been uploaded.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-medium mb-1">
                  {missing.length} required document{missing.length > 1 ? "s" : ""} pending
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {missing.map((m) => (
                    <li key={m.key} className="marker:text-amber-500">
                      {m.label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/captain/verification"
                  className="mt-2 inline-flex text-[11px] font-semibold text-[#ec2227] hover:underline"
                >
                  Go to verification
                </Link>
              </div>
            </div>
          </div>
        )}
        <p className="mt-6 text-[11px] uppercase tracking-wide text-slate-400">
          This panel will also display future notifications & info.
        </p>
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
