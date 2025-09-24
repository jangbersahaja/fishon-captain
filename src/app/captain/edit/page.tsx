import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function EditRedirectPage() {
  // For now just find latest charter and send user into existing register form as edit mode.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth?mode=signin");
  const profile = await prisma.captainProfile.findUnique({
    where: { userId },
    select: {
      charters: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      },
    },
  });
  if (!profile || !profile.charters.length) redirect("/captain/form");
  const charterId = profile.charters[0].id;
  redirect(`/captain/form?editCharterId=${charterId}`);
}
