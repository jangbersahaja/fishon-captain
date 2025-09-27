"use client";
import React, { useCallback, useEffect, useState } from "react";

interface DraftDevPanelProps {
  draftId: string | null;
  lastSavedAt: string | null;
}

/**
 * DraftDevPanel (DEV ONLY)
 * Displays the raw charter draft row (JSON) from the server so we can verify PATCH persistence.
 * Renders only when NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1".
 */
export const DraftDevPanel: React.FC<DraftDevPanelProps> = ({
  draftId,
  lastSavedAt,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchDraft = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/charter-drafts/${draftId}`);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
      } else {
        const json = await res.json();
        setRaw(json.draft || json);
        setFetchedAt(new Date().toISOString());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  // Initial + refresh when lastSavedAt changes
  useEffect(() => {
    if (!draftId) return;
    fetchDraft();
  }, [draftId, lastSavedAt, fetchDraft]);

  if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG !== "1") return null;
  if (!draftId)
    return (
      <div className="mt-10 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[11px] text-amber-700">
        No serverDraftId yet – draft not created.
      </div>
    );
  return (
    <div className="mt-10 space-y-2 rounded-xl border border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600">
        <span>Draft ID: {draftId}</span>
        <span>
          Last Saved:{" "}
          {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : "—"}
        </span>
        <span>
          Fetched: {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : "—"}
        </span>
        <button
          type="button"
          onClick={fetchDraft}
          className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white hover:bg-slate-700"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (raw == null) return;
            try {
              navigator.clipboard.writeText(
                JSON.stringify(raw as Record<string, unknown>, null, 2)
              );
            } catch {
              /* ignore */
            }
          }}
          className="rounded border border-slate-400 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
        >
          Copy JSON
        </button>
        {error && <span className="text-red-600">Error: {error}</span>}
      </div>
      <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-3 text-[10px] leading-snug text-emerald-200">
        {raw ? JSON.stringify(raw, null, 2) : "(no data)"}
      </pre>
    </div>
  );
};
