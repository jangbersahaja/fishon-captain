"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AMENITIES_OPTIONS, CHARTER_TYPES } from "@/utils/captainFormData";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Charter = {
  id: string;
  name: string;
  charterType: string;
  startingPoint: string;
  city: string;
  state: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  amenities: Array<{ label: string }>;
  policies: {
    licenseProvided: boolean;
    catchAndKeep: boolean;
    catchAndRelease: boolean;
    childFriendly: boolean;
    liveBaitProvided: boolean;
    alcoholNotAllowed: boolean;
    smokingNotAllowed: boolean;
  } | null;
  pickup: {
    fee: number | null;
    notes: string | null;
    areas: Array<{ label: string }>;
  } | null;
};

type CharterEditDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  charter: Charter;
  adminUserId?: string;
};

const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
];

const POLICY_OPTIONS = [
  { value: "licenseProvided", label: "License provided" },
  { value: "catchAndKeep", label: "Catch & keep allowed" },
  { value: "catchAndRelease", label: "Catch & release supported" },
  { value: "childFriendly", label: "Child friendly" },
  { value: "liveBaitProvided", label: "Live bait provided" },
  { value: "alcoholNotAllowed", label: "Alcohol not allowed" },
  { value: "smokingNotAllowed", label: "Smoking not allowed" },
];

export function CharterEditDialog({
  isOpen,
  onClose,
  charter,
  adminUserId,
}: CharterEditDialogProps) {
  const router = useRouter();
  const { push } = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "amenities" | "policies" | "pickup" | "description"
  >("details");

  const [formData, setFormData] = useState({
    name: charter.name,
    charterType: charter.charterType,
    startingPoint: charter.startingPoint,
    city: charter.city,
    state: charter.state,
    postcode: charter.postcode,
    latitude: charter.latitude?.toString() || "",
    longitude: charter.longitude?.toString() || "",
    description: charter.description || "",
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    charter.amenities.map((a) => a.label)
  );

  const [selectedPolicies, setSelectedPolicies] = useState<
    Record<string, boolean>
  >(
    charter.policies || {
      licenseProvided: false,
      catchAndKeep: false,
      catchAndRelease: false,
      childFriendly: false,
      liveBaitProvided: false,
      alcoholNotAllowed: false,
      smokingNotAllowed: false,
    }
  );

  const [pickupData, setPickupData] = useState({
    enabled: !!charter.pickup,
    fee: charter.pickup?.fee?.toString() || "",
    notes: charter.pickup?.notes || "",
    areas: charter.pickup?.areas.map((a) => a.label).join(", ") || "",
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const url = adminUserId
        ? `/api/captain/charters/${charter.id}?adminUserId=${adminUserId}`
        : `/api/captain/charters/${charter.id}`;

      const payload = {
        name: formData.name,
        charterType: formData.charterType,
        startingPoint: formData.startingPoint,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description: formData.description || null,
        amenities: selectedAmenities,
        policies: selectedPolicies,
        pickup: pickupData.enabled
          ? {
              fee: pickupData.fee ? parseFloat(pickupData.fee) : null,
              notes: pickupData.notes || null,
              areas: pickupData.areas
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean),
            }
          : null,
      };

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update charter");
      }

      push({ message: "Charter updated successfully", type: "success" });
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Update charter error:", error);
      push({
        message:
          error instanceof Error ? error.message : "Failed to update charter",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const togglePolicy = (policy: string) => {
    setSelectedPolicies((prev) => ({
      ...prev,
      [policy]: !prev[policy],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Charter Details</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-200">
          {[
            { id: "details", label: "Details" },
            { id: "amenities", label: "Amenities" },
            { id: "policies", label: "Policies" },
            { id: "pickup", label: "Pickup" },
            { id: "description", label: "Description" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | "details"
                    | "amenities"
                    | "policies"
                    | "pickup"
                    | "description"
                )
              }
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[#ec2227] border-b-2 border-[#ec2227]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Charter Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter charter name"
              />
            </div>

            <div>
              <Label htmlFor="charterType">Charter Type</Label>
              <Select
                value={formData.charterType}
                onValueChange={(value) =>
                  setFormData({ ...formData, charterType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select charter type" />
                </SelectTrigger>
                <SelectContent>
                  {CHARTER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.label}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startingPoint">Starting Point</Label>
              <Input
                id="startingPoint"
                value={formData.startingPoint}
                onChange={(e) =>
                  setFormData({ ...formData, startingPoint: e.target.value })
                }
                placeholder="e.g., Langkawi Jetty"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, state: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAYSIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) =>
                  setFormData({ ...formData, postcode: e.target.value })
                }
                placeholder="Postcode"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="e.g., 6.3500"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="e.g., 99.8500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Amenities Tab */}
        {activeTab === "amenities" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select amenities available on your charter
            </p>
            <div className="grid grid-cols-2 gap-3">
              {AMENITIES_OPTIONS.map((amenity) => (
                <button
                  key={amenity.key}
                  type="button"
                  onClick={() => toggleAmenity(amenity.label)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    selectedAmenities.includes(amenity.label)
                      ? "border-[#ec2227] bg-red-50 text-[#ec2227]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === "policies" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Set your charter policies and rules
            </p>
            <div className="space-y-3">
              {POLICY_OPTIONS.map((policy) => (
                <label
                  key={policy.value}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer border-slate-200 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPolicies[policy.value] || false}
                    onChange={() => togglePolicy(policy.value)}
                    className="w-4 h-4 text-[#ec2227] border-slate-300 rounded focus:ring-[#ec2227]"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {policy.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Pickup Tab */}
        {activeTab === "pickup" && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 border rounded-lg border-slate-200 bg-slate-50">
              <input
                type="checkbox"
                checked={pickupData.enabled}
                onChange={(e) =>
                  setPickupData({ ...pickupData, enabled: e.target.checked })
                }
                className="w-4 h-4 text-[#ec2227] border-slate-300 rounded focus:ring-[#ec2227]"
              />
              <span className="text-sm font-medium text-slate-700">
                Offer pickup service
              </span>
            </label>

            {pickupData.enabled && (
              <>
                <div>
                  <Label htmlFor="pickupFee">Pickup Fee (RM)</Label>
                  <Input
                    id="pickupFee"
                    type="number"
                    step="0.01"
                    value={pickupData.fee}
                    onChange={(e) =>
                      setPickupData({ ...pickupData, fee: e.target.value })
                    }
                    placeholder="Leave empty for complimentary"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty if pickup is complimentary
                  </p>
                </div>

                <div>
                  <Label htmlFor="pickupAreas">Pickup Areas</Label>
                  <Input
                    id="pickupAreas"
                    value={pickupData.areas}
                    onChange={(e) =>
                      setPickupData({ ...pickupData, areas: e.target.value })
                    }
                    placeholder="e.g., Langkawi Airport, Kuah Town, Cenang Beach"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Separate multiple areas with commas
                  </p>
                </div>

                <div>
                  <Label htmlFor="pickupNotes">Pickup Notes</Label>
                  <Textarea
                    id="pickupNotes"
                    value={pickupData.notes}
                    onChange={(e) =>
                      setPickupData({ ...pickupData, notes: e.target.value })
                    }
                    placeholder="Additional pickup information..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Description Tab */}
        {activeTab === "description" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Charter Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your charter experience..."
                rows={10}
                className="resize-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                This description will be shown to potential customers
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#ec2227] hover:bg-[#d81e23]"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
