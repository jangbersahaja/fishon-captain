"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, Plus, Share, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptProps {
  /**
   * Control dialog visibility externally
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /**
   * Auto-show delay (ms) after page load
   * Set to 0 to disable auto-show
   * @default 3000
   */
  autoShowDelay?: number;
}

/**
 * InstallPrompt Component
 *
 * Dialog modal for PWA installation with platform-specific instructions.
 * Supports Android/Desktop Chrome auto-prompt and iOS manual instructions.
 *
 * Following Next.js 15 PWA guide patterns.
 *
 * @example
 * ```tsx
 * // Controlled usage
 * <InstallPrompt open={showPrompt} onOpenChange={setShowPrompt} />
 *
 * // Auto-show after 3 seconds
 * <InstallPrompt autoShowDelay={3000} />
 * ```
 */
export function InstallPrompt({
  open: controlledOpen,
  onOpenChange,
  autoShowDelay = 0,
}: InstallPromptProps) {
  const { installState, platform, promptInstall, isIOSInstallable } =
    usePWAInstall();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  /**
   * Auto-show logic
   */
  useEffect(() => {
    if (autoShowDelay > 0 && installState === "installable") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, autoShowDelay);

      return () => clearTimeout(timer);
    }
  }, [autoShowDelay, installState, setIsOpen]);

  /**
   * Handle install button click
   */
  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsOpen(false);
    }
  };

  /**
   * Don't show dialog if not installable
   */
  if (installState !== "installable" && !isIOSInstallable) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Install Fishon Captain
          </DialogTitle>
          <DialogDescription className="text-center">
            {platform === "ios"
              ? "Add to your home screen for a better experience"
              : "Install our app for quick access and offline functionality"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Android/Desktop Chrome - Native Prompt */}
          {installState === "installable" && platform !== "ios" && (
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/50 p-4">
              <Download className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-medium">Install with one tap</p>
                <p className="text-muted-foreground text-sm">
                  Get the app on your device for quick access
                </p>
              </div>
            </div>
          )}

          {/* iOS Safari - Manual Instructions */}
          {platform === "ios" && isIOSInstallable && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 font-medium">
                <Share className="h-5 w-5 text-primary" />
                <span>How to install on iOS:</span>
              </div>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>
                    Tap the <Share className="inline h-4 w-4" /> Share button in
                    Safari
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>
                    Scroll down and tap{" "}
                    <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 font-medium">
                      <Plus className="h-3 w-3" /> Add to Home Screen
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Tap &quot;Add&quot; to install the app</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          {installState === "installable" && platform !== "ios" ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Maybe Later
              </Button>
              <Button onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Got It
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
