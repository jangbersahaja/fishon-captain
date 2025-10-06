import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function getQueue(all?: boolean) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = `${base}/api/admin/verification${all ? "?all=1" : ""}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      // Forward cookies to keep the session
      cookie: h.get("cookie") || "",
    },
  });
  if (!res.ok)
    return { items: [] } as {
      items: {
        userId: string;
        user?: { name?: string | null; email?: string | null };
        updatedAt: string;
        processing: string[];
        validated?: string[];
        charterName?: string | null;
      }[];
    };
  return (await res.json()) as {
    items: {
      userId: string;
      user?: { name?: string | null; email?: string | null };
      updatedAt: string;
      processing: string[];
      validated?: string[];
      charterName?: string | null;
    }[];
  };
}

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/verification");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const sp = searchParams ? await searchParams : {};
  const all = sp?.all === "1";
  const { items } = await getQueue(all);

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verification queue
        </h1>
        <a
          href={all ? "/staff/verification" : "/staff/verification?all=1"}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          {all ? "Show processing only" : "Show all"}
        </a>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">
          {all
            ? "No users with uploaded documents yet."
            : "No items in processing."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((it) => (
            <li
              key={it.userId}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
            >
              <div>
                <div className="font-medium text-slate-800">
                  {it.charterName || "(No charter)"}
                </div>
                <div className="text-xs text-slate-600">
                  User: {it.user?.name || it.user?.email || it.userId}
                </div>
                <div className="text-xs text-slate-500">
                  Updated {new Date(it.updatedAt).toLocaleString()}
                </div>
                {it.processing?.length ? (
                  <div className="mt-1 text-xs text-amber-700">
                    Need Review: {it.processing.join(", ")}
                  </div>
                ) : null}
                {it.validated?.length ? (
                  <div className="mt-1 text-xs text-emerald-700">
                    Validated: {it.validated.join(", ")}
                  </div>
                ) : null}
              </div>
              <a
                href={`/staff/verification/${it.userId}`}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Review
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
