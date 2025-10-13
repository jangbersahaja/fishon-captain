"use client";
import PasswordInput from "@/components/ui/PasswordInput";
import { feedbackTokens } from "@/config/designTokens";
import { validatePassword } from "@/lib/password";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";

type OAuthProviderInfo = {
  id: string;
  name: string;
  configured: boolean;
};

const formatProviderList = (names: string[], fallback: string) => {
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
};

const providerIcon = (id: string) => {
  switch (id) {
    case "google":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 320 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.2 44.38-121.2 124.72v70.62H22.89V288h81.27v224h100.2V288z"
          />
        </svg>
      );
    case "apple":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 384 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M318.7 268c-.2-36 16.3-63.5 49.6-83.7-18.6-26.9-46.7-41.7-84.7-44.4-35.5-2.7-74.2 20.7-88.4 20.7-14.5 0-48.1-19.7-74.4-19.7-54.3.9-112 35.2-112 105.7 0 25.1 4.6 51 15.4 75.9 13.7 32.1 63.1 110.6 114.5 109 27-.6 46.1-19.2 81.2-19.2 34.6 0 52.9 19.2 74.4 19.2 51.4-.8 96.2-72 109.9-104.1-69.6-33.1-60.8-96.2-59.5-99.4zM256.4 79.6c26.3-31.4 23.9-60 23-70.6-22.3 1.3-48.1 15.1-62.7 32.3-13.7 15.8-25.9 40.9-22.6 65 24.6 1.9 49.6-12.3 62.3-26.7z"
          />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z"
          />
        </svg>
      );
  }
};

const providerThemes: Record<string, { button: string; icon: string }> = {
  google: {
    button:
      "bg-white text-slate-800 border border-slate-200 hover:border-[#ec2227] hover:shadow-md",
    icon: "bg-[#4285F4]/10 text-[#4285F4]",
  },
  facebook: {
    button: "bg-[#1877F2] text-white hover:bg-[#0f5ad7]",
    icon: "bg-white/20 text-white",
  },
  apple: {
    button: "bg-black text-white hover:bg-neutral-900",
    icon: "bg-white/10 text-white",
  },
  default: {
    button: "bg-[#ec2227] text-white hover:bg-[#c81e23]",
    icon: "bg-white/15 text-white",
  },
};

const baseButtonClass =
  "group relative flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec2227] disabled:cursor-not-allowed disabled:opacity-60";

export default function SignUpForm({
  next,
  oauthProviders,
}: {
  next: string;
  oauthProviders: OAuthProviderInfo[];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  const configuredNames = oauthProviders
    .filter((provider) => provider.configured)
    .map((provider) => provider.name);
  const fallbackNames = oauthProviders.map((provider) => provider.name);
  const namesToUse = configuredNames.length ? configuredNames : fallbackNames;
  const recommendationCopy = `We recommend ${formatProviderList(
    namesToUse,
    "social sign up"
  )} for faster verification and secure access.`;

  // Validation helpers
  const passwordValidation = useMemo(() => {
    if (!password)
      return { valid: true, errors: [], strength: "weak" as const };
    return validatePassword(password);
  }, [password]);

  const isPasswordValid = passwordValidation.valid;
  const doPasswordsMatch = password === confirmPassword;
  const canSubmit =
    firstName && lastName && email && isPasswordValid && doPasswordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]); // Show first error
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          displayName: displayName || `${firstName} ${lastName}`.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let errorMessage = "Signup failed";

        // Provide specific error messages based on status and error content
        if (res.status === 409 || data.error === "Email already in use") {
          errorMessage =
            "An account with this email already exists. Please sign in instead.";
        } else if (res.status === 429) {
          errorMessage = "Too many signup attempts. Please try again later.";
        } else if (res.status === 400) {
          if (data.error === "Missing fields") {
            errorMessage = "Please fill in all required fields.";
          } else if (data.error === "Invalid JSON") {
            errorMessage = "Invalid request format. Please try again.";
          } else {
            errorMessage =
              data.error || "Please check your information and try again.";
          }
        } else if (res.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = data.error || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // If email verification is required, redirect to verify-otp page
      if (data.requiresVerification) {
        setAccountCreated(true);
        const verifyUrl = `/verify-otp?email=${encodeURIComponent(
          data.email || email
        )}&purpose=email_verification&callbackUrl=${encodeURIComponent(next)}`;
        window.location.href = verifyUrl;
      } else {
        // Fallback: auto-login for legacy flow (shouldn't happen anymore)
        const csrf = await fetch("/api/auth/csrf").then((r) => r.json());
        const loginRes = await fetch(
          "/api/auth/callback/credentials?json=true",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              email,
              password,
              csrfToken: csrf.csrfToken,
              callbackUrl: next,
            }),
          }
        );
        const loginJson = await loginRes.json().catch(() => null);
        setAccountCreated(true);
        window.location.href = loginJson?.url || next;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        {oauthProviders.map((provider) => {
          const theme = providerThemes[provider.id] ?? providerThemes.default;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                if (!provider.configured) return;
                void signIn(provider.id, { callbackUrl: next });
              }}
              disabled={!provider.configured}
              title={
                provider.configured
                  ? undefined
                  : `${provider.name} login is not configured yet.`
              }
              aria-disabled={!provider.configured}
              className={`${baseButtonClass} ${theme.button}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.icon}`}
              >
                {providerIcon(provider.id)}
              </span>
              <span className="flex-1 text-left">
                {provider.configured
                  ? `Continue with ${provider.name}`
                  : `${provider.name} (coming soon)`}
              </span>
            </button>
          );
        })}
      </div>
      {accountCreated && !error && (
        <div
          className={`rounded-2xl border border-[#ec2227]/20 bg-[#ec2227]/5 px-4 py-3 text-xs font-medium text-[#b3171b]`}
        >
          Account created! Redirecting…
        </div>
      )}
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>Or build with email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {error && (
          <div
            className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
          >
            {error}
            {error.includes("already exists") && (
              <>
                {" "}
                <span
                  className="underline cursor-pointer text-[#ec2227] ml-1"
                  onClick={() => (window.location.href = "/auth?mode=signin")}
                >
                  Sign in instead?
                </span>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              First name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Public display name (optional)
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Captain Joe"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Password</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500">
              Must be at least 12 characters long with uppercase, lowercase,
              number, and special character
            </p>
            {password && !passwordValidation.valid && (
              <div className="space-y-1">
                {passwordValidation.errors.map((error, index) => (
                  <p key={index} className="text-[10px] text-red-500">
                    {error}
                  </p>
                ))}
              </div>
            )}
            {password && passwordValidation.valid && (
              <div className="space-y-1">
                <p className="text-[10px] text-green-600">
                  ✓ Password requirements met
                </p>
                <p className="text-[10px] text-slate-500">
                  Strength:{" "}
                  <span className="capitalize">
                    {passwordValidation.strength}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Confirm password
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[10px] text-red-500">Passwords do not match</p>
          )}
          {confirmPassword &&
            password === confirmPassword &&
            passwordValidation.valid && (
              <p className="text-[10px] text-green-600">✓ Passwords match</p>
            )}
        </div>
        <p className="text-[11px] text-slate-400">{recommendationCopy}</p>
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account with email"}
        </button>
      </div>
    </form>
  );
}
