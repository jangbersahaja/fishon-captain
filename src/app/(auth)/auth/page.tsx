import { AuthSwitcher } from "@/components/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in or Create Account | Fishon.my",
  description:
    "Access your captain portal to manage your charter. Sign in or create an account.",
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

//TODO: If user already has a charter, redirect to /captain instead of form
//TODO: If user is STAFF or ADMIN, redirect to /staff instead of /captain
//TODO: Add proper meta description
//TODO: Handle "next" param more securely to avoid open redirect
//TODO: Sanitize "next" param to avoid open redirect
//TODO: Use a library to parse and validate "next" param against a whitelist of allowed paths
//TODO: Validate "next" param to ensure it's a relative path within the app
//TODO: Use a library to parse and validate "next" param against a whitelist of allowed paths
//TODO: Change priority to use google account sign in
//TODO: Email verification for normal sign up
//TODO: When click register button from home switch to sign up tab
//TODO: Add reCAPTCHA to prevent bot sign ups
//TODO: Add rate limiting to prevent abuse
//TODO: Add facebook sign in option
//TODO: Add apple sign in option
//TODO: Tweak styling to match Fishon branding
//TODO: Add links to privacy policy and terms of service (www.fishon.my/support/policies)

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams.next || "/captain/form";
  if (session?.user?.email) {
    // If next is explicitly set (e.g., editing), honor it
    if (resolvedSearchParams.next) {
      redirect(next);
    }
    // Otherwise, if user already has a charter, take them to dashboard instead of form
    const userId = (session.user as { id?: string } | undefined)?.id;
    if (userId) {
      const profile = await prisma.captainProfile.findUnique({
        where: { userId },
        select: { id: true, charters: { select: { id: true }, take: 1 } },
      });
      if (profile && profile.charters.length > 0) {
        redirect("/captain");
      }
    }
    redirect(next);
  }
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Captain Portal</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Create an account or sign in to access your captain dashboard and
        charter form.
      </p>
      <AuthSwitcher next={next} />
    </main>
  );
}
