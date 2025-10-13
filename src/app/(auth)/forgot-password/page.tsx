/**
 * Forgot Password Page
 * Allows users to request a password reset OTP via email
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, Info, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send reset code");
        return;
      }

      setSuccess(true);
      // Redirect to verify OTP page after 2 seconds
      setTimeout(() => {
        router.push(
          `/verify-otp?email=${encodeURIComponent(
            email
          )}&purpose=password_reset&callbackUrl=${encodeURIComponent(
            "/reset-password"
          )}`
        );
      }, 2000);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-xl px-4 py-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-[#ec2227]/20 bg-white shadow-xl">
            <div className="border-b border-[#ec2227]/15 bg-[#ec2227]/5 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
                Fishon captain portal
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Check Your Email
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                We&apos;ve sent a verification code to reset your password.
              </p>
            </div>
            <div className="px-6 py-8 sm:px-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-600">
                  We&apos;ve sent a verification code to{" "}
                  <strong>{email}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Redirecting you to enter the code...
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#ec2227]/20 bg-white shadow-xl">
          <div className="border-b border-[#ec2227]/15 bg-[#ec2227]/5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
              Fishon captain portal
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Reset Your Password
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your email address and we&apos;ll send you a code to reset
              your password
            </p>
          </div>
          <div className="px-6 py-8 sm:px-8">
            {/* OAuth Notice */}
            <div className="mb-6 bg-[#ec2227]/5 border border-[#ec2227]/20 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#ec2227] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium">Note for OAuth users:</p>
                <p className="mt-1">
                  If your account uses Google sign-in, you don&apos;t need to
                  reset a password. Simply sign in using Google.
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  disabled={isLoading}
                  autoFocus
                  className="border-slate-300 focus:border-[#ec2227] focus:ring-[#ec2227]"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#ec2227] hover:bg-[#c81e23] text-white"
                disabled={isLoading}
              >
                {isLoading ? "Sending Code..." : "Send Reset Code"}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => router.push("/auth?mode=signin")}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-6 text-center text-sm text-slate-500">
              Need help?{" "}
              <a
                href="mailto:support@fishon.my"
                className="text-[#ec2227] hover:text-[#c81e23] font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
