"use client";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveDraftButton({ draftId }: { draftId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/charter-drafts/${draftId}`, { method: "DELETE" });
    } catch {
      // ignore
    } finally {
      setBusy(false);
      router.refresh();
    }
  };
  return (
    <button
      type="button"
      onClick={remove}
      className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white p-2 text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
      aria-label="Remove draft"
      title="Remove draft"
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
