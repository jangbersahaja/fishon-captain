import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Server helper: approve selected fields for a user, optionally with a valid-until or forever flag
async function approve(
  userId: string,
  approve: string[],
  validTo?: string,
  validForever?: boolean
) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = `${base}/api/admin/verification`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: h.get("cookie") || "",
    },
    body: JSON.stringify({ userId, approve, validTo, validForever }),
    cache: "no-store",
  });
  return res.ok;
}

// Server helper: reject selected fields for a user with optional reason
async function reject(userId: string, rejectFields: string[], reason?: string) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = `${base}/api/admin/verification`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: h.get("cookie") || "",
    },
    body: JSON.stringify({ userId, reject: rejectFields, reason }),
    cache: "no-store",
  });
  return res.ok;
}

type DocData = {
  key: string;
  url: string;
  name: string;
  updatedAt?: string;
  status?: "processing" | "validated" | "rejected";
  validForPeriod?: { from?: string; to?: string };
};
type Doc = DocData | null;

const toDoc = (v: unknown): Doc => {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const key = typeof r.key === "string" ? r.key : undefined;
  const url = typeof r.url === "string" ? r.url : undefined;
  const name = typeof r.name === "string" ? r.name : undefined;
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : undefined;
  const s = r.status;
  const status: DocData["status"] | undefined =
    s === "processing" || s === "validated" || s === "rejected"
      ? (s as DocData["status"])
      : undefined;
  const vfp =
    r.validForPeriod && typeof r.validForPeriod === "object"
      ? (r.validForPeriod as Record<string, unknown>)
      : undefined;
  const validForPeriod = vfp
    ? {
        from: typeof vfp.from === "string" ? vfp.from : undefined,
        to: typeof vfp.to === "string" ? vfp.to : undefined,
      }
    : undefined;
  if (!key || !url || !name) return null;
  return { key, url, name, updatedAt, status, validForPeriod };
};

export default async function VerificationReviewPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user)
    redirect(`/auth?mode=signin&next=/staff/verification/${userId}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const row = await prisma.captainVerification.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          captainProfile: { include: { charters: true } },
        },
      },
    },
  });

  if (!row) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Review & approve
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          No verification record found for this user.
        </p>
      </div>
    );
  }

  const docs: Record<
    | "idFront"
    | "idBack"
    | "captainLicense"
    | "boatRegistration"
    | "fishingLicense",
    Doc
  > = {
    idFront: toDoc(row.idFront),
    idBack: toDoc(row.idBack),
    captainLicense: toDoc(row.captainLicense),
    boatRegistration: toDoc(row.boatRegistration),
    fishingLicense: toDoc(row.fishingLicense),
  };

  const additional: NonNullable<Doc>[] = Array.isArray(row.additional)
    ? (row.additional as unknown[])
        .map((x) => toDoc(x))
        .filter((x): x is NonNullable<Doc> => !!x)
    : [];

  const isImage = (nameOrUrl: string) =>
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nameOrUrl);
  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
        })
      : "";

  const cps = row.user?.captainProfile;
  const cs = cps?.charters || [];
  const sorted = [...cs].sort((a, b) =>
    a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0
  );
  const charterName = sorted[0]?.name;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {charterName ? `Review: ${charterName}` : "Review & approve"}
      </h1>
      <div className="text-sm text-slate-600">
        <div>User: {row.user?.name || row.user?.email || userId}</div>
        <div className="text-slate-500">
          Last update: {fmtDate(row.updatedAt.toISOString())}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            { key: "idFront", label: "ID: Front" },
            { key: "idBack", label: "ID: Back" },
            { key: "captainLicense", label: "Captain license" },
            { key: "boatRegistration", label: "Boat registration" },
            { key: "fishingLicense", label: "Fishing license" },
          ] as const
        ).map((f) => {
          const d = docs[f.key];
          return (
            <div
              key={f.key}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-800">{f.label}</div>
                </div>
                {d?.status === "validated" ? (
                  <span className="inline-flex flex-col items-start justify-center gap-0.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 sm:flex-row sm:items-center sm:gap-1">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Validated
                    </span>
                    {d.validForPeriod?.to ? (
                      <span className="text-emerald-800/80 sm:ml-1">
                        until {fmtDate(d.validForPeriod.to)}
                      </span>
                    ) : null}
                  </span>
                ) : d?.status === "processing" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Processing
                  </span>
                ) : null}
              </div>

              {/* Preview */}
              <div className="mt-3">
                {d?.url ? (
                  isImage(d.name || d.url) ? (
                    <a
                      href={d.url}
                      target="_blank"
                      className="block overflow-hidden rounded-lg border border-slate-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.url}
                        alt={d.name}
                        className="h-48 w-full object-contain bg-slate-50"
                      />
                    </a>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <FileText className="h-4 w-4 text-slate-500" />{" "}
                        {d?.name}
                      </span>
                      <a
                        href={d.url}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm text-slate-700 hover:underline"
                      >
                        <LinkIcon className="h-4 w-4" /> Open
                      </a>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-slate-400">
                    <ImageIcon className="h-4 w-4" /> No file
                  </div>
                )}
              </div>

              {d?.name ? (
                <div className="mt-1 text-xs text-slate-500 break-al">
                  {d.name}
                </div>
              ) : (
                <div className="text-xs text-slate-400">Not uploaded</div>
              )}

              {/* Inline Approve/Reject controls - between preview and updated date */}
              <div className="mt-3 flex flex-col gap-2">
                {d?.url && d?.status !== "validated" && (
                  <form className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="field" value={f.key} />
                    <label className="text-xs text-slate-700">
                      Valid until
                    </label>
                    <input
                      type="date"
                      name="validTo"
                      className="w-fit rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <input type="checkbox" name="validForever" value="1" />
                      Valid forever
                    </label>
                    <button
                      formAction={async (formData) => {
                        "use server";
                        const field =
                          (formData.get("field") as string) || f.key;
                        const dateStr =
                          (formData.get("validTo") as string) || undefined;
                        const validTo = dateStr
                          ? new Date(dateStr).toISOString()
                          : undefined;
                        const vf = formData.get("validForever") === "1";
                        await approve(
                          userId,
                          [field],
                          vf ? undefined : validTo,
                          vf
                        );
                        redirect(`/staff/verification/${userId}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Approve
                    </button>
                  </form>
                )}

                {d?.url && (
                  <form className="flex items-center gap-2">
                    <input type="hidden" name="field" value={f.key} />
                    <input
                      type="text"
                      name="reason"
                      placeholder="Reason (optional)"
                      className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    />
                    <button
                      formAction={async (formData) => {
                        "use server";
                        const field =
                          (formData.get("field") as string) || f.key;
                        const reason =
                          (formData.get("reason") as string) || undefined;
                        await reject(userId, [field], reason);
                        redirect(`/staff/verification/${userId}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
                    >
                      Reject
                    </button>
                  </form>
                )}
              </div>

              {d?.updatedAt ? (
                <div className="mt-2 text-xs text-slate-500">
                  Updated {fmtDate(d.updatedAt)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {additional.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-800">Additional documents</div>
          <ul className="mt-2 grid gap-2">
            {additional.map((d) => (
              <li
                key={d?.key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <span className="flex items-center gap-2 min-w-0 pr-3">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="whitespace-normal break-all text-xs">
                    {d?.name}
                  </span>
                </span>
                {d?.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-slate-700 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" /> Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Raw verification row (dev only)
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(
                row ? JSON.parse(JSON.stringify(row)) : null,
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
