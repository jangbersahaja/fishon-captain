import authOptions from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
// import DebugPanel from "./DebugPanel";

export const dynamic = "force-dynamic";

export default async function DevDebugPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/dev/debug");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Only allow in dev
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <h1 className="text-xl font-semibold text-red-900 mb-2">
            Debug Panel - Development Only
          </h1>
          <p className="text-red-700">
            This debug panel is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  // Deprecated: PendingMedia debug removed
  // const enrichedPending: unknown[] = [];

  // Get environment info
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "unset",
    VERCEL_URL: process.env.VERCEL_URL || "unset",
    QSTASH_TOKEN: process.env.QSTASH_TOKEN ? "set" : "unset",
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY
      ? "set"
      : "unset",
    EXTERNAL_WORKER_URL: process.env.EXTERNAL_WORKER_URL || "unset",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "set" : "unset",
    BLOB_HOSTNAME: process.env.BLOB_HOSTNAME || "unset",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          🔧 Media Pipeline Debug Panel
        </h1>
        <p className="text-slate-600">
          Development-only debugging interface for video processing pipeline
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        PendingMedia debug has been removed. Use the CaptainVideo tools instead.
      </div>
    </div>
  );
}
