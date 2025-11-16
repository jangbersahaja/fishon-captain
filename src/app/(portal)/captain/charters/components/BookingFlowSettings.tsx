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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { Clock, Loader2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUpdateBookingFlow } from "../hooks/useUpdateBookingFlow";

interface BookingFlowSettingsProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function BookingFlowSettings({
  charter,
  adminUserId,
}: BookingFlowSettingsProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<"MANUAL" | "AUTO">(
    charter.bookingFlowType
  );
  const [approvalHours, setApprovalHours] = useState(
    String(charter.approvalTimeHours)
  );

  const updateMutation = useUpdateBookingFlow();

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      charterId: charter.id,
      bookingFlowType: selectedFlow,
      approvalTimeHours:
        selectedFlow === "MANUAL" ? Number(approvalHours) : undefined,
      adminUserId,
    });
    setShowModal(false);
    router.refresh();
  };

  const handleCancel = () => {
    // Reset to current charter settings
    setSelectedFlow(charter.bookingFlowType);
    setApprovalHours(String(charter.approvalTimeHours));
    setShowModal(false);
  };

  return (
    <>
      {/* Current Settings Display */}
      <div className="p-3 border rounded-lg bg-slate-50 border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 mt-1 text-slate-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Booking Flow</p>
              <p className="mt-1 text-xs text-slate-600">
                {charter.bookingFlowType === "MANUAL" ? (
                  <>
                    <span className="font-medium">Manual Approval</span> •{" "}
                    {charter.approvalTimeHours}h window
                    <br />
                    <span className="text-slate-500">
                      Review and approve bookings before payment
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Instant Booking</span> •
                    Auto-confirmed
                    <br />
                    <span className="text-slate-500">
                      Payment immediately confirms the booking
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
            className="flex-shrink-0"
          >
            <Settings2 className="w-3 h-3 mr-1" />
            Change
          </Button>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Booking Flow Settings</DialogTitle>
            <DialogDescription>
              Choose how you want to handle booking requests for this charter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Booking Flow Type Selection */}
            <RadioGroup
              value={selectedFlow}
              onValueChange={(value) =>
                setSelectedFlow(value as "MANUAL" | "AUTO")
              }
            >
              {/* Manual Approval Option */}
              <div
                className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedFlow === "MANUAL"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSelectedFlow("MANUAL")}
              >
                <RadioGroupItem value="MANUAL" id="manual" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="manual"
                    className="text-sm font-semibold cursor-pointer text-slate-900"
                  >
                    Manual Approval
                  </Label>
                  <p className="mt-1 text-xs text-slate-600">
                    Review each booking request before customer pays. You can
                    approve or reject within the time window.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-slate-700">
                      Best for:
                    </span>
                    <span className="text-xs text-slate-600">
                      Custom trips, weather-dependent bookings
                    </span>
                  </div>
                </div>
              </div>

              {/* Instant Booking Option */}
              <div
                className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedFlow === "AUTO"
                    ? "border-green-500 bg-green-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSelectedFlow("AUTO")}
              >
                <RadioGroupItem value="AUTO" id="auto" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="auto"
                    className="text-sm font-semibold cursor-pointer text-slate-900"
                  >
                    Instant Booking
                  </Label>
                  <p className="mt-1 text-xs text-slate-600">
                    Bookings are automatically confirmed when customer pays. No
                    manual approval needed.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-slate-700">
                      Best for:
                    </span>
                    <span className="text-xs text-slate-600">
                      Standard trips, consistent availability
                    </span>
                  </div>
                </div>
              </div>
            </RadioGroup>

            {/* Approval Time Selection (only for MANUAL) */}
            {selectedFlow === "MANUAL" && (
              <div className="space-y-2 p-4 border rounded-lg bg-blue-50 border-blue-200">
                <Label htmlFor="approvalTime" className="text-sm font-medium">
                  Approval Time Window
                </Label>
                <Select value={approvalHours} onValueChange={setApprovalHours}>
                  <SelectTrigger id="approvalTime">
                    <SelectValue placeholder="Select time window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours (recommended)</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600">
                  Customers must wait for your approval within this time. If you
                  don't respond, the booking is automatically cancelled.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="p-3 text-xs border rounded-lg bg-slate-50 border-slate-200 text-slate-600">
              <p className="font-medium text-slate-700">💡 Note:</p>
              <p className="mt-1">
                You can change this setting anytime. Existing bookings will
                follow the flow they were created with.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-[#ec2227] hover:bg-[#d81e23]"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
