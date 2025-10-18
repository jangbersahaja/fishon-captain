import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AdminBypassPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (password: string) => void | Promise<void>;
  onSubmit?: (password: string) => Promise<void>;
  loading?: boolean;
  isLoading?: boolean;
  error?: string;
  title?: string;
  description?: string;
}

export function AdminBypassPasswordModal({
  open,
  onOpenChange,
  onConfirm,
  onSubmit,
  loading,
  isLoading,
  error,
  title = "Admin Password Required",
  description = "Please enter your admin password to proceed with this action.",
}: AdminBypassPasswordModalProps) {
  const [password, setPassword] = useState("");

  // Support both onConfirm and onSubmit for backward compatibility
  const handleAction = onConfirm || onSubmit;
  const isProcessing = loading || isLoading || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isProcessing || !handleAction) return;
    await handleAction(password);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isProcessing) return; // Prevent closing during loading
    if (!newOpen) {
      setPassword("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-2 border-amber-200 shadow-xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 whitespace-pre-line text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="admin-password"
                className="text-sm font-medium text-slate-700"
              >
                Admin Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your admin password"
                disabled={isProcessing}
                autoFocus
                className="border-slate-300 focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <svg
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isProcessing}
              className="border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || isProcessing}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
