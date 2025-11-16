"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PasswordManagementProps {
  hasPassword: boolean;
}

export default function PasswordManagement({
  hasPassword: initialHasPassword,
}: PasswordManagementProps) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Set password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordChange, setNewPasswordChange] = useState("");
  const [confirmPasswordChange, setConfirmPasswordChange] = useState("");

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationError = validatePassword(newPassword);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      const response = await fetch("/api/account/password/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to set password");
        return;
      }

      toast.success("Password set successfully");
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Failed to set password:", error);
      toast.error("Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationError = validatePassword(newPasswordChange);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (newPasswordChange !== confirmPasswordChange) {
        toast.error("Passwords do not match");
        return;
      }

      if (currentPassword === newPasswordChange) {
        toast.error("New password must be different from current password");
        return;
      }

      const response = await fetch("/api/account/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPasswordChange,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPasswordChange("");
      setConfirmPasswordChange("");
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasPassword ? "Change Password" : "Set Password"}
        </CardTitle>
        <CardDescription>
          {hasPassword
            ? "Update your password to keep your account secure"
            : "Set a password to enable email/password sign-in"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPassword ? (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="p-4 text-sm text-blue-800 border border-blue-200 rounded-lg bg-blue-50">
              <p className="flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4" />
                Set a Password
              </p>
              <p className="mt-1 text-xs">
                You&apos;re currently using OAuth sign-in only. Setting a
                password enables email/password sign-in and allows you to unlink
                OAuth accounts.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and
                numbers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password-change">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password-change"
                  type={showNewPassword ? "text" : "password"}
                  value={newPasswordChange}
                  onChange={(e) => setNewPasswordChange(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and
                numbers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password-change">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password-change"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPasswordChange}
                  onChange={(e) => setConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
