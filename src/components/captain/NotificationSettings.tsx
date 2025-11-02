/**
 * NotificationSettings Component (Captain)
 *
 * Form for managing notification preferences with real-time updates.
 * Captain version uses broader categories: booking, charter, and system updates.
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  disableNotificationSound,
  enableNotificationSound,
  isNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface NotificationPreferences {
  // Channel preferences
  inAppEnabled: boolean;
  emailEnabled: boolean;

  // Type preferences
  bookingUpdates: boolean;
  charterUpdates: boolean;
  systemUpdates: boolean;
}

export default function NotificationSettings() {
  const { data: session } = useSession();
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from API
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch("/api/notifications/preferences");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load preferences");
        }

        const data = await response.json();
        setPreferences(data);
        setSoundEnabled(isNotificationSoundEnabled());
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
        toast.error("Failed to load preferences");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      loadPreferences();
    }
  }, [session]);

  // Handle sound toggle
  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (enabled) {
      enableNotificationSound();
      toast.success("Notification sounds enabled");
    } else {
      disableNotificationSound();
      toast.success("Notification sounds disabled");
    }
  };

  // Handle preference toggle
  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const newPreferences = { ...preferences, [key]: newValue };
    setPreferences(newPreferences);

    // Save to API
    try {
      setIsSaving(true);
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      toast.success("Preferences updated");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Failed to load preferences</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Settings</CardTitle>
          <CardDescription>Control notification sounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-toggle">Notification sound</Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when you receive a notification
              </p>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inAppEnabled">In-app notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications in the dashboard
                </p>
              </div>
              <Switch
                id="inAppEnabled"
                checked={preferences.inAppEnabled}
                onCheckedChange={() => handleToggle("inAppEnabled")}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailEnabled">Email notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="emailEnabled"
                checked={preferences.emailEnabled}
                onCheckedChange={() => handleToggle("emailEnabled")}
                disabled={isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bookingUpdates">Booking updates</Label>
                <p className="text-sm text-muted-foreground">
                  New bookings, payments, and cancellations
                </p>
              </div>
              <Switch
                id="bookingUpdates"
                checked={preferences.bookingUpdates}
                onCheckedChange={() => handleToggle("bookingUpdates")}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="charterUpdates">Charter updates</Label>
                <p className="text-sm text-muted-foreground">
                  Charter approvals, rejections, and reviews
                </p>
              </div>
              <Switch
                id="charterUpdates"
                checked={preferences.charterUpdates}
                onCheckedChange={() => handleToggle("charterUpdates")}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="systemUpdates">System updates</Label>
                <p className="text-sm text-muted-foreground">
                  Platform announcements and account updates
                </p>
              </div>
              <Switch
                id="systemUpdates"
                checked={preferences.systemUpdates}
                onCheckedChange={() => handleToggle("systemUpdates")}
                disabled={isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
