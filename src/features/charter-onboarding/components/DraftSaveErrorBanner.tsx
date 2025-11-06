"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

interface DraftSaveError {
  reason: string;
  timestamp: number;
  draftId?: string;
  step?: number;
}

interface DraftSaveErrorBannerProps {
  onRetry?: () => Promise<void>;
}

export function DraftSaveErrorBanner({ onRetry }: DraftSaveErrorBannerProps) {
  const [error, setError] = useState<DraftSaveError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleSaveError = (event: Event) => {
      const customEvent = event as CustomEvent<DraftSaveError>;
      setError(customEvent.detail);
      setIsDismissed(false);
    };

    window.addEventListener("charter-draft-save-failed", handleSaveError);

    return () => {
      window.removeEventListener("charter-draft-save-failed", handleSaveError);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Retrieve failed save data from sessionStorage
      const failedSaveJson = sessionStorage.getItem(
        "charter-draft-failed-save"
      );

      if (!failedSaveJson) {
        console.error(
          "[DraftSaveErrorBanner] No failed save data found in sessionStorage"
        );
        setError({
          reason: "no_recovery_data",
          timestamp: Date.now(),
        });
        return;
      }

      const failedSave = JSON.parse(failedSaveJson);

      // Call parent retry handler if provided
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry: attempt to re-save the data
        const response = await fetch("/api/charter-drafts", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: failedSave.draftId,
            data: failedSave.data,
            currentStep: failedSave.step,
            clientVersion: failedSave.version,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Clear failed save from sessionStorage on success
        sessionStorage.removeItem("charter-draft-failed-save");
      }

      // Clear error on success
      setError(null);
      setIsDismissed(false);
    } catch (retryError) {
      console.error("[DraftSaveErrorBanner] Retry failed:", retryError);
      setError({
        reason: "retry_failed",
        timestamp: Date.now(),
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show banner if no error or if dismissed
  if (!error || isDismissed) {
    return null;
  }

  // Determine error message based on reason
  const getErrorMessage = () => {
    switch (error.reason) {
      case "version_conflict":
        return "Your draft couldn't be saved due to a version conflict. Another session may have modified this draft.";
      case "network_error":
        return "Your draft couldn't be saved due to a network error. Please check your connection.";
      case "merge_sanity_check_failed":
        return "Your draft couldn't be saved because the data validation failed. This prevents data corruption.";
      case "retry_failed":
        return "The retry attempt failed. Please try saving again or contact support if the problem persists.";
      case "no_recovery_data":
        return "No recovery data found. Your changes may have been lost.";
      default:
        return "Your draft couldn't be saved. Your changes have been stored locally for recovery.";
    }
  };

  return (
    <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
      <div className="flex gap-3 p-4">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
            Draft Save Failed
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            {getErrorMessage()}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
              className="gap-2 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Retry Save
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="gap-2 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900"
            >
              <X className="h-3 w-3" />
              Dismiss
            </Button>
          </div>
          {error.timestamp && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Failed at: {new Date(error.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
