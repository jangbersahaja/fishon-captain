"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Campaign } from "@/lib/services/campaign-api";
import { useState } from "react";

interface CampaignPreviewModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export function CampaignPreviewModal({
  campaign,
  onClose,
}: CampaignPreviewModalProps) {
  const [selectedPlacement, setSelectedPlacement] = useState(
    campaign.placements[0]
  );
  const [locale, setLocale] = useState<"en" | "ms">("en");

  const content = locale === "en" ? campaign.contentEn : campaign.contentMy;
  const layoutConfig = (selectedPlacement?.layoutConfig || {}) as Record<
    string,
    unknown
  >;
  const variant = (layoutConfig?.variant as string)?.toLowerCase() || "card";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Preview: {campaign.code}</DialogTitle>
          <DialogDescription>
            Preview how this campaign will appear across different placements
            and languages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Placement Selector */}
          {campaign.placements.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Placement:
              </label>
              <div className="flex flex-wrap gap-2">
                {campaign.placements.map((placement, idx) => (
                  <Button
                    key={idx}
                    variant={
                      selectedPlacement?.placementKey === placement.placementKey
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedPlacement(placement)}
                  >
                    {placement.placementKey}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Language Tabs */}
          <Tabs
            value={locale}
            onValueChange={(v) => setLocale(v as "en" | "ms")}
          >
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ms">Bahasa Malaysia</TabsTrigger>
            </TabsList>

            <TabsContent value={locale} className="space-y-4">
              {/* Placement Info */}
              {selectedPlacement && (
                <div className="bg-slate-50 p-4 rounded-lg text-sm">
                  <p>
                    <strong>Position:</strong> {selectedPlacement.position}
                  </p>
                  <p>
                    <strong>Devices:</strong>{" "}
                    {selectedPlacement.devices.join(", ")}
                  </p>
                  <p>
                    <strong>Variant:</strong> {variant.toUpperCase()}
                  </p>
                </div>
              )}

              {/* Preview Container */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                <div className="flex items-center justify-center min-h-[200px]">
                  <div
                    className={`w-full ${variant === "modal" ? "max-w-[600px]" : variant === "bar" ? "" : "max-w-[350px]"}`}
                  >
                    {/* Simple Preview Card */}
                    <div className="bg-white rounded-lg shadow-lg border p-6">
                      {content.imageUrl && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img
                            src={content.imageUrl}
                            alt="Campaign"
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {content.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {content.subtitle}
                      </p>
                      {content.benefits && content.benefits.length > 0 && (
                        <ul className="text-sm text-slate-600 mb-4 space-y-1">
                          {content.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button className="w-full bg-[#ec2227] hover:bg-[#d41e23]">
                        {content.cta}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content JSON */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium mb-2">
                  View Content JSON
                </summary>
                <pre className="bg-slate-100 p-4 rounded overflow-x-auto text-xs">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </details>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
