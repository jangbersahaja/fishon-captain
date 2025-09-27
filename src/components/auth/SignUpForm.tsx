"use client";
import { feedbackTokens } from "@/config/designTokens";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignUpForm({ next }: { next: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Signup failed");
      }
      // auto-login
      const csrf = await fetch("/api/auth/csrf").then((r) => r.json());
      const loginRes = await fetch("/api/auth/callback/credentials?json=true", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: csrf.csrfToken,
          callbackUrl: next,
        }),
      });
      const loginJson = await loginRes.json().catch(() => null);
      setAccountCreated(true);
      window.location.href = loginJson?.url || next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
        >
          {error}
        </div>
      )}
      {accountCreated && !error && (
        <div
          className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.success.subtle}`}
        >
          Account created! Redirecting…
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            First name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
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
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Password</label>
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
        className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
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
    </form>
  );
}
