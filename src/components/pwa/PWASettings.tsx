"use client";

import { InstallButton } from "@/components/pwa/InstallButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Check,
  Download,
  HardDrive,
  Info,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * PWASettings Component
 *
 * Settings panel for PWA installation status, storage management, and app info.
 * Following Next.js 15 PWA guide patterns.
 */
export function PWASettings() {
  const { installState, platform, canInstall, isInstalled } = usePWAInstall();
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");

  /**
   * Get storage usage information
   */
  useEffect(() => {
    async function getStorageInfo() {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 0;
          const percentage = quota > 0 ? (usage / quota) * 100 : 0;

          setStorageInfo({
            usage,
            quota,
            percentage,
          });
        } catch (error) {
          console.error("Failed to get storage estimate:", error);
        }
      }
    }

    getStorageInfo();
  }, []);

  /**
   * Get app version from package.json or environment
   */
  useEffect(() => {
    // In production, you might want to inject this via env variable
    setAppVersion(process.env.NEXT_PUBLIC_APP_VERSION || "1.1.0");
  }, []);

  /**
   * Clear cache and reload
   */
  const handleClearCache = async () => {
    setIsClearing(true);

    try {
      // Unregister service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear cache:", error);
      setIsClearing(false);
    }
  };

  /**
   * Installation status badge
   */
  const getInstallStatusBadge = () => {
    switch (installState) {
      case "installed":
        return (
          <Badge className="bg-green-500">
            <Check className="mr-1 h-3 w-3" />
            Installed
          </Badge>
        );
      case "installable":
        return (
          <Badge variant="secondary">
            <Download className="mr-1 h-3 w-3" />
            Ready to Install
          </Badge>
        );
      case "not-ready":
        return <Badge variant="outline">Not Ready</Badge>;
      case "dismissed":
        return <Badge variant="outline">Dismissed</Badge>;
      case "unsupported":
        return <Badge variant="destructive">Not Supported</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  /**
   * Platform badge
   */
  const getPlatformBadge = () => {
    const platformLabels = {
      ios: "iOS",
      android: "Android",
      desktop: "Desktop",
      unknown: "Unknown",
    };

    return (
      <Badge variant="outline">
        <Smartphone className="mr-1 h-3 w-3" />
        {platformLabels[platform]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Installation Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Installation Status
          </CardTitle>
          <CardDescription>
            Install Fishon Captain as a Progressive Web App for a native app
            experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <div className="flex gap-2">
                {getInstallStatusBadge()}
                {getPlatformBadge()}
              </div>
            </div>
            {canInstall && !isInstalled && (
              <InstallButton showDialog variant="default" />
            )}
          </div>

          {isInstalled && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 text-green-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">App Installed</p>
                  <p className="text-muted-foreground text-xs">
                    You&apos;re running Fishon Captain as a Progressive Web App.
                    Enjoy offline access and faster load times!
                  </p>
                </div>
              </div>
            </div>
          )}

          {installState === "unsupported" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 text-yellow-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Not Supported
                  </p>
                  <p className="text-xs text-yellow-700">
                    PWA installation requires HTTPS. Please access the app via a
                    secure connection.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            Manage cached data and offline content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageInfo ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {formatBytes(storageInfo.usage)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">
                    {formatBytes(storageInfo.quota)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Percentage</span>
                  <span className="font-medium">
                    {storageInfo.percentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Clear Cache</p>
                  <p className="text-muted-foreground text-xs">
                    Remove all cached data and reload the app
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Cache
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Storage information not available
            </p>
          )}
        </CardContent>
      </Card>

      {/* App Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            App Information
          </CardTitle>
          <CardDescription>Version and technical details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{appVersion}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Display Mode</span>
            <span className="font-medium">
              {isInstalled ? "Standalone" : "Browser"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service Worker</span>
            <span className="font-medium">
              {"serviceWorker" in navigator ? "Supported" : "Not Supported"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Offline Support</span>
            <span className="font-medium">
              {"caches" in window ? "Enabled" : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
