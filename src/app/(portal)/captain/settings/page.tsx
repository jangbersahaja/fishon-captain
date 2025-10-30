import NotificationSettings from "@/components/captain/NotificationSettings";
import { Separator } from "@/components/ui/separator";
import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaptainSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth?mode=signin");

  return (
    <div className="px-6 py-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account and notification preferences
        </p>
      </div>

      <Separator />

      {/* Notification Settings Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <NotificationSettings />
      </div>

      <Separator />

      {/* Future Settings */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Additional Settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Planned items:
          <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
            <li>Default trip visibility toggles</li>
            <li>Pricing display options</li>
            <li>Experimental feature opt-ins</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
