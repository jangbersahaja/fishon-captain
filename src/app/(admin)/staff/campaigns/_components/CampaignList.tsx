"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteCampaign } from "@/lib/admin/campaign-actions";
import type { Campaign } from "@/lib/services/campaign-api";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignPreviewModal } from "./CampaignPreviewModal";

interface CampaignListProps {
  campaigns: Campaign[];
}

export function CampaignList({ campaigns }: CampaignListProps) {
  const router = useRouter();
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (campaign: Campaign) => {
    if (
      !confirm(`Are you sure you want to delete campaign "${campaign.code}"?`)
    ) {
      return;
    }

    setDeletingId(campaign.id);
    const result = await deleteCampaign(campaign.id);

    if (result.success) {
      toast.success("Campaign deleted", {
        description: `Campaign "${campaign.code}" has been deleted.`,
      });
      router.refresh();
    } else {
      toast.error("Error", {
        description: result.error || "Failed to delete campaign",
      });
    }
    setDeletingId(null);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "PAUSED":
        return "secondary";
      case "COMPLETED":
        return "outline";
      case "ARCHIVED":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/staff/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No campaigns found</p>
            <Link href="/staff/campaigns/new">
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create your first campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.code}
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Priority: {campaign.priority} •{" "}
                      {campaign.placements.length} placement(s) •{" "}
                      {campaign.type.replace(/_/g, " ")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewCampaign(campaign)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Link href={`/staff/campaigns/${campaign.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(campaign)}
                      disabled={deletingId === campaign.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Content (EN):</p>
                    <p className="text-sm text-slate-600">
                      {campaign.contentEn.title} - {campaign.contentEn.subtitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Placements:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {campaign.placements.map((p, idx) => (
                        <Badge key={idx} variant="outline">
                          {p.placementKey} ({p.position})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>
                      Active from{" "}
                      {campaign.startDate
                        ? new Date(campaign.startDate).toLocaleDateString()
                        : "N/A"}{" "}
                      to{" "}
                      {campaign.endDate
                        ? new Date(campaign.endDate).toLocaleDateString()
                        : "indefinite"}
                    </span>
                    <span>•</span>
                    <span>
                      {campaign.impressions} impressions • {campaign.clicks}{" "}
                      clicks
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewCampaign && (
        <CampaignPreviewModal
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
        />
      )}
    </>
  );
}
