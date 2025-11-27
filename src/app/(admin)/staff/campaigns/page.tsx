import { getAllCampaigns } from "@/lib/admin/campaign-actions";
import { CampaignList } from "./_components/CampaignList";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const result = await getAllCampaigns();

  if (!result.success) {
    return (
      <div className="px-6 py-8 mx-auto space-y-6">
        <div className="p-4 text-red-800 bg-red-100 border border-red-200 rounded-lg">
          <p className="font-medium">Error loading campaigns</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Campaign Management
        </h1>
        <p className="text-slate-600">
          Create, edit, and preview promotional campaigns
        </p>
      </div>

      <CampaignList campaigns={result.campaigns || []} />
    </div>
  );
}
