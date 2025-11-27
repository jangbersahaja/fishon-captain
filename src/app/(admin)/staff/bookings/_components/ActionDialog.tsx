"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";

interface ActionDialogProps {
  title: string;
  description: string;
  trigger: ReactNode;
  action: (password: string, reason: string) => Promise<void>;
  requireReason?: boolean;
}

export function ActionDialog({
  title,
  description,
  trigger,
  action,
  requireReason = true,
}: ActionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    if (requireReason && !reason.trim()) {
      setError("Reason is required");
      return;
    }

    if (requireReason && reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }

    setIsProcessing(true);

    try {
      await action(password, reason);
      // Success - close dialog and reset
      setIsOpen(false);
      setPassword("");
      setReason("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isProcessing) {
      setIsOpen(open);
      if (!open) {
        // Reset form when closing
        setPassword("");
        setReason("");
        setError("");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600" />
              {title}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reason Field */}
            {requireReason && (
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed reason for this action..."
                  rows={3}
                  disabled={isProcessing}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  This will be recorded in the booking audit trail
                </p>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Your Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                disabled={isProcessing}
                autoComplete="current-password"
              />
              <p className="text-xs text-gray-500">
                Password verification is required for all admin actions
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Warning Banner */}
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-700">
                <p className="font-medium mb-1">This action will be logged</p>
                <p className="text-xs">
                  All admin actions are recorded with timestamp, user ID, and
                  reason for audit purposes.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
