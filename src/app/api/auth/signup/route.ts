import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

interface SignupBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export async function POST(req: Request) {
  let body: SignupBody = {};
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { email, password, firstName, lastName } = body;
  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }
  const passwordHash = await hash(password, 10);
  const compositeName = `${firstName} ${lastName}`.trim();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: compositeName,
      firstName,
      lastName,
    },
    select: { id: true },
  });
  // Optionally store displayName later once CaptainProfile created; for now displayName captured in draft form.
  return NextResponse.json({ ok: true, id: user.id });
}
