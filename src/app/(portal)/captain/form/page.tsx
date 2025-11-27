import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FormSection from "@features/charter-onboarding/FormSection";
import { MessageCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
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
  const resolvedSearchParams = await searchParams;
  const adminUserId = resolvedSearchParams?.adminUserId;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  // Allow ADMIN to access any user's form with adminUserId parameter
  if (role === "ADMIN" && adminUserId) {
    // Admin is accessing another user's form - validate the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true },
    });
    if (!targetUser) {
      notFound();
    }
  } else if (role === "STAFF" || role === "ADMIN") {
    // Regular staff/admin without adminUserId go to staff dashboard
    redirect("/staff");
  }
  // If the logged-in user already has a published charter, send them to dashboard by default
  // Allow bypass when explicitly editing via ?editCharterId=
  if (!resolvedSearchParams?.editCharterId) {
    if (effectiveUserId) {
      const profile = await prisma.captainProfile.findUnique({
        where: { userId: effectiveUserId },
        select: { id: true, charters: { select: { id: true }, take: 1 } },
      });
      if (profile && profile.charters.length > 0 && !adminUserId) {
        // Only redirect to dashboard if not admin override
        redirect("/captain");
      }
    }
  } else {
    // Editing mode: validate that the charter exists
    const editCharterId = resolvedSearchParams.editCharterId;
    if (editCharterId && effectiveUserId) {
      let charter;
      if (role === "ADMIN") {
        // Admin can edit any charter
        charter = await prisma.charter.findUnique({
          where: { id: editCharterId },
          select: { id: true },
        });
      } else {
        // Regular users can only edit their own charters
        charter = await prisma.charter.findFirst({
          where: { id: editCharterId, captain: { userId: effectiveUserId } },
          select: { id: true },
        });
      }
      if (!charter) {
        // Unknown or unauthorized charter id -> trigger notFound route
        notFound();
      }
    } else if (editCharterId) {
      // No user id in session (should not reach here due to earlier auth check) but guard anyway
      notFound();
    }
  }
  // Get target user info for admin banner
  let targetUserInfo = null;
  if (adminUserId && role === "ADMIN") {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true },
    });
  }

  return (
    <div className="px-6 py-8">
      {!adminUserId && (
        <Link
          href={`https://wa.me/60165304304?text=Perlu%20bantuan%20daftar%20Fishon%20Captain`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed z-10 flex items-center gap-2 px-4 py-2 text-white rounded-full shadow-md top-1 right-1 bg-gradient-to-tr from-[#075E54] to-[#25D366] hover:shadow-lg hover:opacity-95 transition-opacity duration-500 ease-in-out hover:scale-102"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">Chat Admin</span>
        </Link>
      )}
      {targetUserInfo && (
        <div className="p-4 mb-6 border-2 border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-orange-800">
                🛡️ Admin Override Active
              </h2>
              <p className="text-xs text-orange-700">
                Editing form for: {targetUserInfo.name || targetUserInfo.email}{" "}
                ({targetUserInfo.id})
              </p>
            </div>
            <a
              href="/staff"
              className="px-3 py-1 text-xs font-semibold text-white bg-orange-600 rounded-full hover:bg-orange-700"
            >
              Exit Admin Mode
            </a>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-semibold">
        {targetUserInfo
          ? `Charter Form - ${targetUserInfo.name || targetUserInfo.email}`
          : "Charter Form"}
      </h1>
      <FormSection />
    </div>
  );
}
