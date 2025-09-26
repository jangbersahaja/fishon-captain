import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

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
        <pre className="max-h-[480px] overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100 shadow-inner">
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
