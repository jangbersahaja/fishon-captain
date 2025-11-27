import { Button } from "@/components/ui/button";
import { getCampaignForEdit } from "@/lib/admin/campaign-actions";
import Link from "next/link";
import { EditCampaignClient } from "./edit-client";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCampaignForEdit(id);

  if (!result.success || !result.campaign) {
    return (
      <div className="px-6 py-8 mx-auto">
        <div className="mb-8">
          <Link href="/staff/campaigns">
            <Button variant="outline" className="mb-4">
              ← Back to Campaigns
            </Button>
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Edit Campaign
          </h1>
        </div>

        <div className="max-w-4xl p-8 bg-white rounded-lg shadow">
          <p className="text-center text-red-600">
            {result.error || "Campaign not found"}
          </p>
        </div>
      </div>
    );
  }

  const campaign = result.campaign;

  // Transform campaign data to form data format
  const initialData = {
    code: campaign.code,
    type: campaign.type,
    status: campaign.status,
    priority: campaign.priority,
    startDate: campaign.startDate ? new Date(campaign.startDate) : null,
    endDate: campaign.endDate ? new Date(campaign.endDate) : null,
    targetGuests: campaign.targetGuests,
    targetRegistered: campaign.targetRegistered,
    excludeRoles: campaign.excludeRoles,
    allowedPages: campaign.allowedPages,
    allowedDevices: campaign.allowedDevices,
    contentEn: campaign.contentEn,
    contentMy: campaign.contentMy,
    dismissalStrategy: campaign.dismissalStrategy,
    cooldownDays: campaign.cooldownDays,
    maxDismissals: campaign.maxDismissals,
    placements: campaign.placements.map((p) => ({
      placementKey: p.placementKey,
      devices: p.devices,
      position: p.position,
      sticky: p.sticky,
      displayRules: p.displayRules,
      layoutConfig: p.layoutConfig,
    })),
  };

  return <EditCampaignClient campaignId={id} initialData={initialData} />;
}
