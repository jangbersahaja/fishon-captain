import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FormSection from "@features/charter-form/FormSection";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // ensure fresh session check

export default async function CaptainFormPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/auth?next=${encodeURIComponent("/captain/form")}`);
  }
  // If the logged-in user already has a published charter, send them to dashboard by default
  // Allow bypass when explicitly editing via ?editCharterId=
  if (!searchParams?.editCharterId) {
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
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Charter Form</h1>
      <FormSection />
    </div>
  );
}
