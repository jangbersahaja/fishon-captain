"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    PLACEMENT_SLOTS,
    getPlacementByKey
} from "@/lib/constants/campaign-placements";
import type {
    CampaignFormData,
    CampaignPlacement,
} from "@/lib/services/campaign-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    CalendarIcon,
    Copy,
    Eye,
    HelpCircle,
    Info,
    Plus,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { CampaignFormPreview } from "./CampaignFormPreview";
import { ImageUploadField } from "./ImageUploadField";
import { PlacementMiniPreview } from "./PlacementPreviews";

interface CampaignFormProps {
  initialData?: Partial<CampaignFormData>;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  submitLabel?: string;
}

// Campaign Type options with descriptions
const campaignTypes = [
  {
    value: "REGISTRATION_INCENTIVE",
    label: "Registration Incentive",
    description: "Encourage new user sign-ups with special offers",
  },
  {
    value: "SEASONAL_PROMOTION",
    label: "Seasonal Promotion",
    description: "Time-limited offers for holidays or seasons",
  },
  {
    value: "PARTNER_OFFER",
    label: "Partner Offer",
    description: "Promotions from partners or affiliates",
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcement",
    description: "System announcements or important updates",
  },
] as const;

const campaignStatuses = [
  { value: "DRAFT", label: "Draft", description: "Not visible to users" },
  {
    value: "ACTIVE",
    label: "Active",
    description: "Live and showing to users",
  },
  { value: "PAUSED", label: "Paused", description: "Temporarily hidden" },
  { value: "COMPLETED", label: "Completed", description: "Campaign has ended" },
  { value: "ARCHIVED", label: "Archived", description: "Stored for reference" },
] as const;

const dismissalStrategies = [
  {
    value: "SESSION_ONLY",
    label: "Session Only",
    description: "Banner dismissed for current browser session only",
  },
  {
    value: "SESSION_WITH_COOLDOWN",
    label: "Session with Cooldown",
    description: "Reappears after X days (configure below)",
  },
  {
    value: "PERMANENT",
    label: "Permanent",
    description: "Never show again after user dismisses",
  },
  {
    value: "MAX_DISMISSALS",
    label: "Max Dismissals",
    description: "Stop showing after X dismissals",
  },
] as const;

const userRoles = ["CAPTAIN", "STAFF", "ADMIN"];

export function CampaignForm({
  initialData,
  onSubmit,
  submitLabel = "Create Campaign",
}: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    code: initialData?.code || "",
    type: initialData?.type || "REGISTRATION_INCENTIVE",
    status: initialData?.status || "DRAFT",
    priority: initialData?.priority || 50,
    startDate: initialData?.startDate || null,
    endDate: initialData?.endDate || null,
    targetGuests: initialData?.targetGuests ?? true,
    targetRegistered: initialData?.targetRegistered ?? false,
    excludeRoles: initialData?.excludeRoles || [],
    allowedPages: initialData?.allowedPages || ["home"],
    allowedDevices: initialData?.allowedDevices || ["DESKTOP", "MOBILE"],
    contentEn: initialData?.contentEn || {
      title: "",
      subtitle: "",
      cta: "",
      benefits: [],
    },
    contentMy: initialData?.contentMy || {
      title: "",
      subtitle: "",
      cta: "",
      benefits: [],
    },
    dismissalStrategy: initialData?.dismissalStrategy || "SESSION_ONLY",
    cooldownDays: initialData?.cooldownDays || null,
    maxDismissals: initialData?.maxDismissals || null,
    placements: initialData?.placements || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Auto-compute allowedPages and allowedDevices from selected placements
      const pagesSet = new Set<string>();
      const devicesSet = new Set<string>();
      
      formData.placements.forEach((placement) => {
        const slot = getPlacementByKey(placement.placementKey);
        if (slot) {
          slot.pages.forEach((page) => pagesSet.add(page));
          slot.devices.forEach((device) => devicesSet.add(device));
        }
      });
      
      const computedData: CampaignFormData = {
        ...formData,
        allowedPages: Array.from(pagesSet),
        allowedDevices: Array.from(devicesSet),
      };
      
      await onSubmit(computedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Benefits helpers
  const addBenefit = (locale: "en" | "my") => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits: [...(formData[key].benefits || []), ""],
      },
    });
  };

  const updateBenefit = (locale: "en" | "my", index: number, value: string) => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    const benefits = [...(formData[key].benefits || [])];
    benefits[index] = value;
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits,
      },
    });
  };

  const removeBenefit = (locale: "en" | "my", index: number) => {
    const key = locale === "en" ? "contentEn" : "contentMy";
    const benefits =
      formData[key].benefits?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      [key]: {
        ...formData[key],
        benefits,
      },
    });
  };

  // Toggle helpers
  const toggleRole = (role: string) => {
    const current = formData.excludeRoles;
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setFormData({ ...formData, excludeRoles: updated });
  };

  // Placement helpers
  const removePlacement = (index: number) => {
    setFormData({
      ...formData,
      placements: formData.placements.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Campaign Overview Info Box */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertTitle className="text-blue-800">How Campaigns Work</AlertTitle>
        <AlertDescription className="text-blue-700">
          <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
            <li>
              <strong>Allowed Pages</strong> determines which pages can show the
              campaign
            </li>
            <li>
              <strong>Placements</strong> define exactly where and how the
              banner appears (sidebar, modal, etc.)
            </li>
            <li>
              <strong>Devices</strong> control which screen sizes see the
              campaign
            </li>
            <li>
              Campaigns are displayed using the{" "}
              <code className="px-1 bg-blue-100 rounded">CampaignContainer</code>{" "}
              component on each page
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Basic Information */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="code">Campaign Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-"),
                })
              }
              placeholder="e.g., welcome-2025"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Unique identifier. Used in placement keys and tracking.
            </p>
          </div>

          <div>
            <Label htmlFor="type">Campaign Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: CampaignFormData["type"]) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div>{type.label}</div>
                      <div className="text-xs text-slate-500">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: CampaignFormData["status"]) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div>
                      <div>{status.label}</div>
                      <div className="text-xs text-slate-500">
                        {status.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              Only ACTIVE campaigns are shown to users.
            </p>
          </div>

          <div>
            <Label htmlFor="priority">Priority (0-100)</Label>
            <Input
              id="priority"
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: Math.min(
                    100,
                    Math.max(0, parseInt(e.target.value) || 50)
                  ),
                })
              }
              min={0}
              max={100}
            />
            <p className="mt-1 text-xs text-slate-500">
              Higher priority campaigns show first when multiple match.
            </p>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Scheduling</h2>
        <p className="mb-4 text-sm text-slate-600">
          Leave empty for no date restrictions. Campaign will show immediately
          when ACTIVE.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Start Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.startDate
                    ? format(formData.startDate, "PPP")
                    : "No start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startDate || undefined}
                  onSelect={(date) =>
                    setFormData({ ...formData, startDate: date || null })
                  }
                  initialFocus
                />
                {formData.startDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setFormData({ ...formData, startDate: null })
                      }
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>End Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.endDate
                    ? format(formData.endDate, "PPP")
                    : "No end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.endDate || undefined}
                  onSelect={(date) =>
                    setFormData({ ...formData, endDate: date || null })
                  }
                  initialFocus
                />
                {formData.endDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setFormData({ ...formData, endDate: null })
                      }
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Targeting Rules */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Targeting Rules</h2>
          <Popover>
            <PopoverTrigger>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <p className="text-sm">
                Targeting rules filter WHO sees the campaign. The campaign must
                match ALL rules to be shown.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-6">
          {/* User Types */}
          <div>
            <Label className="mb-2 text-base">Target Audience *</Label>
            <p className="mb-3 text-sm text-slate-500">
              Select at least one user type to target.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetGuests"
                  checked={formData.targetGuests}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, targetGuests: !!checked })
                  }
                />
                <Label htmlFor="targetGuests" className="font-normal">
                  <span className="font-medium">Guests</span>
                  <span className="text-slate-500"> — Users not logged in</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetRegistered"
                  checked={formData.targetRegistered}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, targetRegistered: !!checked })
                  }
                />
                <Label htmlFor="targetRegistered" className="font-normal">
                  <span className="font-medium">Registered Users</span>
                  <span className="text-slate-500"> — Logged in users</span>
                </Label>
              </div>
            </div>
          </div>

          {/* Exclude Roles */}
          <div>
            <Label className="mb-2 text-base">Exclude Roles (Optional)</Label>
            <p className="mb-3 text-sm text-slate-500">
              These user roles will NOT see the campaign even if they match
              other criteria.
            </p>
            <div className="flex flex-wrap gap-4">
              {userRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.excludeRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="font-normal">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Placements Section */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Placements</h2>
            <Popover>
              <PopoverTrigger>
                <HelpCircle className="w-4 h-4 text-slate-400" />
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Placements</strong> define WHERE the campaign banner
                    appears. Each placement slot is pre-configured with the
                    correct position, device, and variant.
                  </p>
                  <p className="text-amber-600">
                    ⚠️ Without placements, the campaign won&apos;t be displayed.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {formData.placements.length === 0 ? (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="w-4 h-4 text-amber-600" />
            <AlertTitle className="text-amber-800">No Placements</AlertTitle>
            <AlertDescription className="text-amber-700">
              Select at least one placement to define where this campaign will
              appear.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.placements.map((placement, index) => {
              const slot = getPlacementByKey(placement.placementKey);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg"
                >
                  <div>
                    <span className="font-medium">{slot?.label || placement.placementKey}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {slot?.variant} • {slot?.devices.join(", ")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePlacement(index)}
                    className="w-6 h-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Placements Grid */}
        <div>
          <Label className="mb-2 text-base">Add Placements</Label>
          <p className="mb-3 text-sm text-slate-500">
            Click to add a placement. Each slot can only be used once per campaign.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {PLACEMENT_SLOTS.map((slot) => {
              const isSelected = formData.placements.some(
                (p) => p.placementKey === slot.key
              );
              const isDisabled = !slot.implemented;
              
              // Check for conflicting bottom-bar placements
              // global-bottom-bar conflicts with page-specific bottom bars
              const selectedKeys = formData.placements.map((p) => p.placementKey);
              const hasGlobalBottomBar = selectedKeys.includes("global-bottom-bar");
              const pageSpecificBottomBars = ["search-bottom-bar", "charter-detail-bottom-bar"];
              const hasPageSpecificBottomBar = selectedKeys.some((k) =>
                pageSpecificBottomBars.includes(k)
              );
              
              const isConflicting =
                (slot.key === "global-bottom-bar" && hasPageSpecificBottomBar) ||
                (pageSpecificBottomBars.includes(slot.key) && hasGlobalBottomBar);
              
              const conflictMessage = isConflicting
                ? slot.key === "global-bottom-bar"
                  ? "Conflicts with page-specific bottom bars"
                  : "Conflicts with Global Bottom Bar"
                : null;

              return (
                <button
                  key={slot.key}
                  type="button"
                  disabled={isSelected || isDisabled || isConflicting}
                  onClick={() => {
                    if (!isSelected && slot.implemented && !isConflicting) {
                      const newPlacement: Omit<CampaignPlacement, "id"> = {
                        placementKey: slot.key,
                        devices: [...slot.devices],
                        position: slot.position,
                        sticky: slot.position === "RIGHT_SIDEBAR",
                        displayRules: {},
                        layoutConfig: { variant: slot.variant },
                      };
                      setFormData({
                        ...formData,
                        placements: [...formData.placements, newPlacement],
                      });
                    }
                  }}
                  className={cn(
                    "flex flex-col border rounded-lg transition-colors overflow-hidden",
                    isSelected && "bg-green-50 border-green-300",
                    isDisabled && "opacity-50 cursor-not-allowed bg-slate-50",
                    isConflicting && "opacity-50 cursor-not-allowed bg-red-50 border-red-200",
                    !isSelected && !isDisabled && !isConflicting && "hover:bg-blue-50 hover:border-blue-300"
                  )}
                >
                  {/* Mini Preview */}
                  <div className="bg-slate-50 p-3 border-b">
                    <PlacementMiniPreview variant={slot.variant} placementKey={slot.key} />
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-3 text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{slot.label}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
                          Added
                        </span>
                      )}
                      {isDisabled && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">
                          Not Ready
                        </span>
                      )}
                      {isConflicting && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded">
                          Conflict
                        </span>
                      )}
                      {!isSelected && !isDisabled && !isConflicting && (
                        <Plus className="w-4 h-4 ml-auto text-blue-500" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {isConflicting ? (
                        <span className="text-red-600">{conflictMessage}</span>
                      ) : (
                        slot.description
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded capitalize">{slot.variant}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded">{slot.devices.join(", ")}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded">{slot.pages.join(", ")}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content - English */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">Content (English) *</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contentEn-title">Title</Label>
            <Input
              id="contentEn-title"
              value={formData.contentEn.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, title: e.target.value },
                })
              }
              placeholder="e.g., Welcome to Fishon!"
              required
            />
          </div>

          <div>
            <Label htmlFor="contentEn-subtitle">Subtitle</Label>
            <Textarea
              id="contentEn-subtitle"
              value={formData.contentEn.subtitle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: {
                    ...formData.contentEn,
                    subtitle: e.target.value,
                  },
                })
              }
              placeholder="e.g., Sign up today and get exclusive benefits"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="contentEn-cta">Call-to-Action Button Text</Label>
            <Input
              id="contentEn-cta"
              value={formData.contentEn.cta}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, cta: e.target.value },
                })
              }
              placeholder="e.g., Sign Up Now"
              required
            />
          </div>

          <div>
            <Label htmlFor="contentEn-ctaHref">CTA Link (Optional)</Label>
            <Input
              id="contentEn-ctaHref"
              value={formData.contentEn.ctaHref || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, ctaHref: e.target.value || undefined },
                })
              }
              placeholder="e.g., /search or https://example.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave empty to link to registration page. Use relative paths (e.g., /search) or full URLs.
            </p>
          </div>

          <div className="space-y-1">
            <ImageUploadField
              label="Campaign Image (Optional)"
              value={formData.contentEn.imageUrl}
              onChange={(url) =>
                setFormData({
                  ...formData,
                  contentEn: { ...formData.contentEn, imageUrl: url },
                })
              }
              campaignCode={formData.code}
              id="contentEn-imageUrl"
              helpText="Recommended: 800x600px. Used for modal and card variants."
            />
            {formData.contentMy.imageUrl &&
              formData.contentMy.imageUrl !== formData.contentEn.imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:underline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      contentEn: {
                        ...formData.contentEn,
                        imageUrl: formData.contentMy.imageUrl,
                      },
                    })
                  }
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Use same image as Malay version
                </Button>
              )}
          </div>

          <div>
            <Label className="mb-2">Benefits List (Optional)</Label>
            <p className="mb-2 text-xs text-slate-500">
              Bullet points shown in card and modal variants.
            </p>
            {formData.contentEn.benefits?.map((benefit, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit("en", index, e.target.value)}
                  placeholder="e.g., Access to 100+ verified charters"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeBenefit("en", index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBenefit("en")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Benefit
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Malay */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="mb-4 text-xl font-semibold">
          Content (Bahasa Malaysia) *
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contentMy-title">Tajuk</Label>
            <Input
              id="contentMy-title"
              value={formData.contentMy.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, title: e.target.value },
                })
              }
              placeholder="e.g., Selamat Datang ke Fishon!"
              required
            />
          </div>

          <div>
            <Label htmlFor="contentMy-subtitle">Subtajuk</Label>
            <Textarea
              id="contentMy-subtitle"
              value={formData.contentMy.subtitle}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: {
                    ...formData.contentMy,
                    subtitle: e.target.value,
                  },
                })
              }
              placeholder="e.g., Daftar hari ini dan nikmati faedah eksklusif"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="contentMy-cta">Teks Butang Seruan Bertindak</Label>
            <Input
              id="contentMy-cta"
              value={formData.contentMy.cta}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, cta: e.target.value },
                })
              }
              placeholder="e.g., Daftar Sekarang"
              required
            />
          </div>

          <div>
            <Label htmlFor="contentMy-ctaHref">Pautan CTA (Pilihan)</Label>
            <Input
              id="contentMy-ctaHref"
              value={formData.contentMy.ctaHref || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, ctaHref: e.target.value || undefined },
                })
              }
              placeholder="e.g., /search atau https://example.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              Biarkan kosong untuk pautan ke halaman pendaftaran. Gunakan laluan relatif (e.g., /search) atau URL penuh.
            </p>
            {formData.contentEn.ctaHref &&
              formData.contentEn.ctaHref !== formData.contentMy.ctaHref && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 mt-1 text-xs text-blue-600 hover:bg-transparent hover:underline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      contentMy: {
                        ...formData.contentMy,
                        ctaHref: formData.contentEn.ctaHref,
                      },
                    })
                  }
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Gunakan pautan sama dengan versi Inggeris
                </Button>
              )}
          </div>

          <div className="space-y-1">
            <ImageUploadField
              label="Imej Kempen (Pilihan)"
              value={formData.contentMy.imageUrl}
              onChange={(url) =>
                setFormData({
                  ...formData,
                  contentMy: { ...formData.contentMy, imageUrl: url },
                })
              }
              campaignCode={formData.code}
              id="contentMy-imageUrl"
              helpText="Disyorkan: 800x600px. Digunakan untuk varian modal dan kad."
            />
            {formData.contentEn.imageUrl &&
              formData.contentEn.imageUrl !== formData.contentMy.imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:underline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      contentMy: {
                        ...formData.contentMy,
                        imageUrl: formData.contentEn.imageUrl,
                      },
                    })
                  }
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Guna imej yang sama seperti versi Inggeris
                </Button>
              )}
          </div>

          <div>
            <Label className="mb-2">Senarai Manfaat (Pilihan)</Label>
            <p className="mb-2 text-xs text-slate-500">
              Poin-poin yang dipaparkan dalam varian kad dan modal.
            </p>
            {formData.contentMy.benefits?.map((benefit, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateBenefit("my", index, e.target.value)}
                  placeholder="e.g., Akses kepada 100+ charter yang disahkan"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeBenefit("my", index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addBenefit("my")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Manfaat
            </Button>
          </div>
        </div>
      </div>

      {/* Dismissal Strategy */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Dismissal Behavior</h2>
          <Popover>
            <PopoverTrigger>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <p className="text-sm">
                Controls what happens when a user clicks the &quot;X&quot; or
                &quot;Maybe Later&quot; button on the banner.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="dismissalStrategy">Strategy *</Label>
            <Select
              value={formData.dismissalStrategy}
              onValueChange={(value: CampaignFormData["dismissalStrategy"]) =>
                setFormData({ ...formData, dismissalStrategy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dismissalStrategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    <div>
                      <div>{strategy.label}</div>
                      <div className="text-xs text-slate-500">
                        {strategy.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.dismissalStrategy === "SESSION_WITH_COOLDOWN" && (
            <div>
              <Label htmlFor="cooldownDays">Cooldown Days *</Label>
              <Input
                id="cooldownDays"
                type="number"
                value={formData.cooldownDays || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cooldownDays: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                min={1}
                placeholder="e.g., 3"
                required={
                  formData.dismissalStrategy === "SESSION_WITH_COOLDOWN"
                }
              />
              <p className="mt-1 text-xs text-slate-500">
                Number of days before showing the banner again after dismissal.
              </p>
            </div>
          )}

          {formData.dismissalStrategy === "MAX_DISMISSALS" && (
            <div>
              <Label htmlFor="maxDismissals">Max Dismissals *</Label>
              <Input
                id="maxDismissals"
                type="number"
                value={formData.maxDismissals || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDismissals: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                min={1}
                placeholder="e.g., 5"
                required={formData.dismissalStrategy === "MAX_DISMISSALS"}
              />
              <p className="mt-1 text-xs text-slate-500">
                Stop showing after user has dismissed this many times.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        <div className="flex gap-4">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <CampaignFormPreview
          formData={formData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </form>
  );
}
