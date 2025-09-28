import authOptions from "@/lib/auth";
import clsx from "clsx";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import PipelineSection from "./PipelineSection";
import StorageSection from "./StorageSection";
import { loadPipelineData, loadStorageData } from "./data";
import { buildHref, getParam, parseTab, SearchParams } from "./shared";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function StaffMediaPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/media");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const tab = parseTab(getParam(searchParams, "tab"));

  const [pipelineData, storageData] = await Promise.all([
    tab === "pipeline" ? loadPipelineData(searchParams) : Promise.resolve(null),
    tab === "storage" ? loadStorageData(searchParams) : Promise.resolve(null),
  ]);

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Staff media tools
        </h1>
        <p className="text-sm text-slate-500">
          Monitor uploads flowing through PendingMedia or audit every file in
          blob storage. Use the tabs to switch between pipeline health and
          storage housekeeping.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref("/staff/media", searchParams, { tab: "pipeline" })}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium",
            tab === "pipeline"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Pending pipeline
        </Link>
        <Link
          href={buildHref("/staff/media", searchParams, { tab: "storage" })}
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
        <StorageSection data={storageData} searchParams={searchParams} />
      ) : null}
      {tab === "pipeline" && pipelineData ? (
        <PipelineSection data={pipelineData} searchParams={searchParams} />
      ) : null}
    </div>
  );
}
