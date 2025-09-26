import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register Your Charter | Fishon.my",
  description:
    "List your fishing charter on Fishon.my. Add trips, pricing, photos, boat details, policies, and more.",
  alternates: { canonical: "https://www.fishon.my/captains/register" },
  openGraph: {
    title: "Register Your Charter | Fishon.my",
    description:
      "Add your listing with trips, photos, boat details, and policies. Start getting bookings today.",
    url: "https://www.fishon.my/captains/register",
    type: "website",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "Register Your Charter | Fishon.my",
    description:
      "Add your listing with trips, photos, boat details, and policies.",
  },
};

export default async function CaptainAuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams.next || "/captain/form";
  if (session?.user?.email) {
    // If next is explicitly set (e.g., onboarding/edit), honor it
    if (resolvedSearchParams.next) {
      redirect(next);
    }
    // Otherwise, if user already has a charter, take them to dashboard instead of onboarding
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
  redirect(
    `/auth?${new URLSearchParams({
      mode: resolvedSearchParams.mode || "signin",
      next,
    }).toString()}`
  );
}
