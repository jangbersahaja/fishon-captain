/**
 * Toast Preview Page (Development Only - Captain)
 * Preview and test all toast notification variants
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
import { Separator } from "@/components/ui/separator";
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  toggleNotificationSound,
} from "@/lib/notification-sound";
import {
  Bell,
  CheckCircle,
  Info,
  Loader2,
  Settings,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ToastPreviewPage() {
  const [soundEnabled, setSoundEnabled] = useState(
    isNotificationSoundEnabled()
  );

  const toggleSound = () => {
    toggleNotificationSound();
    setSoundEnabled(isNotificationSoundEnabled());
    toast.success(soundEnabled ? "Sound disabled" : "Sound enabled", {
      duration: 2000,
    });
  };

  const playSound = () => {
    playNotificationSound();
    toast.info("Sound played", { duration: 2000 });
  };

  // Basic toasts
  const showDefault = () => {
    toast("Default Toast", {
      description: "This is a default toast notification",
    });
  };

  const showSuccess = () => {
    toast.success("Success!", {
      description: "Your operation completed successfully",
    });
  };

  const showError = () => {
    toast.error("Error!", {
      description: "Something went wrong. Please try again.",
    });
  };

  const showWarning = () => {
    toast.warning("Warning!", {
      description: "Please review this action carefully",
    });
  };

  const showInfo = () => {
    toast.info("Info", {
      description: "Here's some helpful information",
    });
  };

  const showLoading = () => {
    toast.loading("Loading...", {
      description: "Please wait while we process your request",
    });
  };

  // Toasts with actions
  const showWithAction = () => {
    toast("New Booking Request", {
      description: "You have a new booking request from John Doe",
      action: {
        label: "View",
        onClick: () => {
          toast.info("Action clicked!");
        },
      },
    });
  };

  const showWithSettingsAction = () => {
    toast("Notification Settings", {
      description: "You can customize your notification preferences",
      action: {
        label: "Settings",
        onClick: () => {
          toast.info("Opening settings...");
        },
      },
    });
  };

  const showWithCancel = () => {
    toast("Are you sure?", {
      description: "This action cannot be undone",
      action: {
        label: "Confirm",
        onClick: () => {
          toast.success("Confirmed!");
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.info("Cancelled");
        },
      },
    });
  };

  // Duration variations
  const showShortDuration = () => {
    toast("Short duration (2s)", {
      description: "This toast will disappear quickly",
      duration: 2000,
    });
  };

  const showLongDuration = () => {
    toast("Long duration (10s)", {
      description: "This toast will stay longer",
      duration: 10000,
    });
  };

  const showInfiniteDuration = () => {
    toast("Infinite duration", {
      description: "This toast won't auto-dismiss (click X to close)",
      duration: Infinity,
    });
  };

  // Rich content
  const showRichContent = () => {
    toast.success("Charter Approved!", {
      description: "Your charter listing has been approved and is now live",
      action: {
        label: "View Charter",
        onClick: () => {
          toast.info("Viewing charter details...");
        },
      },
      duration: 6000,
    });
  };

  const showWithIcon = () => {
    toast("Custom Icon", {
      description: "This toast has a custom icon",
      icon: <Bell className="w-5 h-5" />,
    });
  };

  // Promise toast
  const showPromiseToast = () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 3000));

    toast.promise(promise, {
      loading: "Saving charter...",
      success: "Charter saved!",
      error: "Failed to save charter",
    });
  };

  // Multiple toasts
  const showMultipleToasts = () => {
    toast.success("First toast");
    setTimeout(() => toast.info("Second toast"), 500);
    setTimeout(() => toast.warning("Third toast"), 1000);
    setTimeout(() => toast.error("Fourth toast"), 1500);
  };

  // Captain-specific notification toasts
  const showBookingReceived = () => {
    toast("🎣 New Booking", {
      description:
        "You have a new booking request for Deep Sea Fishing Charter",
      action: {
        label: "View",
        onClick: () => toast.info("Viewing booking..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showBookingPaid = () => {
    toast.success("💰 Payment Received", {
      description: "John Doe has paid RM 500 for the booking",
      action: {
        label: "View Details",
        onClick: () => toast.info("Viewing payment..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showBookingCancelled = () => {
    toast.error("❌ Booking Cancelled", {
      description: "A booking for Deep Sea Fishing has been cancelled",
      action: {
        label: "View",
        onClick: () => toast.info("Viewing booking..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showReviewReceived = () => {
    toast("⭐ New Review", {
      description: "You received a 5-star review from John Doe",
      action: {
        label: "View Review",
        onClick: () => toast.info("Viewing review..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showCharterApproved = () => {
    toast.success("✅ Charter Approved", {
      description:
        "Your charter 'Deep Sea Fishing' has been approved and is now live!",
      action: {
        label: "View Charter",
        onClick: () => toast.info("Viewing charter..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showCharterRejected = () => {
    toast.error("❌ Charter Rejected", {
      description:
        "Your charter listing needs updates. Please review and resubmit.",
      action: {
        label: "Edit Charter",
        onClick: () => toast.info("Opening editor..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showCharterUpdated = () => {
    toast.info("📝 Charter Updated", {
      description: "Changes to your charter listing have been saved",
      duration: 3000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showProfileIncomplete = () => {
    toast.warning("⚠️ Profile Incomplete", {
      description: "Please complete your captain profile to accept bookings",
      action: {
        label: "Complete Profile",
        onClick: () => toast.info("Opening profile..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  const showSystemAnnouncement = () => {
    toast.info("📢 System Announcement", {
      description: "We've added new features to improve your experience!",
      action: {
        label: "Learn More",
        onClick: () => toast.info("Opening details..."),
      },
      duration: 5000,
    });
    if (soundEnabled) playNotificationSound();
  };

  return (
    <div className="container p-6 pb-24 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Toast Preview (Captain)</h1>
        <p className="text-muted-foreground">
          Preview and test all toast notification variants for captains
        </p>
      </div>

      {/* Sound Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
            Sound Controls
          </CardTitle>
          <CardDescription>
            Test notification sounds (Web Audio API with sine wave beep)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={toggleSound} variant="outline">
            {soundEnabled ? "Disable Sound" : "Enable Sound"}
          </Button>
          <Button
            onClick={playSound}
            variant="outline"
            disabled={!soundEnabled}
          >
            Play Sound
          </Button>
        </CardContent>
      </Card>

      {/* Basic Variants */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Variants</CardTitle>
          <CardDescription>
            Standard toast types with different severity levels
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Button onClick={showDefault} variant="outline">
            Default
          </Button>
          <Button onClick={showSuccess} variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Success
          </Button>
          <Button onClick={showError} variant="outline">
            <XCircle className="w-4 h-4 mr-2" />
            Error
          </Button>
          <Button onClick={showWarning} variant="outline">
            ⚠️ Warning
          </Button>
          <Button onClick={showInfo} variant="outline">
            <Info className="w-4 h-4 mr-2" />
            Info
          </Button>
          <Button onClick={showLoading} variant="outline">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading
          </Button>
        </CardContent>
      </Card>

      {/* With Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Toasts with Actions</CardTitle>
          <CardDescription>
            Interactive toasts with action buttons
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button onClick={showWithAction} variant="outline">
            With Action
          </Button>
          <Button onClick={showWithSettingsAction} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            With Settings
          </Button>
          <Button onClick={showWithCancel} variant="outline">
            With Cancel
          </Button>
        </CardContent>
      </Card>

      {/* Duration Variations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Duration Variations</CardTitle>
          <CardDescription>
            Test different auto-dismiss durations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button onClick={showShortDuration} variant="outline">
            Short (2s)
          </Button>
          <Button onClick={showLongDuration} variant="outline">
            Long (10s)
          </Button>
          <Button onClick={showInfiniteDuration} variant="outline">
            Infinite
          </Button>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Captain-Specific Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Captain Notifications</CardTitle>
          <CardDescription>
            Toasts that match actual notification types for captains
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button onClick={showBookingReceived} variant="outline">
            Booking Received
          </Button>
          <Button onClick={showBookingPaid} variant="outline">
            Booking Paid
          </Button>
          <Button onClick={showBookingCancelled} variant="outline">
            Booking Cancelled
          </Button>
          <Button onClick={showReviewReceived} variant="outline">
            Review Received
          </Button>
          <Button onClick={showCharterApproved} variant="outline">
            Charter Approved
          </Button>
          <Button onClick={showCharterRejected} variant="outline">
            Charter Rejected
          </Button>
          <Button onClick={showCharterUpdated} variant="outline">
            Charter Updated
          </Button>
          <Button onClick={showProfileIncomplete} variant="outline">
            Profile Incomplete
          </Button>
          <Button onClick={showSystemAnnouncement} variant="outline">
            System Announcement
          </Button>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Advanced Features</CardTitle>
          <CardDescription>
            Rich content, custom icons, promise-based, and multiple toasts
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={showRichContent} variant="outline">
            Rich Content
          </Button>
          <Button onClick={showWithIcon} variant="outline">
            Custom Icon
          </Button>
          <Button onClick={showPromiseToast} variant="outline">
            Promise Toast
          </Button>
          <Button onClick={showMultipleToasts} variant="outline">
            Multiple Toasts
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Using <code className="rounded bg-muted px-1 py-0.5">Sonner</code>{" "}
            toast library
          </p>
          <p>• Notification sound uses Web Audio API (784 Hz sine wave beep)</p>
          <p>• Toast deduplication prevents duplicate notifications</p>
          <p>• Default duration: 5 seconds (configurable per toast)</p>
          <p>
            • Toasts are automatically stacked and positioned at bottom-center
          </p>
          <p>
            • ReviewBar offset handled via CSS variable{" "}
            <code>--review-bar-height</code>
          </p>
          <p>• Action buttons link to notification details or settings</p>
          <p>• Sound preference persists in localStorage</p>
        </CardContent>
      </Card>

      {/* Toast Container Info */}
      <div className="p-4 mt-6 text-sm text-center border border-dashed rounded-lg text-muted-foreground">
        💡 Toasts will appear at the bottom-center. Click the buttons above to
        test them!
      </div>
    </div>
  );
}
