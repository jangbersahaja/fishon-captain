/**
 * Verify OTP Page
 * Generic OTP verification page for email verification and other purposes
 */

"use client";

import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  const email = searchParams.get("email") || "";
  const purpose = searchParams.get("purpose") || "email_verification";
  const callbackUrl = searchParams.get("callbackUrl") || "/captain";

  useEffect(() => {
    if (!email) {
      router.push("/auth?mode=signin&error=MissingEmail");
    }
  }, [email, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(
        () => setResendCountdown(resendCountdown - 1),
        1000
      );
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otp,
          purpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid verification code");
        return;
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        // For password reset, pass email and OTP code to reset password page
        if (
          purpose === "password_reset" &&
          callbackUrl.includes("reset-password")
        ) {
          const resetUrl = `${callbackUrl}?email=${encodeURIComponent(email)}&code=${encodeURIComponent(otp)}`;
          router.push(resetUrl);
        } else {
          router.push(callbackUrl);
        }
      }, 2000);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setError("");
    setCanResend(false);
    setResendCountdown(60);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to resend code");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Failed to resend code");
    }
  };

  if (!email) {
    return null;
  }

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
                Email Verified Successfully!
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Your account is now active and ready to use.
              </p>
            </div>
            <div className="px-6 py-8 sm:px-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-600">
                  Your email has been verified successfully
                </p>
                <p className="text-sm text-slate-500">Redirecting you...</p>
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
              Verify Your Email
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter the 6-digit code sent to <strong>{email}</strong>
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

            {/* Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <VerificationCodeInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  error={!!error}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#ec2227] hover:bg-[#c81e23] text-white"
                disabled={otp.length !== 6 || isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            {/* Resend Code */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-slate-600">
                Didn&apos;t receive the code?
              </p>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-[#ec2227] hover:text-[#c81e23] font-medium"
                >
                  Resend Code
                </button>
              ) : (
                <span className="text-sm text-slate-500">
                  Resend code in {resendCountdown}s
                </span>
              )}
            </div>

            {/* Help */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
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

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><div>Loading...</div></div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
