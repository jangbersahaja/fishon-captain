import authOptions from "@/lib/auth";
import clsx from "clsx";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import StorageSection from "./StorageSection";
import VideoSection from "./VideoSection";
import { loadStorageData, loadVideoData } from "./data";
import { buildHref, getParam, parseTab, SearchParams } from "./shared";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function StaffMediaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/media");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const sp = searchParams ? await searchParams : {};
  const tab = parseTab(getParam(sp, "tab"));

  const [videoData, storageData] = await Promise.all([
    tab === "videos" || !tab ? loadVideoData(sp) : Promise.resolve(null),
    tab === "storage" ? loadStorageData(sp) : Promise.resolve(null),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Staff media tools
        </h1>
        <p className="text-sm text-slate-500">
          Monitor captain video uploads, processing status, and analytics. Use
          the tabs to switch between video pipeline health and storage
          housekeeping.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref("/staff/media", sp, { tab: "videos" })}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium",
            tab === "videos" || !tab
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Video Pipeline
        </Link>
        <Link
          href={buildHref("/staff/media", sp, { tab: "storage" })}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium",
            tab === "storage"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Storage inventory
        </Link>
      </div>

      {tab === "storage" && storageData ? (
        <StorageSection data={storageData} searchParams={sp} />
      ) : null}
      {(tab === "videos" || !tab) && videoData ? (
        <VideoSection data={videoData} searchParams={sp} />
      ) : null}
    </div>
  );
}
