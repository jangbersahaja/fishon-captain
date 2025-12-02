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
import { Switch } from "@/components/ui/switch";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToggleCharterStatus } from "../hooks/useCharterMutations";

interface MarketplaceStatusCardProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function MarketplaceStatusCard({
  charter,
  adminUserId,
}: MarketplaceStatusCardProps) {
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const toggleStatusMutation = useToggleCharterStatus();

  const marketplaceUrl = `https://www.fishon.my/charters/${charter.id}`;

  const handleToggleClick = (newStatus: boolean) => {
    // If turning off, show confirmation
    if (!newStatus && charter.isActive) {
      setShowConfirmDialog(true);
    } else {
      // Turning on - just do it
      executeStatusChange(newStatus);
    }
  };

  const executeStatusChange = async (newStatus: boolean) => {
    await toggleStatusMutation.mutateAsync({
      charterId: charter.id,
      isActive: newStatus,
      adminUserId,
    });
    setShowConfirmDialog(false);
    router.refresh();
  };

  // Determine what's blocking the charter from being fully live
  const getBlockingIssues = () => {
    const issues: string[] = [];
    if (!charter.boat) issues.push("No boat assigned");
    if (charter.trips.count === 0) issues.push("No trips configured");
    if (charter.media.count < 3) issues.push("Less than 3 photos");
    return issues;
  };

  const blockingIssues = getBlockingIssues();
  const hasIssues = blockingIssues.length > 0;

  if (charter.isLocked) {
    return (
      <div className="p-5 border-2 border-orange-300 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Lock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-900">
              Charter Locked
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              This charter has been locked by an administrator. You cannot
              change its marketplace visibility status.
            </p>
            <p className="mt-3 text-xs text-orange-600">
              Contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (charter.isActive) {
    return (
      <>
        <div className="p-5 border-2 border-green-300 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-green-900">
                    Live on Marketplace
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your charter is visible to anglers and accepting bookings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {toggleStatusMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  )}
                  <Switch
                    checked={true}
                    onCheckedChange={handleToggleClick}
                    disabled={toggleStatusMutation.isPending}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>

              {/* What's working */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Visible in search results on Fishon.my</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Anglers can view your charter details</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accepting new booking requests</span>
                </div>
              </div>

              {/* Warnings if there are issues */}
              {hasIssues && (
                <div className="p-3 mt-4 border border-amber-200 rounded-lg bg-amber-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Improve your listing
                      </p>
                      <ul className="mt-1 space-y-1">
                        {blockingIssues.map((issue) => (
                          <li key={issue} className="text-xs text-amber-700">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex gap-2 mt-4">
                <Link
                  href={marketplaceUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 transition-colors border border-green-300 rounded-lg bg-white hover:bg-green-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Fishon.my
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog for Deactivating */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <EyeOff className="w-5 h-5" />
                Deactivate Charter?
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Are you sure you want to hide this charter from the marketplace?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <p className="text-sm font-medium text-red-800 mb-2">
                  This will immediately:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Remove from search results on Fishon.my</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Prevent new bookings from being made</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Hide charter page from public view</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 border rounded-lg bg-slate-50 border-slate-200">
                <p className="text-xs text-slate-600">
                  <strong>Note:</strong> Existing bookings will not be affected.
                  You can reactivate anytime.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={toggleStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => executeStatusChange(false)}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Yes, Deactivate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Inactive state
  return (
    <div className="p-5 border-2 border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-200 rounded-xl">
          <EyeOff className="w-6 h-6 text-slate-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-700">
                Hidden from Marketplace
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your charter is not visible to anglers
              </p>
            </div>
            <div className="flex items-center gap-2">
              {toggleStatusMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
              <Switch
                checked={false}
                onCheckedChange={handleToggleClick}
                disabled={toggleStatusMutation.isPending}
              />
            </div>
          </div>

          {/* What's not working */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Not appearing in search results</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <EyeOff className="w-4 h-4 text-slate-400" />
              <span>Charter page not accessible to public</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShoppingCart className="w-4 h-4 text-slate-400" />
              <span>Cannot receive new bookings</span>
            </div>
          </div>

          {/* Issues to fix before going live */}
          {hasIssues && (
            <div className="p-3 mt-4 border border-amber-200 rounded-lg bg-amber-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Fix before going live:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {blockingIssues.map((issue) => (
                      <li key={issue} className="text-xs text-amber-700">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* CTA to activate */}
          <div className="mt-4">
            <Button
              onClick={() => handleToggleClick(true)}
              disabled={toggleStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {toggleStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Go Live on Marketplace
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
