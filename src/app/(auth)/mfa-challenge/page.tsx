/**
 * MFA Challenge Page
 * Displays MFA verification form after successful password login
 */

"use client";

import { MFAChallengeForm } from "@/components/auth/MFAChallengeForm";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MFAChallengePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const userId = searchParams.get("userId");
  const callbackUrl = searchParams.get("callbackUrl") || "/captain";

  useEffect(() => {
    if (!userId) {
      router.push("/auth?mode=signin&error=InvalidMFASession");
    }
  }, [userId, router]);

  const handleMFAVerify = async (code: string, isBackupCode: boolean) => {
    if (!userId) return;

    setError("");
    setIsLoading(true);

    try {
      // Verify MFA code
      const response = await fetch("/api/auth/mfa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code,
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid verification code");
        return;
      }

      // Sign in with the temporary session token
      const result = await signIn("credentials", {
        userId,
        mfaToken: data.sessionToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to complete sign in");
        return;
      }

      // Success - redirect to callback URL
      router.push(callbackUrl);
    } catch (err) {
      console.error("MFA verification error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/auth?mode=signin");
  };

  if (!userId) {
    return null;
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
              Two-Factor Authentication
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your verification code to continue
            </p>
          </div>
          <div className="px-6 py-8 sm:px-8">
            <MFAChallengeForm
              userId={userId}
              onSubmit={handleMFAVerify}
              onCancel={handleCancel}
              error={error}
              isLoading={isLoading}
            />

            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
              Having trouble?{" "}
              <a
                href="/auth?mode=signin"
                className="text-[#ec2227] hover:text-[#c81e23] font-medium"
              >
                Return to login
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
