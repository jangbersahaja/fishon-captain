import { AdminBypassLink } from "@/components/admin";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForceSubmitButton } from "./_components/ForceSubmitButton";

function safePretty(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
}

async function addNote(formData: FormData) {
  "use server";
  const draftId = formData.get("draftId") as string;
  const body = (formData.get("body") as string)?.trim();
  if (!draftId || !body) return;
  const session = await getServerSession(authOptions);
  if (!session?.user) return;
  const user = session.user as { id: string; role?: string };
  if (user.role !== "STAFF" && user.role !== "ADMIN") return;
  await prisma.draftNote.create({
    data: { draftId, body, authorId: user.id },
  });
  revalidatePath(`/staff/registrations/${draftId}`);
}

async function forceSubmit(formData: FormData) {
  "use server";
  const draftId = formData.get("draftId") as string;
  const targetUserId = formData.get("targetUserId") as string;

  if (!draftId || !targetUserId)
    return { success: false, error: "Missing parameters" };

  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const user = session.user as { id: string; role?: string };
  if (user.role !== "STAFF" && user.role !== "ADMIN") {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    // Fetch the draft
    const draft = await prisma.charterDraft.findUnique({
      where: { id: draftId },
      include: {
        user: { select: { id: true } },
      },
    });

    if (!draft) return { success: false, error: "Draft not found" };
    if (draft.status !== "DRAFT") {
      return { success: false, error: "Draft is not in DRAFT status" };
    }

    // No longer send media payload - finalize route uses canonical CharterMedia and CaptainVideo tables
    // Media is already stored in CharterMedia (photos) and CaptainVideo (videos) tables
    // The finalize route will query these tables directly based on captainId/userId

    // Call finalize endpoint with adminUserId parameter
    const h = await import("next/headers").then((m) => m.headers());
    const host = (await h).get("host");
    const proto = (await h).get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http") ? host : `${proto}://${host}`;
    const url = `${base}/api/charter-drafts/${draftId}/finalize?adminUserId=${targetUserId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-draft-version": String(draft.version),
        cookie: (await h).get("cookie") || "",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[forceSubmit] Error response:", errorData);

      // Format validation errors if present
      let errorMessage = errorData.error || `HTTP ${response.status}`;
      if (errorData.issues && Array.isArray(errorData.issues)) {
        const issueDetails = errorData.issues
          .map(
            (issue: { path: unknown[]; message: string }) =>
              `${issue.path.join(".")}: ${issue.message}`
          )
          .join("; ");
        errorMessage = `Validation failed: ${issueDetails}`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();
    revalidatePath(`/staff/registrations/${draftId}`);
    revalidatePath("/staff/registrations");

    return {
      success: true,
      charterId: result.charterId,
      message: "Draft successfully submitted",
    };
  } catch (error) {
    console.error("Force submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function StaffRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user)
    redirect(`/auth?mode=signin&next=/staff/registrations/${id}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const draft = await prisma.charterDraft.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      charter: { select: { id: true, name: true } },
    },
  });
  if (!draft) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold">Registration</h1>
        <p className="text-sm text-slate-600">Draft not found.</p>
      </div>
    );
  }

  // Notes (separate fetch to avoid include issues in stale client environments)
  let notes: {
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    author?: { id: string; name: string | null; email: string | null };
  }[] = [];
  let notesEnabled = true;
  try {
    notes = await prisma.draftNote.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  } catch {
    notesEnabled = false;
  }

  const TOTAL_STEPS = 5;
  const effectiveStepCount =
    draft.status === "SUBMITTED" ? TOTAL_STEPS : draft.currentStep + 1;
  const progress = Math.round((effectiveStepCount / TOTAL_STEPS) * 100);

  // Count media in draft data for display (check both field naming conventions)
  const mediaCount = { photos: 0, videos: 0 };
  try {
    const draftData = draft.data as Record<string, unknown>;
    const photosArray = (draftData?.uploadedPhotos ||
      draftData?.photos) as unknown;
    if (photosArray && Array.isArray(photosArray)) {
      mediaCount.photos = photosArray.length;
    }
    const videosArray = (draftData?.uploadedVideos ||
      draftData?.videos) as unknown;
    if (videosArray && Array.isArray(videosArray)) {
      mediaCount.videos = videosArray.length;
    }
  } catch {
    // Ignore parsing errors
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Registration Draft
          </h1>
          <p className="text-sm text-slate-600">Draft ID: {draft.id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/registrations"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
          <a
            href={`mailto:${draft.user.email}?subject=Continue your Fishon charter registration&body=Hi%20there,%20you%20can%20resume%20your%20charter%20registration:%20https://www.fishon.my/captain/form`}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Email User
          </a>
          <AdminBypassLink
            href={`/captain/form?adminUserId=${draft.user.id}`}
            confirmTitle="Admin Impersonation - Open Draft Form"
            confirmDescription={`You are about to open the registration form as:\n\nUser: ${
              draft.user.name || "Unknown"
            }\nEmail: ${draft.user.email || "No email"}\nDraft ID: ${
              draft.id
            }\n\nThis will allow you to view and edit their draft. Please enter your admin password to confirm.`}
            variant="outline"
            size="sm"
            className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
          >
            🛡️ Open Form
          </AdminBypassLink>
          <ForceSubmitButton
            draftId={draft.id}
            targetUserId={draft.user.id}
            status={draft.status}
            forceSubmitAction={forceSubmit}
          />
        </div>
      </div>

      {/* Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Summary</h2>
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div>
            <span className="text-slate-500">User:</span>{" "}
            {draft.user.name || "—"}
            <div className="text-[11px] text-slate-500">{draft.user.id}</div>
          </div>
          <div>
            <span className="text-slate-500">Email:</span> {draft.user.email}
          </div>
          <div>
            <span className="text-slate-500">Status:</span> {draft.status}
          </div>
          <div>
            <span className="text-slate-500">Step:</span>{" "}
            {draft.status === "SUBMITTED"
              ? `${TOTAL_STEPS} / ${TOTAL_STEPS}`
              : `${draft.currentStep + 1} / ${TOTAL_STEPS}`}
          </div>
          <div>
            <span className="text-slate-500">Progress:</span> {progress}%
          </div>
          <div>
            <span className="text-slate-500">Version:</span> {draft.version}
          </div>
          <div>
            <span className="text-slate-500">Form version:</span>{" "}
            {draft.formVersion}
          </div>
          <div>
            <span className="text-slate-500">Charter Linked:</span>{" "}
            {draft.charter ? (
              <Link
                href={`/staff/charters/${draft.charter.id}`}
                className="text-sky-600 hover:underline"
              >
                {draft.charter.name || draft.charter.id}
              </Link>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="text-slate-500">Last touched:</span>{" "}
            {new Date(draft.lastTouchedAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Updated:</span>{" "}
            {new Date(draft.updatedAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Created:</span>{" "}
            {new Date(draft.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500">Media:</span>{" "}
            <span
              className={
                mediaCount.photos < 3 ? "text-amber-600 font-medium" : ""
              }
            >
              {mediaCount.photos} photo{mediaCount.photos !== 1 ? "s" : ""}
            </span>
            {", "}
            {mediaCount.videos} video{mediaCount.videos !== 1 ? "s" : ""}
            {mediaCount.photos < 3 && (
              <span className="ml-2 text-[10px] text-amber-600">
                ⚠ Need 3+ photos
              </span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-sky-500"
              style={{ width: progress + "%" }}
            />
          </div>
        </div>
      </section>

      {/* Raw Data */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Raw Draft Data
        </h2>
        <pre className="max-h-[480px] overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100 shadow-inner whitespace-pre-wrap break-all">
          {safePretty(draft.data)}
        </pre>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Internal Notes
          </h2>
          <span className="text-xs text-slate-500">Latest 50</span>
        </div>
        {notesEnabled ? (
          <>
            <form action={addNote} className="space-y-2">
              <input type="hidden" name="draftId" value={draft.id} />
              <textarea
                name="body"
                required
                minLength={2}
                rows={3}
                placeholder="Add a note for other staff (outreach done, missing data, etc.)"
                className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </form>
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-slate-50/40">
              {notes.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No notes yet.</div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 flex flex-col gap-1 bg-white/60 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {n.author?.name || n.author?.email || n.authorId}
                      </span>
                      <span>•</span>
                      <time dateTime={n.createdAt.toISOString()}>
                        {new Date(n.createdAt).toLocaleString()}
                      </time>
                      <span className="ml-auto inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-600">
                        #{n.id.slice(0, 6)}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                      {n.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            Notes unavailable (stale Prisma client). Restart dev server after
            migration.
          </div>
        )}
      </section>
    </div>
  );
}
