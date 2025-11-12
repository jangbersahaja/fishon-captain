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
import { SPECIES_CATEGORIES } from "@/lib/data/species";
import { TECHNIQUE_OPTIONS, TRIP_TYPE_OPTIONS } from "@/utils/captainFormData";
import { SpeciesSelector } from "@features/charter-onboarding/components";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type Trip = {
  id: string;
  name: string;
  tripType: string;
  price: number;
  durationHours: number;
  maxAnglers: number;
  style: string;
  description: string | null;
  promoPrice: number | null;
  species: Array<{ id: string; value: string }>;
  startTimes: Array<{ id: string; value: string }>;
  techniques: Array<{ id: string; value: string }>;
  charter: {
    id: string;
    name: string;
  };
};

type Charter = {
  id: string;
  name: string;
};

type TripDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  charters: Charter[];
  adminUserId?: string;
  onSuccess: () => void;
};

export function TripDialog({
  isOpen,
  onClose,
  trip,
  charters,
  adminUserId,
  onSuccess,
}: TripDialogProps) {
  const { push } = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    charterId: "",
    name: "",
    tripType: "",
    price: 0,
    durationHours: 0,
    maxAnglers: 0,
    style: "PRIVATE",
    description: "",
    promoPrice: 0,
    species: [] as string[],
    startTimes: [] as string[],
    techniques: [] as string[],
  });

  // Input state for adding new items
  const [newStartTime, setNewStartTime] = useState("");

  // Active species tab state (for SpeciesSelector)
  const [activeSpeciesTab, setActiveSpeciesTab] = useState<string>(
    SPECIES_CATEGORIES.FRESHWATER
  );

  // Auto-set trip name based on trip type (except for Custom)
  useEffect(() => {
    if (formData.tripType && formData.tripType !== "Custom") {
      const selectedOption = TRIP_TYPE_OPTIONS.find(
        (opt) => opt.value === formData.tripType
      );
      if (selectedOption) {
        setFormData((prev) => ({ ...prev, name: selectedOption.label }));
      }
    }
  }, [formData.tripType]);

  // Reset form when dialog opens/closes or trip changes
  useEffect(() => {
    if (isOpen) {
      if (trip) {
        setFormData({
          charterId: trip.charter.id,
          name: trip.name,
          tripType: trip.tripType,
          price: trip.price,
          durationHours: trip.durationHours,
          maxAnglers: trip.maxAnglers,
          style: trip.style,
          description: trip.description || "",
          promoPrice: trip.promoPrice || 0,
          species: trip.species.map((s) => s.value),
          startTimes: trip.startTimes.map((t) => t.value),
          techniques: trip.techniques.map((t) => t.value),
        });
      } else {
        setFormData({
          charterId: charters[0]?.id || "",
          name: "",
          tripType: "",
          price: 0,
          durationHours: 0,
          maxAnglers: 0,
          style: "PRIVATE",
          description: "",
          promoPrice: 0,
          species: [],
          startTimes: [],
          techniques: [],
        });
      }
      setNewStartTime("");
    }
  }, [isOpen, trip, charters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = trip
        ? adminUserId
          ? `/api/captain/trips/${trip.id}?adminUserId=${adminUserId}`
          : `/api/captain/trips/${trip.id}`
        : adminUserId
          ? `/api/captain/trips?adminUserId=${adminUserId}`
          : "/api/captain/trips";

      const response = await fetch(url, {
        method: trip ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charterId: formData.charterId,
          name: formData.name,
          tripType: formData.tripType,
          price: formData.price,
          durationHours: formData.durationHours,
          maxAnglers: formData.maxAnglers,
          style: formData.style,
          description: formData.description || null,
          promoPrice: formData.promoPrice > 0 ? formData.promoPrice : null,
          species: formData.species,
          startTimes: formData.startTimes,
          techniques: formData.techniques,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `Failed to ${trip ? "update" : "create"} trip`
        );
      }

      push({
        message: `Trip ${trip ? "updated" : "created"} successfully`,
        type: "success",
      });
      onSuccess();
    } catch (error) {
      console.error("Trip dialog error:", error);
      push({
        message: error instanceof Error ? error.message : "Failed to save trip",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions for managing arrays
  const addStartTime = () => {
    if (newStartTime.trim()) {
      setFormData((prev) => ({
        ...prev,
        startTimes: [...prev.startTimes, newStartTime.trim()],
      }));
      setNewStartTime("");
    }
  };

  const removeStartTime = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      startTimes: prev.startTimes.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trip ? "Edit Trip" : "Add New Trip"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Charter Selection */}
          <div className="space-y-2">
            <Label htmlFor="charterId">Charter *</Label>
            <Select
              value={formData.charterId}
              onValueChange={(value: string) =>
                setFormData((prev) => ({ ...prev, charterId: value }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a charter" />
              </SelectTrigger>
              <SelectContent>
                {charters.map((charter) => (
                  <SelectItem key={charter.id} value={charter.id}>
                    {charter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Trip Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., Half Day Inshore Fishing"
                disabled={formData.tripType !== "Custom"}
                required
              />
              {formData.tripType && formData.tripType !== "Custom" && (
                <p className="text-xs text-slate-500">
                  Trip name is auto-filled from trip type. Select
                  &quot;Custom&quot; to enter a custom name.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripType">Trip Type *</Label>
              <Select
                value={formData.tripType}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, tripType: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIP_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Charter Style *</Label>
              <Select
                value={formData.style}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, style: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="SHARED">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (RM) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 500.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoPrice">Promo Price (RM)</Label>
              <Input
                id="promoPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.promoPrice || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    promoPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 450.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationHours">Duration (hours) *</Label>
              <Input
                id="durationHours"
                type="number"
                min="1"
                max="24"
                value={formData.durationHours || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    durationHours: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 4"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAnglers">Max Anglers *</Label>
              <Input
                id="maxAnglers"
                type="number"
                min="1"
                max="99"
                value={formData.maxAnglers || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxAnglers: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 6"
                required
              />
            </div>
          </div>

          {/* Start Times */}
          <div className="space-y-2">
            <Label>Start Times</Label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addStartTime}
                size="sm"
                variant="outline"
                disabled={!newStartTime}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Select a time and click + to add departure times
            </p>
            <div className="flex flex-wrap gap-2">
              {formData.startTimes.map((time, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white border rounded-full border-neutral-200 text-slate-700"
                >
                  {time}
                  <button
                    type="button"
                    onClick={() => removeStartTime(index)}
                    className="transition text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe this trip package..."
              rows={3}
            />
          </div>

          {/* Target Species */}
          <div className="space-y-2">
            <Label>Target Species</Label>
            <SpeciesSelector
              value={formData.species}
              activeTab={
                activeSpeciesTab as (typeof SPECIES_CATEGORIES)[keyof typeof SPECIES_CATEGORIES]
              }
              onActiveTabChangeAction={(tab) => setActiveSpeciesTab(tab)}
              maxSelected={5}
              onChangeAction={(next) =>
                setFormData((prev) => ({ ...prev, species: next }))
              }
            />
          </div>

          {/* Techniques */}
          <div className="space-y-2">
            <Label>Fishing Techniques</Label>
            <p className="mb-2 text-xs text-slate-500">
              Click to select fishing techniques (toggle on/off)
            </p>
            <div className="flex flex-wrap gap-2">
              {TECHNIQUE_OPTIONS.map((technique) => {
                const active = formData.techniques.includes(technique.label);
                return (
                  <button
                    key={technique.key}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        techniques: active
                          ? prev.techniques.filter((t) => t !== technique.label)
                          : [...prev.techniques, technique.label],
                      }));
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-[#ec2227] border-[#ec2227] text-white"
                        : "border-neutral-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {technique.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ec2227] hover:bg-[#d81e23]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{trip ? "Update" : "Create"} Trip</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
