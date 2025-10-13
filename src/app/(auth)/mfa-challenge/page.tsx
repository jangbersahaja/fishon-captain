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
      router.push("/auth/captains/login?error=InvalidMFASession");
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
    router.push("/auth/captains/login");
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <MFAChallengeForm
          userId={userId}
          onSubmit={handleMFAVerify}
          onCancel={handleCancel}
          error={error}
          isLoading={isLoading}
        />

        <p className="mt-4 text-center text-sm text-gray-600">
          Having trouble?{" "}
          <a
            href="/auth/captains/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to login
          </a>
        </p>
      </div>
    </div>
  );
}
