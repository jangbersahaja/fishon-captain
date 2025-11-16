import NotificationSettings from "@/components/captain/NotificationSettings";
import OAuthAccountLinking from "@/components/captain/OAuthAccountLinking";
import PasswordManagement from "@/components/captain/PasswordManagement";
import { PWASettings } from "@/components/pwa";
import { Separator } from "@/components/ui/separator";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaptainSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth?mode=signin");

  // Fetch user's password status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      passwordHash: true,
    },
  });

  const hasPassword = !!user?.passwordHash;

  return (
    <div className="px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account and notification preferences
        </p>
      </div>

      <Separator />

      {/* Account Security Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Account Security
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your sign-in methods and connected accounts
          </p>
        </div>
        <div className="space-y-6">
          <PasswordManagement hasPassword={hasPassword} />
          <OAuthAccountLinking />
        </div>
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

      {/* PWA Settings Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Progressive Web App
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Install the app and manage offline features
          </p>
        </div>
        <PWASettings />
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
        <div className="p-6 text-sm bg-white border border-dashed rounded-xl border-slate-300 text-slate-500">
          Planned items:
          <ul className="pl-5 mt-2 space-y-1 text-xs list-disc">
            <li>Default trip visibility toggles</li>
            <li>Pricing display options</li>
            <li>Experimental feature opt-ins</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
