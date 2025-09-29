import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type SessionUser = {
  id?: string;
  role?: string;
  image?: string | null;
  name?: string | null;
};

type StatusResponse =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      role: string | null;
      hasCharter: boolean;
      avatarUrl: string | null;
      image: string | null;
      name: string | null;
      nickname: string | null;
      firstName: string | null;
      lastName: string | null;
    };

export async function GET(): Promise<NextResponse<StatusResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ authenticated: false });
  }

  const { id, role, image, name } = session.user as SessionUser;

  let hasCharter = false;
  let avatarUrl: string | null = null;
  let nickname: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  let baseName: string | null = name ?? null;

  if (id) {
    try {
      const [profile, userRecord] = await Promise.all([
        prisma.captainProfile.findUnique({
          where: { userId: id },
          select: {
            avatarUrl: true,
            displayName: true,
            charters: { select: { id: true }, take: 1 },
          },
        }),
        prisma.user.findUnique({
          where: { id },
          select: { firstName: true, lastName: true, name: true },
        }),
      ]);
      hasCharter = !!profile?.charters?.length;
      avatarUrl = profile?.avatarUrl ?? null;
      nickname = profile?.displayName ?? null;
      firstName = userRecord?.firstName ?? null;
      lastName = userRecord?.lastName ?? null;
      baseName = userRecord?.name ?? baseName;
    } catch {
      hasCharter = false;
      avatarUrl = null;
      nickname = null;
      firstName = null;
      lastName = null;
    }
  }

  return NextResponse.json({
    authenticated: true,
    role: role ?? null,
    hasCharter,
    avatarUrl,
    image: image ?? null,
    name: baseName,
    nickname,
    firstName,
    lastName,
  });
}
