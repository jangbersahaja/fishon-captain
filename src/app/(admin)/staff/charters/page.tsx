import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ChartersClient from "./_components/ChartersClient";

async function getCharters(
  q?: string,
  activeParam?: "1" | "0" | undefined,
  page?: number,
  pageSize?: number,
  sort?: string,
  order?: string
) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = new URL(`${base}/api/admin/charters`);
  if (q) url.searchParams.set("q", q);
  if (activeParam) url.searchParams.set("active", activeParam);
  if (page) url.searchParams.set("page", String(page));
  if (pageSize) url.searchParams.set("pageSize", String(pageSize));
  if (sort) url.searchParams.set("sort", sort);
  if (order) url.searchParams.set("order", order);
  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") || "" },
  });
  if (!res.ok)
    return {
      items: [],
      total: 0,
      page: page || 1,
      pageSize: pageSize || 20,
    } as {
      items: {
        id: string;
        name: string;
        city: string;
        state: string;
        isActive: boolean;
        updatedAt: string;
        captain?: { displayName?: string | null; userId: string };
      }[];
      total: number;
      page: number;
      pageSize: number;
    };
  return (await res.json()) as {
    items: {
      id: string;
      name: string;
      city: string;
      state: string;
      isActive: boolean;
      updatedAt: string;
      captain?: { displayName?: string | null; userId: string };
    }[];
    total: number;
    page: number;
    pageSize: number;
  };
}

// single toggle handled via client bulkAction by submitting one id

async function bulkToggle(ids: string[], isActive: boolean) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const base = host?.startsWith("http")
    ? (host as string)
    : `${proto}://${host}`;
  const url = `${base}/api/admin/charters`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: h.get("cookie") || "",
    },
    body: JSON.stringify({ ids, isActive }),
    cache: "no-store",
  });
}

export default async function StaffChartersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/charters");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const activeParam =
    typeof sp.active === "string" ? (sp.active as "1" | "0") : undefined;
  const page = Math.max(1, parseInt((sp.page as string) || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt((sp.pageSize as string) || "20", 10) || 20)
  );
  const sort = (sp.sort as string) || "updatedAt";
  const order = (sp.order as string) || "desc";
  const { items, total } = await getCharters(
    q,
    activeParam,
    page,
    pageSize,
    sort,
    order
  );
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  async function bulkAction(formData: FormData) {
    "use server";
    const op = (formData.get("op") as string) || "enable";
    const ids = (formData.getAll("ids") as string[]).filter(Boolean);
    if (ids.length > 0) {
      await bulkToggle(ids, op === "enable");
    }
    const redirectTo =
      (formData.get("redirectTo") as string) ||
      `/staff/charters?${new URLSearchParams({
        ...(q ? { q } : {}),
        ...(activeParam ? { active: activeParam } : {}),
        sort,
        order,
        pageSize: String(pageSize),
        page: String(page),
      }).toString()}`;
    redirect(redirectTo);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Charters</h1>
        <div className="flex items-center gap-2 text-xs">
          <a
            href={`/staff/charters?${new URLSearchParams({
              ...(q ? { q } : {}),
              sort,
              order,
              pageSize: String(pageSize),
            }).toString()}`}
            className={`rounded-full border px-3 py-1 ${
              !activeParam
                ? "border-slate-800 text-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All
          </a>
          <a
            href={`/staff/charters?${new URLSearchParams({
              ...(q ? { q } : {}),
              active: "1",
              sort,
              order,
              pageSize: String(pageSize),
            }).toString()}`}
            className={`rounded-full border px-3 py-1 ${
              activeParam === "1"
                ? "border-slate-800 text-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Active
          </a>
          <a
            href={`/staff/charters?${new URLSearchParams({
              ...(q ? { q } : {}),
              active: "0",
              sort,
              order,
              pageSize: String(pageSize),
            }).toString()}`}
            className={`rounded-full border px-3 py-1 ${
              activeParam === "0"
                ? "border-slate-800 text-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Inactive
          </a>
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action="/staff/charters"
        method="get"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name/city/state"
          className="h-9 w-full max-w-md rounded-md border border-slate-300 px-2 text-sm"
        />
        {activeParam ? (
          <input type="hidden" name="active" value={activeParam} />
        ) : null}
        <select
          name="sort"
          defaultValue={sort}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="updatedAt">Updated</option>
          <option value="name">Name</option>
          <option value="city">City</option>
          <option value="state">State</option>
        </select>
        <select
          name="order"
          defaultValue={order}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <select
          name="pageSize"
          defaultValue={String(pageSize)}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        >
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No charters found.</p>
      ) : (
        <ChartersClient
          items={items}
          bulkAction={bulkAction}
          redirectTo={`/staff/charters?${new URLSearchParams({
            ...(q ? { q } : {}),
            ...(activeParam ? { active: activeParam } : {}),
            sort,
            order,
            pageSize: String(pageSize),
            page: String(page),
          }).toString()}`}
          isAdmin={role === "ADMIN"}
        />
      )}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
        <div>
          Page {page} of {totalPages} • {total} total
        </div>
        <div className="flex items-center gap-2">
          {/* Page numbers */}
          <div className="hidden md:flex items-center gap-1">
            {(() => {
              const links: (number | "…")[] = [];
              const add = (n: number | "…") => links.push(n);
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) add(i);
              } else {
                add(1);
                if (page > 3) add("…");
                const start = Math.max(2, page - 1);
                const end = Math.min(totalPages - 1, page + 1);
                for (let i = start; i <= end; i++) add(i);
                if (page < totalPages - 2) add("…");
                add(totalPages);
              }
              return links.map((n, idx) =>
                n === "…" ? (
                  <span key={`e${idx}`} className="px-2">
                    …
                  </span>
                ) : (
                  <a
                    key={n}
                    className={`rounded-full border border-slate-300 px-2.5 py-1.5 ${
                      n === page
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-50"
                    }`}
                    href={`/staff/charters?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(activeParam ? { active: activeParam } : {}),
                      sort,
                      order,
                      pageSize: String(pageSize),
                      page: String(n),
                    }).toString()}`}
                  >
                    {n}
                  </a>
                )
              );
            })()}
          </div>
          <a
            className={`rounded-full border border-slate-300 px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"
            }`}
            href={`/staff/charters?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(activeParam ? { active: activeParam } : {}),
              sort,
              order,
              pageSize: String(pageSize),
              page: String(Math.max(1, page - 1)),
            }).toString()}`}
          >
            Prev
          </a>
          <a
            className={`rounded-full border border-slate-300 px-3 py-1.5 ${
              page >= totalPages
                ? "pointer-events-none opacity-50"
                : "hover:bg-slate-50"
            }`}
            href={`/staff/charters?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(activeParam ? { active: activeParam } : {}),
              sort,
              order,
              pageSize: String(pageSize),
              page: String(Math.min(totalPages, page + 1)),
            }).toString()}`}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}
