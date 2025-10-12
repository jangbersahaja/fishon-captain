import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PenLineIcon } from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

async function getMediaContext(userId: string) {
  const profile = await prisma.captainProfile.findUnique({
    where: { userId },
    select: {
      charters: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          media: {
            select: { id: true, url: true, kind: true, sortOrder: true },
          },
          updatedAt: true,
        },
      },
    },
  });
  if (!profile || !profile.charters.length) return null;
  const videos = await prisma.captainVideo.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return { charter: profile.charters[0], videos };
}

export const dynamic = "force-dynamic";

export default async function MediaManagementPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth?mode=signin");
  const mediaContext = await getMediaContext(userId);
  if (!mediaContext) redirect("/auth?next=/captain/form");
  const { charter, videos: captainVideos } = mediaContext;
  const sp = searchParams ? await searchParams : {};
  const page = Number(sp?.page ?? 1) || 1;
  const pageSize = 24;
  const photosAll = charter.media
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const videosAll = captainVideos;
  const photos = paginate(photosAll, page, pageSize);
  const videosPage = paginate(videosAll, page, pageSize);
  const photoPages = Math.max(1, Math.ceil(photosAll.length / pageSize));
  const videoPages = Math.max(1, Math.ceil(videosAll.length / pageSize));

  return (
    <div className="px-6 py-8 space-y-8 ">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Media Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review existing photos & videos. To add / reorder / replace, use the
            edit flow.
          </p>
        </div>
        <Link
          href={`/captain/form?editCharterId=${charter.id}#media`}
          prefetch={false}
          className="flex gap-2 items-center rounded-full bg-[#ec2227] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#d81e23]"
        >
          <PenLineIcon />
          <span> Edit media</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 ">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm w-full">
          <h2 className="font-medium text-slate-700 mb-3">
            Photos ({photos.length})
          </h2>
          {photos.length === 0 ? (
            <p className="text-xs text-slate-500">No photos yet.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <li
                  key={p.id}
                  className="relative aspect-video overflow-hidden rounded-lg bg-slate-100"
                >
                  <Image
                    src={p.url}
                    alt="Charter photo"
                    className="h-full w-full object-cover"
                    fill
                  />
                </li>
              ))}
            </ul>
          )}
          {photoPages > 1 && (
            <div className="mt-4 flex justify-end gap-2 text-xs">
              {Array.from({ length: photoPages }).map((_, i) => {
                const p = i + 1;
                const is = p === page;
                return (
                  <Link
                    key={p}
                    href={`?page=${p}`}
                    className={
                      "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[11px] " +
                      (is
                        ? "border-[#ec2227] bg-[#ec2227] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                    }
                    prefetch={false}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-700 mb-3">
            Videos ({videosAll.length})
          </h2>
          {videosPage.length === 0 ? (
            <p className="text-xs text-slate-500">No videos yet.</p>
          ) : (
            <ul className="space-y-3">
              {videosPage.map((v) => {
                const fileUrl = v.ready720pUrl || v.originalUrl || "";
                const fileName = fileUrl
                  ? fileUrl.split("/").splice(-1)[0]
                  : `Video ${v.id.slice(0, 8)}`;
                const statusRaw = v.processStatus || "queued";
                const statusLabel =
                  statusRaw === "ready"
                    ? "Ready"
                    : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
                return (
                  <li
                    key={v.id}
                    className="rounded-lg border border-slate-200 p-2 flex items-center gap-3 bg-white w-full overflow-hidden"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-[10px] font-medium text-slate-600">
                      VID
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="truncate text-xs text-slate-600 break-all block">
                        {fileName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {statusLabel}
                        {statusRaw === "failed" && v.errorMessage
                          ? ` · ${v.errorMessage}`
                          : ""}
                      </span>
                    </div>
                    {statusRaw === "ready" && fileUrl && (
                      <Link
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-[#ec2227] hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {videoPages > 1 && (
            <div className="mt-4 flex justify-end gap-2 text-xs">
              {Array.from({ length: videoPages }).map((_, i) => {
                const p = i + 1;
                const is = p === page;
                return (
                  <Link
                    key={p}
                    href={`?page=${p}`}
                    className={
                      "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[11px] " +
                      (is
                        ? "border-[#ec2227] bg-[#ec2227] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                    }
                    prefetch={false}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 shadow-sm flex flex-col items-start justify-between sm:col-span-2">
          <div>
            <h2 className="font-medium text-slate-700 mb-2">
              Angler Submissions
            </h2>
            <p className="text-xs text-slate-500">
              Future: curate photos submitted by your guests.
            </p>
          </div>
          <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-30">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
