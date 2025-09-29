import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { del } from "@vercel/blob";
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
    additionalUpdateName?: { key: string; name: string };
    additional?: Uploaded[];
    remove?: string; // remove a single-field document (idFront, idBack, etc.)
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
      // Prevent overwriting an approved (validated) document
      const existing = row[f] as unknown as
        | (Uploaded & {
            status?: string;
          })
        | null;
      if (existing && existing.status === "validated") {
        return applySecurityHeaders(
          NextResponse.json({ error: "locked" }, { status: 403 })
        );
      }
      updateData[f] = {
        key: u.key,
        url: u.url,
        name: u.name,
        updatedAt: u.updatedAt ?? new Date().toISOString(),
      };
      touched = true;
    }
  }

  // Remove a single-field document (set to null) if not validated
  if (typeof data.remove === "string") {
    const field = data.remove as string;
    if ((singleFields as readonly string[]).includes(field)) {
      const existing = row[
        field as (typeof singleFields)[number]
      ] as unknown as (Uploaded & { status?: string }) | null;
      if (existing) {
        if (existing.status === "validated") {
          return applySecurityHeaders(
            NextResponse.json({ error: "locked" }, { status: 403 })
          );
        }
        // Explicitly clear JSON field (cast for type compatibility)
        updateData[field as (typeof singleFields)[number]] =
          null as unknown as Prisma.InputJsonValue;
        touched = true;
        // Best-effort blob delete
        try {
          if (existing.key) {
            await del(existing.key, {
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
          }
        } catch {}
      }
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
    // Prevent removal if the item is validated (approved)
    const target = currentAdditional.find((x) => x.key === key) as
      | (Uploaded & { status?: string })
      | undefined;
    if (target && target.status === "validated") {
      return applySecurityHeaders(
        NextResponse.json({ error: "locked" }, { status: 403 })
      );
    }
    const next = currentAdditional.filter((x) => x.key !== key);
    updateData.additional = next as Prisma.InputJsonValue;
    touched = true;
    // Best-effort blob delete (server-side) when removing additional
    if (key.startsWith(`verification/${userId}/`)) {
      await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(
        () => {}
      );
    }
  }

  // Update name of an item in additional by key
  if (
    data.additionalUpdateName &&
    typeof data.additionalUpdateName === "object"
  ) {
    const maybe = data.additionalUpdateName as Record<string, unknown>;
    const key = typeof maybe.key === "string" ? maybe.key : undefined;
    const name = typeof maybe.name === "string" ? maybe.name : undefined;
    if (key && name) {
      const next = currentAdditional.map((x) =>
        x.key === key
          ? {
              ...x,
              name,
              updatedAt: new Date().toISOString(),
            }
          : x
      );
      updateData.additional = next as Prisma.InputJsonValue;
      touched = true;
    }
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

  // Define supported submit commands
  type SubmitCommands = {
    submitGovtId?: boolean;
    submit?: (typeof singleFields)[number];
    submitAdditional?: string[];
  };
  const commands: SubmitCommands = data as SubmitCommands;

  // Submission commands: mark status as processing
  // Submit both government ID sides together
  if (!touched && commands.submitGovtId) {
    const idFront = row.idFront as unknown as
      | (Uploaded & {
          status?: string;
        })
      | null;
    const idBack = row.idBack as unknown as
      | (Uploaded & {
          status?: string;
        })
      | null;
    if (!idFront || !idBack) {
      return applySecurityHeaders(
        NextResponse.json({ error: "missing_required" }, { status: 400 })
      );
    }
    updateData.idFront = { ...idFront, status: "processing" } as Json;
    updateData.idBack = { ...idBack, status: "processing" } as Json;
    touched = true;
  }

  // Submit single field
  const submitField = commands.submit;
  if (
    !touched &&
    submitField &&
    (singleFields as readonly string[]).includes(submitField)
  ) {
    const curr = row[
      submitField as (typeof singleFields)[number]
    ] as unknown as
      | (Uploaded & {
          status?: string;
        })
      | null;
    if (!curr) {
      return applySecurityHeaders(
        NextResponse.json({ error: "not_found" }, { status: 404 })
      );
    }
    updateData[submitField as (typeof singleFields)[number]] = {
      ...curr,
      status: "processing",
    } as Json;
    touched = true;
  }

  // Submit additional selected keys
  const submitAdditional = commands.submitAdditional;
  if (!touched && Array.isArray(submitAdditional)) {
    const set = new Set(submitAdditional);
    const next = currentAdditional.map((u) =>
      set.has(u.key) ? ({ ...u, status: "processing" } as Uploaded) : u
    );
    updateData.additional = next as Prisma.InputJsonValue;
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

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  const row = await prisma.captainVerification.findUnique({
    where: { userId },
  });
  return applySecurityHeaders(NextResponse.json({ verification: row }));
}
