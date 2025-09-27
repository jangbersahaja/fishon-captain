"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { feedbackTokens } from "@/config/designTokens";

export default function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthOnly, setOauthOnly] = useState(false);
  const [checking, setChecking] = useState(false);

  // Debounced check if email belongs to an OAuth-only account (no passwordHash)
  useEffect(() => {
    if (!email) {
      setOauthOnly(false);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setChecking(true);
        const res = await fetch(
          `/api/auth/account-type?email=${encodeURIComponent(email)}`
        );
        if (res.ok) {
          const j = await res.json();
          setOauthOnly(j?.oauthOnly === true);
        } else {
          setOauthOnly(false);
        }
      } catch {
        setOauthOnly(false);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (oauthOnly) {
      setError(
        "This email is registered via Google. Use 'Continue with Google'."
      );
      return;
    }
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: next,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
      return;
    }
    window.location.href = res?.url || next;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}>
          {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          required
        />
      </div>
      {!oauthOnly && (
        <>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </>
      )}
      {oauthOnly && (
        <div className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.warning.subtle}`}>
          This email was created with Google. Use the button below to continue.
        </div>
      )}
      <div className="relative py-2 text-center text-[10px] uppercase tracking-wide text-slate-400">
        <span className="bg-white px-2">OR</span>
        <span className="absolute inset-x-0 top-1/2 -z-10 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: next })}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="#EA4335"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
        Continue with Google
      </button>
      {checking && (
        <p className="text-center text-[10px] text-slate-400">
          Checking account…
        </p>
      )}
    </form>
  );
}
