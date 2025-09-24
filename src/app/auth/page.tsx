import { AuthSwitcher } from "@/app/captains/register/_components/auth";
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

export default async function AuthPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  const next = searchParams.next || "/captain/form";
  if (session?.user?.email) {
    // If next is explicitly set (e.g., editing), honor it
    if (searchParams.next) {
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
