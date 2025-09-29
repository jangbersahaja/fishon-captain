import { AuthSwitcher } from "@/components/auth";
import { oauthProviders as authOauthProviders, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

export const metadata: Metadata = {
  title: "Sign in or Create Account | Fishon.my",
  description:
    "Sign in to the Fishon captain portal to manage charters, bookings, pricing, media, and crew in one place, or create a new account to get started.",
  alternates: { canonical: "https://www.fishon.my/auth" },
  openGraph: {
    title: "Captain Portal | Fishon.my",
    description:
      "Manage your listing, bookings, media, pricing and more from the captain portal.",
    url: "https://www.fishon.my/auth",
    type: "website",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "Captain Portal | Fishon.my",
    description: "Sign in or create an account to manage your charter.",
  },
};
const fallbackNextPath = "/captain/form";
const siteOrigin = "https://www.fishon.my";
const allowedNextPaths = new Set([
  "/captain/form",
  "/captain",
  "/staff",
  "/staff/media",
  "/staff/charters",
  "/staff/registrations",
  "/staff/verification",
  "/dev/debug",
]);
const allowedNextPrefixes = [
  "/staff/charters/",
  "/staff/registrations/",
  "/staff/verification/",
];

const nextParamSchema = z
  .string()
  .trim()
  .refine((value) => value.length > 0, { message: "Empty path" })
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Path must be relative to the site root",
  })
  .transform((value) => new URL(value, siteOrigin))
  .refine((url) => url.origin === siteOrigin, {
    message: "Invalid origin",
  })
  .refine(
    (url) =>
      allowedNextPaths.has(url.pathname) ||
      allowedNextPrefixes.some((prefix) => url.pathname.startsWith(prefix)),
    {
      message: "Path not in whitelist",
    }
  )
  .transform((url) => `${url.pathname}${url.search}${url.hash}`);

const sanitizeNext = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const result = nextParamSchema.safeParse(value);
  return result.success ? result.data : undefined;
};
//TODO: Email verification for normal sign up
//TODO: When click register button from home switch to sign up tab
//TODO: Add reCAPTCHA to prevent bot sign ups
//TODO: Add rate limiting to prevent abuse

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;
  const sanitizedNext = sanitizeNext(resolvedSearchParams.next);
  const next = sanitizedNext ?? fallbackNextPath;
  const oauthProviders = authOauthProviders.map((provider) =>
    ["facebook", "apple"].includes(provider.id)
      ? { ...provider, configured: false }
      : provider
  );
  if (session?.user?.email) {
    // If next is explicitly set (e.g., editing), honor it
    if (sanitizedNext) {
      redirect(sanitizedNext);
    }
    // Otherwise, if user already has a charter, take them to dashboard instead of form
    const userId = (session.user as { id?: string } | undefined)?.id;
    const userRole = (session.user as { role?: string } | undefined)?.role;
    if (userId) {
      const profile = await prisma.captainProfile.findUnique({
        where: { userId },
        select: { id: true, charters: { select: { id: true }, take: 1 } },
      });
      if (profile && profile.charters.length > 0) {
        redirect(
          userRole === "STAFF" || userRole === "ADMIN" ? "/staff" : "/captain"
        );
      }
    }
    redirect(next);
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
              Sign in or create your account
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage charters, bookings, and crew with the Fishon tools you
              already use.
            </p>
          </div>
          <div className="px-6 py-8 sm:px-8">
            <AuthSwitcher next={next} oauthProviders={oauthProviders} />
          </div>
        </div>
      </div>
    </main>
  );
}
