/**
 * Reset Password Page
 * Allows users to reset their password using OTP code
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassword } from "@/lib/password";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get email from URL params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const validation = validatePassword(newPassword);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validation.valid) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error messages if available
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.join(". "));
        } else {
          setError(data.error || "Failed to reset password");
        }
        return;
      }

      // Success - redirect to login
      router.push("/auth?mode=signin&success=password-reset");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#ec2227]/20 bg-white shadow-xl">
          <div className="border-b border-[#ec2227]/15 bg-[#ec2227]/5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
              Fishon captain portal
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Create New Password
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose a strong password for your account
            </p>
          </div>
          <div className="px-6 py-8 sm:px-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Password Reset Form */}
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-sm font-medium text-slate-700"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-10 border-slate-300 focus:border-[#ec2227] focus:ring-[#ec2227]"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-10 border-slate-300 focus:border-[#ec2227] focus:ring-[#ec2227]"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && passwordsMatch && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700">
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
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        Password meets all requirements
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#ec2227] hover:bg-[#c81e23] text-white"
                disabled={!validation.valid || !passwordsMatch || isLoading}
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
              Remember your password?{" "}
              <a
                href="/auth?mode=signin"
                className="text-[#ec2227] hover:text-[#c81e23] font-medium"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
