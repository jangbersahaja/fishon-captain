"use client";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

const termsUrl = "https://www.fishon.my/support/terms";
const policiesUrl = "https://www.fishon.my/support/privacy";

type OAuthProviderInfo = {
  id: string;
  name: string;
  configured: boolean;
};

type Props = { next: string; oauthProviders: OAuthProviderInfo[] };

export default function AuthSwitcher({ next, oauthProviders }: Props) {
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
              ? "border-[#ec2227] text-[#ec2227]"
              : "border-transparent text-slate-400 hover:text-[#ec2227]"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`pb-2 transition border-b-2 ${
            mode === "signup"
              ? "border-[#ec2227] text-[#ec2227]"
              : "border-transparent text-slate-400 hover:text-[#ec2227]"
          }`}
        >
          Sign Up
        </button>
        {session && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="ml-auto rounded-md border border-[#ec2227]/40 px-3 py-1 text-xs font-medium text-[#ec2227] transition hover:bg-[#ec2227]/10"
          >
            Sign Out
          </button>
        )}
      </div>
      {mode === "signin" ? (
        <SignInForm next={next} oauthProviders={oauthProviders} />
      ) : (
        <SignUpForm next={next} oauthProviders={oauthProviders} />
      )}
      <p className="text-xs text-neutral-500">
        By continuing, you agree to our{" "}
        <a
          href={termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-700"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href={policiesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-700"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
