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
import type { CampaignFormData } from "@/lib/services/campaign-api";
import { Gift, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { useState } from "react";

interface CampaignFormPreviewProps {
  formData: CampaignFormData;
  onClose: () => void;
}

export function CampaignFormPreview({
  formData,
  onClose,
}: CampaignFormPreviewProps) {
  const [selectedPlacementIndex, setSelectedPlacementIndex] = useState(0);
  const [locale, setLocale] = useState<"en" | "ms">("en");
  const [devicePreview, setDevicePreview] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  const selectedPlacement = formData.placements[selectedPlacementIndex];
  const content = locale === "en" ? formData.contentEn : formData.contentMy;
  const layoutConfig = selectedPlacement?.layoutConfig || {};
  const variant = (layoutConfig.variant as string) || "card";

  // Check if content has minimum required fields
  const hasContent = content.title || content.subtitle || content.cta;

  // Device preview container widths
  const deviceWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Preview: {formData.code || "Untitled Campaign"}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                formData.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : formData.status === "DRAFT"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {formData.status}
            </span>
          </DialogTitle>
          <DialogDescription>
            See how your campaign will appear to users. Changes are not saved
            until you submit the form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* No Placements Warning */}
          {formData.placements.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
              <p className="font-medium">No placements configured</p>
              <p className="text-sm mt-1">
                Add at least one placement to see where your campaign will
                appear.
              </p>
            </div>
          )}

          {/* Top Controls */}
          <div className="flex flex-wrap items-center gap-4 border-b pb-4">
            {/* Placement Selector */}
            {formData.placements.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  Placement:
                </span>
                <div className="flex gap-1">
                  {formData.placements.map((placement, idx) => (
                    <Button
                      key={idx}
                      variant={
                        selectedPlacementIndex === idx ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedPlacementIndex(idx)}
                      className="text-xs"
                    >
                      {placement.placementKey || `Placement ${idx + 1}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Device Preview Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-slate-600">
                Device:
              </span>
              <div className="flex border rounded-lg">
                <button
                  type="button"
                  onClick={() => setDevicePreview("desktop")}
                  className={`p-2 ${devicePreview === "desktop" ? "bg-slate-100" : ""}`}
                  title="Desktop"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("tablet")}
                  className={`p-2 border-x ${devicePreview === "tablet" ? "bg-slate-100" : ""}`}
                  title="Tablet"
                >
                  <Tablet className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("mobile")}
                  className={`p-2 ${devicePreview === "mobile" ? "bg-slate-100" : ""}`}
                  title="Mobile"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Language Tabs */}
          <Tabs
            value={locale}
            onValueChange={(v) => setLocale(v as "en" | "ms")}
          >
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ms">Bahasa Malaysia</TabsTrigger>
            </TabsList>

            <TabsContent value={locale} className="space-y-4 mt-4">
              {/* Placement Meta Info */}
              {selectedPlacement && (
                <div className="bg-slate-50 p-3 rounded-lg text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-500">Position:</span>{" "}
                    <span className="font-medium">
                      {selectedPlacement.position}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Devices:</span>{" "}
                    <span className="font-medium">
                      {selectedPlacement.devices.join(", ") || "All"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Variant:</span>{" "}
                    <span className="font-medium capitalize">{variant}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sticky:</span>{" "}
                    <span className="font-medium">
                      {selectedPlacement.sticky ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Container */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-100 overflow-hidden mx-auto transition-all duration-300"
                style={{
                  maxWidth: deviceWidths[devicePreview],
                  minHeight: "300px",
                }}
              >
                {!hasContent ? (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <div className="text-center">
                      <p className="font-medium">No content to preview</p>
                      <p className="text-sm mt-1">
                        Add a title, subtitle, or CTA to see the preview.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={variant === "bar" ? "" : "p-4 md:p-8"}>
                    {/* Render different variants */}
                    {variant === "bar" ? (
                      <BarPreview content={content} />
                    ) : variant === "modal" ? (
                      <ModalPreview content={content} />
                    ) : (
                      <CardPreview content={content} />
                    )}
                  </div>
                )}
              </div>

              {/* Device Not Targeted Warning */}
              {selectedPlacement &&
                !selectedPlacement.devices.includes(
                  devicePreview.toUpperCase()
                ) && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    ⚠️ This placement is not configured to show on{" "}
                    {devicePreview} devices. It targets:{" "}
                    {selectedPlacement.devices.join(", ")}
                  </div>
                )}

              {/* Content Summary */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium mb-2 text-slate-600">
                  View Content Details
                </summary>
                <div className="bg-slate-50 p-4 rounded grid gap-2 text-sm">
                  <div>
                    <strong>Title:</strong> {content.title || "(empty)"}
                  </div>
                  <div>
                    <strong>Subtitle:</strong> {content.subtitle || "(empty)"}
                  </div>
                  <div>
                    <strong>CTA:</strong> {content.cta || "(empty)"}
                  </div>
                  {content.benefits && content.benefits.length > 0 && (
                    <div>
                      <strong>Benefits:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {content.benefits.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.imageUrl && (
                    <div>
                      <strong>Image:</strong> ✓ Uploaded
                    </div>
                  )}
                </div>
              </details>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// CARD VARIANT - Matches fishon-market CardVariant
// For sidebar placements (desktop)
// ============================================
function CardPreview({
  content,
}: {
  content: {
    title: string;
    subtitle: string;
    cta: string;
    benefits?: string[];
    imageUrl?: string;
  };
}) {
  return (
    <div className="relative bg-white rounded-lg border border-[#ec2227]/20 p-6 shadow-lg max-w-[350px] mx-auto">
      {/* Dismiss button (preview only) */}
      <button
        type="button"
        className="absolute top-3 right-3 text-gray-400 hover:text-[#ec2227] transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="mb-4">
        {/* Badge */}
        <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium bg-[#ec2227] text-white rounded">
          New Member Offer
        </span>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 uppercase font-oswald">
          {content.title || "Campaign Title"}
        </h3>
        <p className="text-sm text-gray-600">{content.subtitle || "Campaign subtitle goes here"}</p>
      </div>

      {content.benefits && content.benefits.length > 0 && (
        <ul className="mb-6 space-y-2">
          {content.benefits
            .filter((b) => b.trim())
            .map((benefit, idx) => (
              <li
                key={idx}
                className="flex items-start text-sm text-gray-700"
              >
                <span className="text-[#ec2227] mr-2 flex-shrink-0">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
        </ul>
      )}

      <Button className="w-full bg-[#ec2227] hover:bg-[#d11f24] text-white" size="lg">
        {content.cta || "Learn More"}
      </Button>
    </div>
  );
}

// ============================================
// BAR VARIANT - Matches fishon-market BarVariant
// For mobile bottom placements
// ============================================
function BarPreview({
  content,
}: {
  content: {
    title: string;
    subtitle: string;
    cta: string;
    imageUrl?: string;
  };
}) {
  return (
    <div className="bg-white border-t border-[#ec2227]/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          {/* Icon circle */}
          <div className="shrink-0 w-10 h-10 bg-[#ec2227]/10 rounded-full flex items-center justify-center">
            <Gift className="h-5 w-5 text-[#ec2227]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {content.title || "Campaign Title"}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {content.subtitle || "Subtitle"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="shrink-0 bg-[#ec2227] hover:bg-[#d11f24] text-white"
        >
          {content.cta || "Go"}
        </Button>

        {/* Dismiss button */}
        <button
          type="button"
          className="shrink-0 text-gray-400 hover:text-[#ec2227] transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// MODAL VARIANT - Matches fishon-market ModalVariant
// For interstitial/welcome placements
// ============================================
function ModalPreview({
  content,
}: {
  content: {
    title: string;
    subtitle: string;
    cta: string;
    benefits?: string[];
    imageUrl?: string;
  };
}) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[400px] bg-black/60 rounded-lg">
      <div className="bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] rounded-xl shadow-2xl max-w-md w-full p-6 relative text-white border border-white/10">
        {/* Close button */}
        <button
          type="button"
          className="absolute top-3 right-3 z-10 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6 text-center">
          {content.imageUrl ? (
            <div className="relative w-full h-48 mx-auto mb-5 overflow-hidden rounded-lg shadow-md bg-white/5">
              <img
                src={content.imageUrl}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-3xl">🎣</span>
            </div>
          )}
          <h2 className="mb-2 text-2xl font-semibold text-white uppercase font-oswald drop-shadow-sm">
            {content.title || "Welcome!"}
          </h2>
          <p className="font-medium text-white/90">
            {content.subtitle || "Check out our latest offer"}
          </p>
        </div>

        {content.benefits && content.benefits.length > 0 && (
          <div className="p-4 mb-6 space-y-3 rounded-lg bg-black/10">
            {content.benefits
              .filter((b) => b.trim())
              .map((benefit, idx) => (
                <div key={idx} className="flex items-center text-sm text-white">
                  <span className="bg-white text-[#ec2227] rounded-full w-5 h-5 flex items-center justify-center mr-3 text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span>{benefit}</span>
                </div>
              ))}
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full bg-white text-[#ec2227] hover:bg-gray-50 font-bold shadow-lg border-0"
            size="lg"
          >
            {content.cta || "Get Started"}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-white hover:bg-white/10 hover:text-white"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}