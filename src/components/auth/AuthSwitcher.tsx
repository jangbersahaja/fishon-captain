"use client";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

type Props = { next: string };

export default function AuthSwitcher({ next }: Props) {
  const sp = useSearchParams();
  const modeParam = sp.get("mode");
  const [mode, setMode] = useState<"signin" | "signup">(
    modeParam === "signup" ? "signup" : "signin"
  );
  useEffect(() => {
    if (modeParam === "signup") setMode("signup");
    else setMode("signin");
  }, [modeParam]);
  interface MinimalSession {
    user?: { name?: string; email?: string | null; id?: string };
  }
  const [session, setSession] = useState<MinimalSession | null>(null);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j?.user) setSession(j);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`pb-2 transition border-b-2 ${
            mode === "signin"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`pb-2 transition border-b-2 ${
            mode === "signup"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Sign Up
        </button>
        {session && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="ml-auto rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign Out
          </button>
        )}
      </div>
      {mode === "signin" ? (
        <SignInForm next={next} />
      ) : (
        <SignUpForm next={next} />
      )}
    </div>
  );
}
