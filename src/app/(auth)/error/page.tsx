/**
 * Auth Error Page
 * Displays user-friendly error messages for authentication failures
 */

"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<
  string,
  { title: string; message: string; action?: string }
> = {
  Configuration: {
    title: "Configuration Error",
    message:
      "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access Denied",
    message: "You do not have permission to access this resource.",
    action: "return-home",
  },
  Verification: {
    title: "Verification Failed",
    message:
      "The verification link is invalid or has expired. Please request a new one.",
    action: "resend-verification",
  },
  OAuthSignin: {
    title: "OAuth Sign In Error",
    message:
      "There was an error signing in with your OAuth provider. Please try again.",
    action: "try-again",
  },
  OAuthCallback: {
    title: "OAuth Callback Error",
    message:
      "There was an error during the OAuth callback. Please try signing in again.",
    action: "try-again",
  },
  OAuthCreateAccount: {
    title: "Account Creation Failed",
    message:
      "Could not create your account. The email may already be in use with a different sign-in method.",
    action: "try-different-method",
  },
  EmailCreateAccount: {
    title: "Account Creation Failed",
    message:
      "Could not create your account. Please try again or contact support.",
    action: "try-again",
  },
  Callback: {
    title: "Callback Error",
    message:
      "There was an error during authentication. Please try signing in again.",
    action: "try-again",
  },
  OAuthAccountNotLinked: {
    title: "Email Already In Use",
    message:
      "This email is already associated with another account. Please sign in using your original method.",
    action: "try-different-method",
  },
  EmailSignin: {
    title: "Email Sign In Error",
    message:
      "The sign-in link is invalid or has expired. Please request a new one.",
    action: "try-again",
  },
  CredentialsSignin: {
    title: "Invalid Credentials",
    message:
      "The email or password you entered is incorrect. Please try again.",
    action: "try-again",
  },
  SessionRequired: {
    title: "Session Required",
    message: "You must be signed in to access this page.",
    action: "sign-in",
  },
  InvalidMFASession: {
    title: "Invalid MFA Session",
    message: "Your MFA session has expired. Please sign in again.",
    action: "sign-in",
  },
  MFARequired: {
    title: "MFA Required",
    message: "Two-factor authentication is required for your account.",
    action: "sign-in",
  },
  AccountLocked: {
    title: "Account Locked",
    message:
      "Your account has been locked due to too many failed login attempts. Please try again later or contact support.",
    action: "contact-support",
  },
  MissingEmail: {
    title: "Missing Email",
    message: "Email address is required. Please try again.",
    action: "try-again",
  },
  Default: {
    title: "Authentication Error",
    message:
      "An unexpected error occurred during authentication. Please try again.",
    action: "try-again",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorType = searchParams.get("error") || "Default";

  const errorInfo = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.Default;

  const handleAction = () => {
    switch (errorInfo.action) {
      case "return-home":
        router.push("/");
        break;
      case "sign-in":
        router.push("/auth?mode=signin");
        break;
      case "try-again":
        router.push("/auth?mode=signin");
        break;
      case "try-different-method":
        router.push("/auth?mode=signin");
        break;
      case "resend-verification":
        router.push("/auth?mode=signin");
        break;
      case "contact-support":
        window.location.href = "mailto:support@fishon.my";
        break;
      default:
        router.push("/");
    }
  };

  const getActionLabel = () => {
    switch (errorInfo.action) {
      case "return-home":
        return "Return to Home";
      case "sign-in":
        return "Go to Sign In";
      case "try-again":
        return "Try Again";
      case "try-different-method":
        return "Try Different Method";
      case "resend-verification":
        return "Resend Verification";
      case "contact-support":
        return "Contact Support";
      default:
        return "Return to Home";
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
          </div>
          <div className="px-6 py-8 sm:px-8 space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Error Content */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {errorInfo.title}
              </h1>
              <p className="text-slate-600">{errorInfo.message}</p>
            </div>

            {/* Error Details (for debugging) */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-mono">
                  Error Type: {errorType}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleAction}
                className="w-full bg-[#ec2227] hover:bg-[#c81e23] text-white"
              >
                {getActionLabel()}
              </Button>

              {errorInfo.action !== "return-home" && (
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              )}
            </div>

            {/* Back Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors w-full justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>

            {/* Support Link */}
            <div className="text-center text-sm text-slate-500">
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

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="w-full max-w-xl px-4 py-16 sm:px-6">
            <div className="overflow-hidden rounded-3xl border border-[#ec2227]/20 bg-white shadow-xl">
              <div className="border-b border-[#ec2227]/15 bg-[#ec2227]/5 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
                  Fishon captain portal
                </p>
              </div>
              <div className="px-6 py-8 sm:px-8 space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h1 className="text-2xl font-bold text-slate-900">Loading...</h1>
                </div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
