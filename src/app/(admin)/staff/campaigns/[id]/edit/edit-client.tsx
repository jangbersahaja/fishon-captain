"use client";

import { Button } from "@/components/ui/button";
import { updateCampaign } from "@/lib/admin/campaign-actions";
import type { CampaignFormData } from "@/lib/services/campaign-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignForm } from "../../_components/CampaignForm";

interface EditCampaignClientProps {
  campaignId: string;
  initialData: CampaignFormData;
}

export function EditCampaignClient({
  campaignId,
  initialData,
}: EditCampaignClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CampaignFormData) => {
    setError(null);

    const result = await updateCampaign(campaignId, data);

    if (result.success) {
      toast.success("Campaign updated", {
        description: `Campaign "${data.code}" has been updated successfully.`,
      });
      router.push("/staff/campaigns");
      router.refresh();
    } else {
      setError(result.error || "Failed to update campaign");
      toast.error("Error", {
        description: result.error || "Failed to update campaign",
      });
    }
  };

  return (
    <div className="px-6 py-8 mx-auto max-w-5xl">
      <div className="mb-8">
        <Link href="/staff/campaigns">
          <Button variant="outline" className="mb-4">
            ← Back to Campaigns
          </Button>
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          Edit Campaign
        </h1>
        <p className="text-slate-600">Campaign Code: {initialData.code}</p>
      </div>

      {error && (
        <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <CampaignForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel="Update Campaign"
      />
    </div>
  );
}
