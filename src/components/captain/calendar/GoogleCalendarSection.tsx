"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings2,
  Unlink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Only enable Google Calendar in development
const IS_GOOGLE_CALENDAR_ENABLED = process.env.NODE_ENV === "development";

interface GoogleCalendarSettings {
  isConnected: boolean;
  connectedAt?: string;
  googleEmail?: string;
  selectedCalendarId?: string;
  selectedCalendarName?: string;
  syncBookingsToGoogle: boolean;
  syncBlockedToGoogle: boolean;
  importFromGoogle: boolean;
  autoImportAllDay: boolean;
  autoImportKeywords: string[];
  lastSyncAt?: string;
}

interface GoogleCalendar {
  id: string;
  name: string;
  primary: boolean;
}

interface GoogleCalendarSectionProps {
  className?: string;
}

export function GoogleCalendarSection({
  className,
}: GoogleCalendarSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<GoogleCalendarSettings | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/google/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setCalendars(data.calendars || []);
      }
    } catch (error) {
      console.error("Failed to fetch Google Calendar settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip fetching if feature is disabled
    if (!IS_GOOGLE_CALENDAR_ENABLED) {
      setIsLoading(false);
      return;
    }
    fetchSettings();
  }, [fetchSettings]);

  // Show "Coming Soon" in production
  if (!IS_GOOGLE_CALENDAR_ENABLED) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </h3>
        <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
          <Badge variant="secondary" className="text-xs">
            Coming Soon
          </Badge>
          <p className="text-xs text-muted-foreground">
            Sync your blocked dates and bookings with Google Calendar
          </p>
        </div>
      </div>
    );
  }

  // Handle connect
  const handleConnect = async () => {
    try {
      const res = await fetch("/api/calendar/google/connect");
      if (res.ok) {
        const data = await res.json();
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error("Failed to start connection");
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Failed to connect to Google Calendar");
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        setSettings((prev) => (prev ? { ...prev, isConnected: false } : null));
        setCalendars([]);
        toast.success("Google Calendar disconnected");
        setShowDisconnectDialog(false);
      } else {
        toast.error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle settings update
  const handleSettingChange = async (
    key: keyof GoogleCalendarSettings,
    value: boolean | string
  ) => {
    if (!settings) return;

    // Optimistic update
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));

    try {
      const res = await fetch("/api/calendar/google/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) {
        // Revert on error
        setSettings((prev) => (prev ? { ...prev, [key]: !value } : null));
        toast.error("Failed to update setting");
      }
    } catch (error) {
      console.error("Failed to update setting:", error);
      setSettings((prev) => (prev ? { ...prev, [key]: !value } : null));
      toast.error("Failed to update setting");
    }
  };

  // Handle full sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/calendar/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Synced: ${data.stats.created} created, ${data.stats.updated} updated`
        );
        fetchSettings(); // Refresh to update lastSyncAt
      } else {
        toast.error("Sync failed");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </h3>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </h3>
        {settings?.isConnected && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!settings?.isConnected ? (
        // Not Connected State
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Sync your blocked dates with Google Calendar
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleConnect}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect Google Calendar
          </Button>
        </div>
      ) : (
        // Connected State
        <div className="space-y-3">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setShowDisconnectDialog(true)}
            >
              <Unlink className="h-3 w-3 mr-1" />
              Disconnect
            </Button>
          </div>

          {/* Connected Email */}
          {settings.googleEmail && (
            <p className="text-xs text-muted-foreground truncate">
              {settings.googleEmail}
            </p>
          )}

          {/* Quick Sync Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>

          {settings.lastSyncAt && (
            <p className="text-xs text-muted-foreground text-center">
              Last synced:{" "}
              {new Date(settings.lastSyncAt).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* Expanded Settings */}
          {isExpanded && (
            <div className="space-y-4 pt-3 border-t">
              {/* Calendar Selection */}
              {calendars.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Sync to Calendar</Label>
                  <Select
                    value={settings.selectedCalendarId || "primary"}
                    onValueChange={(value) =>
                      handleSettingChange("selectedCalendarId", value)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.name}
                          {cal.primary && " (Primary)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sync Options */}
              <div className="space-y-3">
                <Label className="text-xs">Sync Options</Label>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-blocked" className="text-xs font-normal">
                    Sync blocked dates
                  </Label>
                  <Switch
                    id="sync-blocked"
                    checked={settings.syncBlockedToGoogle}
                    onCheckedChange={(checked) =>
                      handleSettingChange("syncBlockedToGoogle", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="sync-bookings"
                    className="text-xs font-normal"
                  >
                    Sync bookings
                  </Label>
                  <Switch
                    id="sync-bookings"
                    checked={settings.syncBookingsToGoogle}
                    onCheckedChange={(checked) =>
                      handleSettingChange("syncBookingsToGoogle", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="import" className="text-xs font-normal">
                    Import from Google
                  </Label>
                  <Switch
                    id="import"
                    checked={settings.importFromGoogle}
                    onCheckedChange={(checked) =>
                      handleSettingChange("importFromGoogle", checked)
                    }
                  />
                </div>
              </div>

              {/* Open in Google Calendar */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-xs"
                asChild
              >
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Google Calendar
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google Calendar?</DialogTitle>
            <DialogDescription>
              Your sync preferences will be saved, but syncing will stop until
              you reconnect. Events already in Google Calendar will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
