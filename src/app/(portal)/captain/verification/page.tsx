"use client";
import { zIndexClasses } from "@/config/zIndex";
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  File as FileGeneric,
  FileSpreadsheet,
  FileText,
  IdCard,
  Info,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Uploaded = { key: string; url: string; name: string; updatedAt: string };
type Statused = Uploaded & {
  status?: "processing" | "validated";
  validForPeriod?: { from?: string; to?: string };
};
type DocType =
  | "idFront"
  | "idBack"
  | "captainLicense"
  | "boatRegistration"
  | "fishingLicense"
  | "additional";

function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso ?? "";
  }
}

export default function VerificationPage() {
  // Per-field uploaded refs
  const [idFront, setIdFront] = useState<Statused | null>(null);
  const [idBack, setIdBack] = useState<Statused | null>(null);
  const [captainLicense, setCaptainLicense] = useState<Statused | null>(null);
  const [boatReg, setBoatReg] = useState<Statused | null>(null);
  const [fishingLicense, setFishingLicense] = useState<Statused | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<Statused[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // Track unsent changes (uploads that have not been submitted yet)
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => Promise<void> | void;
    busy?: boolean;
  } | null>(null);

  function openConfirm(message: string, onConfirm: () => Promise<void> | void) {
    setConfirmState({ message, onConfirm });
  }

  // Hydrate from server so we reflect current statuses and validity
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/captain/verification", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        type RowShape = {
          idFront?: Statused | null;
          idBack?: Statused | null;
          captainLicense?: Statused | null;
          boatRegistration?: Statused | null;
          fishingLicense?: Statused | null;
          additional?: Statused[];
        } | null;
        const row = json?.verification as RowShape;
        if (!row) return;
        setIdFront(row.idFront ?? null);
        setIdBack(row.idBack ?? null);
        setCaptainLicense(row.captainLicense ?? null);
        setBoatReg(row.boatRegistration ?? null);
        setFishingLicense(row.fishingLicense ?? null);
        setAdditionalDocs(Array.isArray(row.additional) ? row.additional : []);
      } catch {
        // ignore errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helpers
  async function uploadFile(file: File, docType: DocType): Promise<Statused> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("docType", docType);
    const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload_failed");
    const j = (await res.json()) as { key: string; url: string };
    return {
      key: j.key,
      url: j.url,
      name: file.name,
      updatedAt: new Date().toISOString(),
    };
  }

  async function deleteKey(key?: string) {
    if (!key) return;
    try {
      await fetch("/api/blob/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
    } catch {
      // non-blocking
    }
  }

  async function saveField(payload: Record<string, unknown>) {
    await fetch("/api/captain/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  async function handleReplace(
    field: string,
    nextFile: File,
    prev?: Statused | null,
    onSet?: (u: Statused | null) => void
  ) {
    if (prev?.status === "validated") {
      setMessage({
        type: "error",
        text: "This document is already validated and cannot be changed.",
      });
      return;
    }
    setLoading((s) => ({ ...s, [field]: true }));
    setMessage(null);
    try {
      // Delete old first (best-effort)
      if (prev?.key) await deleteKey(prev.key);
      // Upload new
      const up = await uploadFile(nextFile, field as DocType);
      onSet?.(up);
      await saveField({ [field]: up });
      setDirty((d) => ({ ...d, [field]: true }));
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setLoading((s) => ({ ...s, [field]: false }));
    }
  }

  async function handleAdditionalAdd(files: File[]) {
    if (!files.length) return;
    setLoading((s) => ({ ...s, additional: true }));
    setMessage(null);
    try {
      const uploads: Statused[] = [];
      for (const f of files) {
        const up = await uploadFile(f, "additional");
        uploads.push(up);
        await saveField({ additionalAdd: up });
      }
      setAdditionalDocs((arr) => [...arr, ...uploads]);
    } catch {
      setMessage({ type: "error", text: "Some files failed to upload." });
    } finally {
      setLoading((s) => ({ ...s, additional: false }));
    }
  }

  async function handleAdditionalRemove(i: number) {
    const item = additionalDocs[i];
    if (!item) return;
    if (item.status === "validated") {
      setMessage({
        type: "error",
        text: "Validated document cannot be removed.",
      });
      return;
    }
    setLoading((s) => ({ ...s, additional: true }));
    try {
      await deleteKey(item.key);
      setAdditionalDocs((arr) => arr.filter((_, idx) => idx !== i));
      await saveField({ additionalRemove: item.key });
    } finally {
      setLoading((s) => ({ ...s, additional: false }));
    }
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-slate-700" />
        <h1 className="text-xl font-semibold text-slate-900">ID & Documents</h1>
      </div>
      <p className="text-sm text-slate-600">
        Upload your government ID (front and back) to proceed. Other documents
        are optional but can help speed up approval.
      </p>

      {/* Guidance banner: prompt for both ID sides until uploaded */}
      {(!idFront || !idBack) && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Government ID required</p>
            <p className="text-blue-800/80">
              Please upload clear photos of the front and back of your ID to
              proceed with verification.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <Section
          title="Government ID (required)"
          description="Clear photo of the front and back of your ID."
          processing={
            idFront?.status === "processing" || idBack?.status === "processing"
          }
          validated={
            !!idFront?.status &&
            !!idBack?.status &&
            idFront?.status === "validated" &&
            idBack?.status === "validated"
          }
        >
          <FileInput
            label="Front side"
            required
            existing={idFront}
            onReplace={(f) => handleReplace("idFront", f, idFront, setIdFront)}
            onRemove={async () => {
              if (!idFront || idFront.status === "validated") return;
              setLoading((s) => ({ ...s, idFront: true }));
              await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remove: "idFront" }),
              });
              setIdFront(null);
              setLoading((s) => ({ ...s, idFront: false }));
              setDirty((d) => ({ ...d, idFront: false }));
            }}
            openConfirm={openConfirm}
            loading={!!loading["idFront"]}
            accept="image/*"
          />
          <FileInput
            label="Back side"
            required
            existing={idBack}
            onReplace={(f) => handleReplace("idBack", f, idBack, setIdBack)}
            onRemove={async () => {
              if (!idBack || idBack.status === "validated") return;
              setLoading((s) => ({ ...s, idBack: true }));
              await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remove: "idBack" }),
              });
              setIdBack(null);
              setLoading((s) => ({ ...s, idBack: false }));
              setDirty((d) => ({ ...d, idBack: false }));
            }}
            openConfirm={openConfirm}
            loading={!!loading["idBack"]}
            accept="image/*"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={async () => {
                setMessage(null);
                if (!idFront || !idBack) {
                  setMessage({
                    type: "error",
                    text: "Upload both front and back before submitting.",
                  });
                  return;
                }
                const res = await fetch("/api/captain/verification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ submitGovtId: true }),
                });
                if (res.ok) {
                  setIdFront((v) => (v ? { ...v, status: "processing" } : v));
                  setIdBack((v) => (v ? { ...v, status: "processing" } : v));
                  setDirty((d) => ({ ...d, idFront: false, idBack: false }));
                  setMessage({ type: "success", text: "Submitted." });
                } else {
                  const err = await res.json().catch(() => ({}));
                  setMessage({
                    type: "error",
                    text: err?.error || "Submit failed",
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              disabled={
                !idFront ||
                !idBack ||
                idFront.status === "processing" ||
                idBack.status === "processing" ||
                (idFront.status === "validated" &&
                  idBack.status === "validated") ||
                (!dirty.idFront && !dirty.idBack)
              }
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </Section>

        <Section
          title="Captain license"
          description="Upload an image or document (PDF, DOCX, etc.). Optional, but recommended."
          processing={captainLicense?.status === "processing"}
          validated={captainLicense?.status === "validated"}
        >
          <FileInput
            label="Captain license"
            existing={captainLicense}
            onReplace={(f) =>
              handleReplace(
                "captainLicense",
                f,
                captainLicense,
                setCaptainLicense
              )
            }
            onRemove={async () => {
              if (!captainLicense || captainLicense.status === "validated")
                return;
              setLoading((s) => ({ ...s, captainLicense: true }));
              await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remove: "captainLicense" }),
              });
              setCaptainLicense(null);
              setLoading((s) => ({ ...s, captainLicense: false }));
              setDirty((d) => ({ ...d, captainLicense: false }));
            }}
            openConfirm={openConfirm}
            loading={!!loading["captainLicense"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !captainLicense ||
              captainLicense.status === "processing" ||
              captainLicense.status === "validated" ||
              !dirty.captainLicense
            }
            onSubmit={async () => {
              const res = await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submit: "captainLicense" }),
              });
              if (res.ok) {
                setCaptainLicense((v) =>
                  v ? { ...v, status: "processing" } : v
                );
                setDirty((d) => ({ ...d, captainLicense: false }));
                setMessage({ type: "success", text: "Submitted." });
              } else {
                const err = await res.json().catch(() => ({}));
                setMessage({
                  type: "error",
                  text: err?.error || "Submit failed",
                });
              }
            }}
          />
        </Section>

        <Section
          title="Boat registration certificate"
          description="Upload any supporting document (PDF, image, DOCX, ZIP). Optional."
          processing={boatReg?.status === "processing"}
          validated={boatReg?.status === "validated"}
        >
          <FileInput
            label="Boat registration"
            existing={boatReg}
            onReplace={(f) =>
              handleReplace("boatRegistration", f, boatReg, setBoatReg)
            }
            onRemove={async () => {
              if (!boatReg || boatReg.status === "validated") return;
              setLoading((s) => ({ ...s, boatRegistration: true }));
              await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remove: "boatRegistration" }),
              });
              setBoatReg(null);
              setLoading((s) => ({ ...s, boatRegistration: false }));
              setDirty((d) => ({ ...d, boatRegistration: false }));
            }}
            openConfirm={openConfirm}
            loading={!!loading["boatRegistration"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !boatReg ||
              boatReg.status === "processing" ||
              boatReg.status === "validated" ||
              !dirty.boatRegistration
            }
            onSubmit={async () => {
              const res = await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submit: "boatRegistration" }),
              });
              if (res.ok) {
                setBoatReg((v) => (v ? { ...v, status: "processing" } : v));
                setDirty((d) => ({ ...d, boatRegistration: false }));
                setMessage({ type: "success", text: "Submitted." });
              } else {
                const err = await res.json().catch(() => ({}));
                setMessage({
                  type: "error",
                  text: err?.error || "Submit failed",
                });
              }
            }}
          />
        </Section>

        <Section
          title="Fishing license"
          description="Upload image or document. Optional."
          processing={fishingLicense?.status === "processing"}
          validated={fishingLicense?.status === "validated"}
        >
          <FileInput
            label="Fishing license"
            existing={fishingLicense}
            onReplace={(f) =>
              handleReplace(
                "fishingLicense",
                f,
                fishingLicense,
                setFishingLicense
              )
            }
            onRemove={async () => {
              if (!fishingLicense || fishingLicense.status === "validated")
                return;
              setLoading((s) => ({ ...s, fishingLicense: true }));
              await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remove: "fishingLicense" }),
              });
              setFishingLicense(null);
              setLoading((s) => ({ ...s, fishingLicense: false }));
              setDirty((d) => ({ ...d, fishingLicense: false }));
            }}
            openConfirm={openConfirm}
            loading={!!loading["fishingLicense"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !fishingLicense ||
              fishingLicense.status === "processing" ||
              fishingLicense.status === "validated" ||
              !dirty.fishingLicense
            }
            onSubmit={async () => {
              const res = await fetch("/api/captain/verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submit: "fishingLicense" }),
              });
              if (res.ok) {
                setFishingLicense((v) =>
                  v ? { ...v, status: "processing" } : v
                );
                setDirty((d) => ({ ...d, fishingLicense: false }));
                setMessage({ type: "success", text: "Submitted." });
              } else {
                const err = await res.json().catch(() => ({}));
                setMessage({
                  type: "error",
                  text: err?.error || "Submit failed",
                });
              }
            }}
          />
        </Section>

        <Section
          title="Additional documents"
          description="Upload any other supporting files (images, PDFs, docs, spreadsheets, zips). These are for your records and may not require verification."
          collapsible={false}
        >
          <MultiFileInput
            label="Additional documents"
            files={additionalDocs}
            onAdd={(files) => handleAdditionalAdd(files)}
            onRemove={(i) => handleAdditionalRemove(i)}
            onRename={(key, name) =>
              setAdditionalDocs((arr) =>
                arr.map((it) => (it.key === key ? { ...it, name } : it))
              )
            }
            loading={!!loading["additional"]}
            accept="*/*"
            openConfirm={openConfirm}
          />
          {/* Additional documents are saved instantly; no verification step. */}
        </Section>
      </div>
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onCancel={() => setConfirmState(null)}
          onConfirm={async () => {
            setConfirmState((s) => (s ? { ...s, busy: true } : s));
            try {
              await confirmState.onConfirm();
            } finally {
              setConfirmState(null);
            }
          }}
          busy={!!confirmState.busy}
        />
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
  processing,
  validated,
  collapsible = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  processing?: boolean;
  validated?: boolean;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Collapse only after submission (processing) or validated state reached
  useEffect(() => {
    if ((processing || validated) && collapsible) setCollapsed(true);
  }, [processing, validated, collapsible]);

  const isCollapsed = collapsible ? collapsed : false;

  // (Animation logic removed; simple show/hide behavior retained)

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {collapsible ? (
          <button
            type="button"
            className="text-left"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!isCollapsed}
          >
            <h2 className="font-medium text-slate-800">{title}</h2>
            {!isCollapsed && description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </button>
        ) : (
          <div>
            <h2 className="font-medium text-slate-800">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
        )}
        {validated ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> validated
          </span>
        ) : processing ? (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            processing
          </span>
        ) : null}
      </div>
      <div
        className={`mt-4 grid gap-3 transition-opacity duration-200 ${
          isCollapsed ? "opacity-0 hidden" : "opacity-100"
        }`}
        aria-hidden={isCollapsed}
      >
        {children}
      </div>
    </div>
  );
}

function FileInput({
  label,
  existing,
  onReplace,
  onRemove,
  openConfirm,
  loading,
  accept,
  capture,
  required,
  variant,
}: {
  label: string;
  existing: Statused | null;
  onReplace: (file: File) => void;
  onRemove?: () => void;
  openConfirm?: (message: string, run: () => void | Promise<void>) => void;
  loading?: boolean;
  accept: string;
  capture?: "user" | "environment";
  required?: boolean;
  variant?: "govId";
}) {
  const inputId = useMemo(
    () => `${label}-file-input`.replace(/\s+/g, "-"),
    [label]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onReplace(f);
      e.currentTarget.value = ""; // allow re-select same file
    },
    [onReplace]
  );

  return (
    <div className="block">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">
          {label}
          {required ? " *" : ""}
        </span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        ) : existing ? (
          existing.status === "validated" ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validated
              {existing.validForPeriod?.to ? (
                <span className="ml-1 text-emerald-800/80">
                  · Valid until: {fmtDate(existing.validForPeriod.to)}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              Updated on {fmtDate(existing.updatedAt)}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-500">Not uploaded</span>
        )}
      </div>
      <div className="mt-2">
        <input
          id={inputId}
          type="file"
          accept={accept}
          capture={variant === "govId" ? capture || "environment" : capture}
          onChange={handleSelect}
          className="hidden"
          required={required && !existing}
          disabled={existing?.status === "validated"}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={existing?.status === "validated"}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {existing ? "Replace File" : "Upload File"}
          </button>
          {existing && existing.status !== "validated" && onRemove && (
            <button
              type="button"
              onClick={() =>
                openConfirm
                  ? openConfirm(`Remove ${label}? This cannot be undone.`, () =>
                      onRemove()
                    )
                  : onRemove()
              }
              className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
        {existing && (
          <div className="mt-3 flex items-center gap-2 max-w-sm">
            <PreviewOrIcon file={existing} />
            <span className="text-xs text-slate-600 truncate">
              {existing.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiFileInput({
  label,
  files,
  onAdd,
  onRemove,
  onRename,
  loading,
  accept,
  openConfirm,
}: {
  label: string;
  files: Statused[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onRename: (key: string, name: string) => void;
  loading?: boolean;
  accept: string;
  openConfirm?: (message: string, run: () => void | Promise<void>) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-col gap-3">
        <input
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) onAdd(list);
            e.currentTarget.value = "";
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
        />
        {files.length > 0 && (
          <ul className="text-xs grid gap-2">
            {files.map((f, i) => (
              <li
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PreviewOrIcon file={f} />
                  <input
                    type="text"
                    defaultValue={f.name}
                    placeholder="Document name"
                    className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onBlur={async (e) => {
                      const name = e.currentTarget.value.trim();
                      if (!name || name === f.name) return;
                      // update parent state optimistically
                      onRename(f.key, name);
                      await fetch("/api/captain/verification", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          additionalUpdateName: { key: f.key, name },
                        }),
                      });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openConfirm
                      ? openConfirm("Remove this document?", () => onRemove(i))
                      : onRemove(i)
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Simple confirmation dialog component
function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
  busy,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClasses.backdrop} flex items-center justify-center p-4`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-sm font-medium text-slate-800">Confirm removal</h3>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitRow({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="flex justify-end mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

// no SubmitAdditional, additional docs save instantly

// -------------------------------------------------
// Preview components for thumbnails & file type icons
// -------------------------------------------------

function isImageFile(name?: string, url?: string) {
  const src = (name || "") + (url || "");
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp)$/i.test(src);
}

function fileExt(name?: string) {
  if (!name) return "";
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

function FileTypeIcon({ ext }: { ext: string }) {
  if (["zip", "gz", "tar", "rar", "7z"].includes(ext))
    return <FileArchive className="h-5 w-5 text-slate-500" />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (ext === "pdf") return <FileText className="h-5 w-5 text-rose-600" />;
  if (["doc", "docx", "rtf"].includes(ext))
    return <FileText className="h-5 w-5 text-blue-600" />;
  return <FileGeneric className="h-5 w-5 text-slate-500" />;
}

function PreviewOrIcon({ file }: { file: Statused }) {
  const e = fileExt(file.name);
  if (isImageFile(file.name, file.url)) {
    return (
      <div className="relative h-10 w-10 overflow-hidden rounded-md border border-slate-300 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  return <FileTypeIcon ext={e} />;
}
