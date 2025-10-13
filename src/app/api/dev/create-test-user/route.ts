import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.ENABLE_DEV_USER_BOOTSTRAP !== "true") {
    return applySecurityHeaders(
      NextResponse.json({ error: "disabled" }, { status: 404 })
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );
  }

  if (!body || typeof body !== "object") {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    );
  }
  const { email, password, name } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email },
      data: { passwordHash, name: name ?? existing.name },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: typeof name === "string" ? name : email.split("@")[0],
      },
    });
  }

  return applySecurityHeaders(NextResponse.json({ ok: true, id: user.id }));
}
