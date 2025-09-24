import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );

  // Upsert verification row and apply changes based on payload shape
  // Payloads supported:
  // - { idFront | idBack | captainLicense | boatRegistration | fishingLicense: Uploaded }
  // - { additionalAdd: Uploaded }
  // - { additionalRemove: string } // key
  // - Full snapshot: { idFront, idBack, captainLicense, boatRegistration, fishingLicense, additional }
  type Uploaded = {
    key: string;
    url: string;
    name: string;
    updatedAt?: string;
  };
  type Body = Partial<
    Record<
      | "idFront"
      | "idBack"
      | "captainLicense"
      | "boatRegistration"
      | "fishingLicense",
      Uploaded
    >
  > & {
    additionalAdd?: Uploaded;
    additionalRemove?: string;
    additional?: Uploaded[];
  };
  const data = body as Body;

  const row = await prisma.captainVerification.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const currentAdditional: Uploaded[] = Array.isArray(row.additional)
    ? (row.additional as unknown as Uploaded[])
    : [];

  type Json = Prisma.InputJsonValue;
  const updateData: {
    idFront?: Json;
    idBack?: Json;
    captainLicense?: Json;
    boatRegistration?: Json;
    fishingLicense?: Json;
    additional?: Json;
  } = {};

  const singleFields = [
    "idFront",
    "idBack",
    "captainLicense",
    "boatRegistration",
    "fishingLicense",
  ] as const;

  let touched = false;
  for (const f of singleFields) {
    const val = data[f];
    if (val && typeof val === "object") {
      const u = val as Uploaded;
      updateData[f] = {
        key: u.key,
        url: u.url,
        name: u.name,
        updatedAt: u.updatedAt ?? new Date().toISOString(),
      };
      touched = true;
    }
  }

  if (data.additionalAdd && typeof data.additionalAdd === "object") {
    const u = data.additionalAdd as Uploaded;
    const next = [
      ...currentAdditional,
      {
        key: u.key,
        url: u.url,
        name: u.name,
        updatedAt: u.updatedAt ?? new Date().toISOString(),
      },
    ];
    updateData.additional = next as Prisma.InputJsonValue;
    touched = true;
  }

  if (typeof data.additionalRemove === "string") {
    const key = data.additionalRemove as string;
    const next = currentAdditional.filter((x) => x.key !== key);
    updateData.additional = next as Prisma.InputJsonValue;
    touched = true;
  }

  // Full snapshot support
  if (!touched && data.additional) {
    const snapshot: Record<string, unknown> = {};
    for (const f of singleFields) {
      const u = data[f] as Uploaded | null | undefined;
      if (u) {
        snapshot[f] = {
          key: u.key,
          url: u.url,
          name: u.name,
          updatedAt: u.updatedAt ?? new Date().toISOString(),
        };
      } else {
        snapshot[f] = null;
      }
    }
    const add = data.additional as Uploaded[];
    snapshot.additional = Array.isArray(add)
      ? add.map((u) => ({
          key: u.key,
          url: u.url,
          name: u.name,
          updatedAt: u.updatedAt ?? new Date().toISOString(),
        }))
      : [];
    Object.assign(updateData, snapshot);
    touched = true;
  }

  if (touched) {
    await prisma.captainVerification.update({
      where: { userId },
      data: updateData,
    });
  }

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
