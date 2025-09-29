import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FormSection from "@features/charter-onboarding/FormSection";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // ensure fresh session check

export default async function CaptainFormPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/auth?next=${encodeURIComponent("/captain/form")}`);
  }
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role === "STAFF" || role === "ADMIN") redirect("/staff");
  // If the logged-in user already has a published charter, send them to dashboard by default
  // Allow bypass when explicitly editing via ?editCharterId=
  const resolvedSearchParams = await searchParams;
  if (!resolvedSearchParams?.editCharterId) {
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
  } else {
    // Editing mode: validate that the charter exists and belongs to this user; otherwise 404.
    const editCharterId = resolvedSearchParams.editCharterId;
    const userId = (session.user as { id?: string } | undefined)?.id;
    if (editCharterId && userId) {
      const charter = await prisma.charter.findFirst({
        where: { id: editCharterId, captain: { userId } },
        select: { id: true },
      });
      if (!charter) {
        // Unknown or unauthorized charter id -> trigger notFound route
        notFound();
      }
    } else if (editCharterId) {
      // No user id in session (should not reach here due to earlier auth check) but guard anyway
      notFound();
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-2 sm-px-4 py-12">
      <h1 className="text-2xl font-semibold">Captain & Charter Form</h1>
      <FormSection />
    </div>
  );
}
