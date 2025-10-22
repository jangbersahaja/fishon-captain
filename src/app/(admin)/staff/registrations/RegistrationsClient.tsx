"use client";
import Link from "next/link";

import { AdminBypassLink } from "@/components/admin";
import { DestructiveActions } from "./_components/DestructiveActions";
import { CollapsibleDraftCard } from "./CollapsibleDraftCard";
import { RegistrationsFilter } from "./RegistrationsFilter";
import { useDummyDraftsFilter } from "./useDummyDraftsFilter";
// Admin actions
async function markAbandoned(draftId: string) {
  await fetch(`/api/charter-drafts/${draftId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataPartial: { status: "ABANDONED" },
      clientVersion: 0,
    }), // clientVersion is required, but 0 will force server to check
  });
  window.location.reload();
}

async function softDelete(draftId: string) {
  await fetch(`/api/charter-drafts/${draftId}`, {
    method: "DELETE",
  });
  window.location.reload();
}

export type Draft = {
  id: string;
  userId: string;
  charterId?: string | null;
  status: string;
  lastTouchedAt: string;
  createdAt: string;
  currentStep?: number;
  user?: {
    name?: string | null;
    email?: string | null;
    displayName?: string | null;
    verification?: { status?: string };
  } | null;
};
type Charter = { id: string; name?: string };
type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  displayName?: string | null;
  verification?: { status?: string };
};
export type RegistrationsClientProps = {
  drafts: Draft[];
  userMap: Map<string, User>;
  charterMap: Map<string, Charter>;
  noteCountMap: Map<string, number>;
  role: string;
  q: string;
  status: string;
  page: number;
  totalPages: number;
};

export function RegistrationsClient({
  drafts,
  userMap,
  charterMap,
  noteCountMap,
  role,
  q,
  status,
  page,
  totalPages,
}: RegistrationsClientProps) {
  // Local timeAgo implementation
  function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  // Local buildQuery implementation
  function buildQuery(patch: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (patch.page && patch.page !== 1) sp.set("page", String(patch.page));
    return `?${sp.toString()}`;
  }
  const filteredDrafts = useDummyDraftsFilter(drafts);
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Registrations</h1>
        <div className="text-sm text-slate-500">
          Monitor in-progress captain & charter registrations
        </div>
      </div>
      <RegistrationsFilter q={q} status={status} />
      <div className="bg-white border rounded-xl border-slate-200">
        {filteredDrafts.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No drafts found.</div>
        ) : (
          filteredDrafts.map((d) => {
            const user = userMap.get(d.userId);
            const charter = d.charterId ? charterMap.get(d.charterId) : null;
            const noteCount = noteCountMap.get(d.id) || 0;
            const statusBadge = (
              <span
                className={
                  d.status === "SUBMITTED"
                    ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                    : d.status === "ABANDONED"
                    ? "inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    : d.status === "DELETED"
                    ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                    : "inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                }
              >
                {d.status}
              </span>
            );
            return (
              <CollapsibleDraftCard
                key={d.id}
                user={user ? { ...user, name: user.name ?? undefined } : user}
                charter={charter}
                statusBadge={statusBadge}
                lastTouchedAt={timeAgo(d.lastTouchedAt)}
                email={user?.email || "—"}
              >
                {/* Expanded content */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {noteCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {noteCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {d.id}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-slate-500">
                      Verification: {user?.verification?.status || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mb-3">
                  {/* Step indicator */}
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Step:</span>{" "}
                    {d.status === "SUBMITTED"
                      ? "5 / 5"
                      : `${(d.currentStep ?? 0) + 1} / 5`}
                  </div>
                  <div className="text-xs text-right text-slate-500">
                    <span>Created at</span>
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/staff/registrations/${d.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span className="hidden text-xs font-medium sm:inline">
                        View
                      </span>
                    </Link>
                    {user?.email && (
                      <a
                        href={`mailto:${
                          user.email
                        }?subject=${encodeURIComponent(
                          "Continue your Fishon charter registration"
                        )}&body=${encodeURIComponent(
                          "Hi there, we noticed you haven't completed your charter registration. You can resume here: https://www.fishon.my/captain/form"
                        )}`}
                        className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="hidden text-xs font-medium sm:inline">
                          Email
                        </span>
                      </a>
                    )}
                    {/* Open Draft (impersonate) button */}
                    <AdminBypassLink
                      href={`/captain/form?adminUserId=${d.userId}`}
                      confirmTitle="Admin Impersonation - Open Draft Form"
                      confirmDescription={`You are about to open the registration form as:\n\nUser: ${
                        user?.name || "Unknown"
                      }\nEmail: ${user?.email || "No email"}\nDraft ID: ${
                        d.id
                      }\n\nThis will allow you to view and edit their draft. Please enter your admin password to confirm.`}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                    >
                      🛡️ Open Form
                    </AdminBypassLink>
                  </div>
                  {/* Destructive actions (abandon/delete) */}
                  <DestructiveActions
                    draftId={d.id}
                    status={d.status}
                    userName={user?.name}
                    userEmail={user?.email}
                    markAbandoned={markAbandoned}
                    softDelete={softDelete}
                  />
                </div>
              </CollapsibleDraftCard>
            );
          })
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildQuery({ page: p })}
              className={
                p === page
                  ? "rounded-md bg-slate-800 px-3 py-1.5 text-white text-xs font-medium"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
