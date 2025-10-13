/**
 * ChangePasswordForm Component
 * Form for changing user password with real-time validation
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassword } from "@/lib/password";
import { AlertCircle, Check, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

interface ChangePasswordFormProps {
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  showCurrentPassword?: boolean; // For OAuth users setting password for first time
}

export function ChangePasswordForm({
  onSubmit,
  isLoading = false,
  error,
  showCurrentPassword = true,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Real-time password validation
  const validation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ current: true, new: true, confirm: true });

    // Validate
    if (showCurrentPassword && !currentPassword) {
      return;
    }

    if (!validation.valid || !passwordsMatch) {
      return;
    }

    await onSubmit(currentPassword, newPassword);
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const canSubmit =
    (!showCurrentPassword || currentPassword.length > 0) &&
    validation.valid &&
    passwordsMatch &&
    newPassword.length > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold">
              {showCurrentPassword ? "Change Password" : "Set Password"}
            </h2>
          </div>
          <p className="text-gray-600">
            {showCurrentPassword
              ? "Enter your current password and choose a new secure password"
              : "Create a secure password for your account"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          {showCurrentPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() => handleBlur("current")}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => handleBlur("new")}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirm")}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {touched.confirm && confirmPassword && !passwordsMatch && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Passwords do not match
              </p>
            )}
            {touched.confirm && confirmPassword && passwordsMatch && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Passwords match
              </p>
            )}
          </div>

          {/* Password Requirements */}
          {newPassword && touched.new && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Password Requirements:
              </p>
              <ul className="space-y-1 text-sm">
                {validation.errors.map((errorMsg, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-red-600"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </li>
                ))}
                {validation.valid && (
                  <li className="flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Password meets all requirements
                  </li>
                )}
              </ul>
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Strength:</span>
                  <span
                    className={`font-medium ${
                      validation.strength === "very-strong"
                        ? "text-green-600"
                        : validation.strength === "strong"
                        ? "text-blue-600"
                        : validation.strength === "medium"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {validation.strength === "very-strong"
                      ? "Very Strong"
                      : validation.strength === "strong"
                      ? "Strong"
                      : validation.strength === "medium"
                      ? "Medium"
                      : "Weak"}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      validation.strength === "very-strong"
                        ? "w-full bg-green-500"
                        : validation.strength === "strong"
                        ? "w-3/4 bg-blue-500"
                        : validation.strength === "medium"
                        ? "w-1/2 bg-yellow-500"
                        : "w-1/4 bg-red-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isLoading}
          >
            {isLoading
              ? "Changing..."
              : showCurrentPassword
              ? "Change Password"
              : "Set Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
