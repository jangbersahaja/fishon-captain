"use client";

/**
 * Promo Split Configuration Component
 *
 * Allows STAFF/ADMIN to configure how promo discounts are split between
 * captain and platform. Includes:
 * - Dual sliders for visual adjustment
 * - Preset buttons for common splits
 * - Live preview of financial impact
 * - Real-time validation
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Check, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PromoSplitConfig {
  captainPercent: number;
  platformPercent: number;
}

interface PromoSplitConfigProps {
  onUpdate?: () => void; // Callback after successful update
}

export function PromoSplitConfig({ onUpdate }: PromoSplitConfigProps) {
  const [config, setConfig] = useState<PromoSplitConfig>({
    captainPercent: 50,
    platformPercent: 50,
  });
  const [originalConfig, setOriginalConfig] = useState<PromoSplitConfig | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/pricing/promo-split");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setConfig(result.data);
        setOriginalConfig(result.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load configuration"
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/admin/pricing/promo-split", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to save: ${response.status}`);
      }

      if (result.success) {
        setSuccess(true);
        setOriginalConfig(config);
        onUpdate?.();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCaptainChange(value: number[]) {
    const captainPercent = Math.round(value[0] * 10) / 10;
    const platformPercent = Math.round((100 - captainPercent) * 10) / 10;
    setConfig({ captainPercent, platformPercent });
  }

  function applyPreset(captainPercent: number, platformPercent: number) {
    setConfig({ captainPercent, platformPercent });
  }

  function resetToOriginal() {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  }

  const hasChanges =
    originalConfig &&
    (Math.abs(config.captainPercent - originalConfig.captainPercent) > 0.01 ||
      Math.abs(config.platformPercent - originalConfig.platformPercent) > 0.01);

  // Calculate example impact
  const exampleDiscount = 100;
  const captainContribution =
    Math.round(exampleDiscount * (config.captainPercent / 100) * 100) / 100;
  const platformContribution =
    Math.round(exampleDiscount * (config.platformPercent / 100) * 100) / 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-600">
              Loading configuration...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo Discount Split</CardTitle>
        <CardDescription>
          Configure how promotional discounts are shared between captains and
          the platform. This affects captain earnings when promo codes are
          applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="text-green-900 border-green-200 bg-green-50">
            <Check className="w-4 h-4" />
            <AlertDescription>
              Configuration updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Current Split Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 text-center border border-blue-200 rounded-lg bg-blue-50">
            <div className="text-2xl font-bold text-blue-700">
              {config.captainPercent.toFixed(1)}%
            </div>
            <div className="mt-1 text-sm text-blue-600">Captain</div>
          </div>
          <div className="p-4 text-center border rounded-lg bg-slate-50 border-slate-200">
            <div className="text-2xl font-bold text-slate-700">
              {config.platformPercent.toFixed(1)}%
            </div>
            <div className="mt-1 text-sm text-slate-600">Platform</div>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <Label htmlFor="captain-slider">
            Captain Contribution: {config.captainPercent.toFixed(1)}%
          </Label>
          <Slider
            id="captain-slider"
            min={0}
            max={100}
            step={0.1}
            value={[config.captainPercent]}
            onValueChange={handleCaptainChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0% (Platform pays all)</span>
            <span>100% (Captain pays all)</span>
          </div>
        </div>

        {/* Preset Buttons */}
        <div>
          <Label className="block mb-2">Quick Presets</Label>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(0, 100)}
              className={config.captainPercent === 0 ? "bg-slate-100" : ""}
            >
              0/100
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(30, 70)}
              className={config.captainPercent === 30 ? "bg-slate-100" : ""}
            >
              30/70
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(50, 50)}
              className={config.captainPercent === 50 ? "bg-slate-100" : ""}
            >
              50/50
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset(70, 30)}
              className={config.captainPercent === 70 ? "bg-slate-100" : ""}
            >
              70/30
            </Button>
          </div>
        </div>

        {/* Example Impact */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <div className="mb-1 font-medium">
              Example: RM{exampleDiscount} Promo Discount
            </div>
            <div className="space-y-1 text-xs">
              <div>
                • Captain contributes: RM{captainContribution.toFixed(2)}
              </div>
              <div>
                • Platform contributes: RM{platformContribution.toFixed(2)}
              </div>
              <div className="pt-1 mt-2 border-t border-blue-200">
                If trip price is RM1,000, captain receives RM
                {(1000 - captainContribution).toFixed(2)}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={saveConfig}
            disabled={!hasChanges || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              onClick={resetToOriginal}
              disabled={saving}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-2 text-xs border-t text-slate-500">
          <strong>Note:</strong> Changes apply immediately to all new bookings
          with promo codes. Existing bookings are not affected.
        </div>
      </CardContent>
    </Card>
  );
}
