"use client";

import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";
import { Check, Download } from "lucide-react";
import { useState } from "react";
import { InstallPrompt } from "./InstallPrompt";

interface InstallButtonProps {
  /**
   * Button variant
   * @default "default"
   */
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "secondary"
    | "destructive";

  /**
   * Button size
   * @default "default"
   */
  size?: "default" | "sm" | "lg" | "icon";

  /**
   * Custom button text
   * @default "Install App"
   */
  label?: string;

  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show InstallPrompt dialog on click (instead of direct prompt)
   * Useful for iOS or when you want to show instructions first
   * @default false
   */
  showDialog?: boolean;
}

/**
 * InstallButton Component
 *
 * Reusable button for triggering PWA installation.
 * Automatically handles platform detection and installation state.
 *
 * Following Next.js 15 PWA guide patterns.
 *
 * @example
 * ```tsx
 * // Simple usage
 * <InstallButton />
 *
 * // Custom styling
 * <InstallButton variant="outline" size="sm" label="Get App" />
 *
 * // Show dialog first (good for iOS)
 * <InstallButton showDialog />
 *
 * // In navbar
 * <InstallButton variant="ghost" size="sm" showIcon={false} />
 * ```
 */
export function InstallButton({
  variant = "default",
  size = "default",
  label = "Install App",
  showIcon = true,
  className,
  showDialog = false,
}: InstallButtonProps) {
  const { installState, promptInstall, canInstall, isInstalled } =
    usePWAInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  /**
   * Handle button click
   */
  const handleClick = async () => {
    if (showDialog) {
      // Show dialog with instructions
      setDialogOpen(true);
    } else {
      // Direct prompt (Android/Desktop Chrome)
      await promptInstall();
    }
  };

  /**
   * Don't render if not installable
   */
  if (!canInstall || isInstalled) {
    return null;
  }

  /**
   * Show different state for installed
   */
  if (installState === "installed") {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn("cursor-not-allowed", className)}
        disabled
      >
        {showIcon && <Check className="mr-2 h-4 w-4" />}
        Installed
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        {showIcon && <Download className="mr-2 h-4 w-4" />}
        {label}
      </Button>

      {showDialog && (
        <InstallPrompt open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </>
  );
}
