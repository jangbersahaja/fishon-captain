"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export function RegistrationsFilter({
  q,
  status,
}: {
  q: string;
  status: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleChange() {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    const searchValue = form.q.value;
    const statusValue = form.status.value;
    if (searchValue) params.set("q", searchValue);
    if (statusValue) params.set("status", statusValue);
    router.replace(`/staff/registrations?${params.toString()}`);
  }

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 p-4 text-sm bg-white border rounded-xl border-slate-200"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Search</label>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, draft ID, or user ID"
          className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          onChange={handleChange}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Status</label>
        <select
          name="status"
          defaultValue={status}
          className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          onChange={handleChange}
        >
          <option value="">All</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="ABANDONED">ABANDONED</option>
          <option value="DELETED">DELETED</option>
        </select>
      </div>
      {/* No Apply button needed */}
    </form>
  );
}
