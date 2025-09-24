import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaptainSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth?mode=signin");
  // Future: load lightweight preferences / toggles
  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Settings
      </h1>
      <p className="text-sm text-slate-500">
        General account & charter preferences (coming soon).
      </p>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Planned items:
        <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
          <li>Notification preferences</li>
          <li>Default trip visibility toggles</li>
          <li>Pricing display options</li>
          <li>Experimental feature opt-ins</li>
        </ul>
      </div>
    </div>
  );
}
