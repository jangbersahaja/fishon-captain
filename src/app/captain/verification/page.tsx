"use client";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  IdCard,
  Image as ImageIcon,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

type Uploaded = { key: string; url: string; name: string; updatedAt: string };
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
  const [idFront, setIdFront] = useState<Uploaded | null>(null);
  const [idBack, setIdBack] = useState<Uploaded | null>(null);
  const [captainLicense, setCaptainLicense] = useState<Uploaded | null>(null);
  const [boatReg, setBoatReg] = useState<Uploaded | null>(null);
  const [fishingLicense, setFishingLicense] = useState<Uploaded | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<Uploaded[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Helpers
  async function uploadFile(file: File, docType: DocType): Promise<Uploaded> {
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
    prev?: Uploaded | null,
    onSet?: (u: Uploaded | null) => void
  ) {
    setLoading((s) => ({ ...s, [field]: true }));
    setMessage(null);
    try {
      // Delete old first (best-effort)
      if (prev?.key) await deleteKey(prev.key);
      // Upload new
      const up = await uploadFile(nextFile, field as DocType);
      onSet?.(up);
      await saveField({ [field]: up });
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
      const uploads: Uploaded[] = [];
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
        Upload required identification and licenses to finish your registration.
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
          updated={!!idFront && !!idBack}
          startCollapsed
        >
          <FileInput
            label="Front side"
            required
            existing={idFront}
            onReplace={(f) => handleReplace("idFront", f, idFront, setIdFront)}
            loading={!!loading["idFront"]}
            accept="image/*"
            capture="environment"
            icon={<ImageIcon className="h-4 w-4" />}
          />
          <FileInput
            label="Back side"
            required
            existing={idBack}
            onReplace={(f) => handleReplace("idBack", f, idBack, setIdBack)}
            loading={!!loading["idBack"]}
            accept="image/*"
            capture="environment"
            icon={<ImageIcon className="h-4 w-4" />}
          />
        </Section>

        <Section
          title="Captain license"
          description="Upload an image or PDF."
          updated={!!captainLicense}
          startCollapsed
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
            loading={!!loading["captainLicense"]}
            accept="image/*,application/pdf"
            icon={<FileText className="h-4 w-4" />}
          />
        </Section>

        <Section
          title="Boat registration certificate"
          description="Upload an image or PDF."
          updated={!!boatReg}
          startCollapsed
        >
          <FileInput
            label="Boat registration"
            existing={boatReg}
            onReplace={(f) =>
              handleReplace("boatRegistration", f, boatReg, setBoatReg)
            }
            loading={!!loading["boatRegistration"]}
            accept="image/*,application/pdf"
            icon={<FileText className="h-4 w-4" />}
          />
        </Section>

        <Section
          title="Fishing license"
          description="Upload an image or PDF."
          updated={!!fishingLicense}
          startCollapsed
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
            loading={!!loading["fishingLicense"]}
            accept="image/*,application/pdf"
            icon={<FileText className="h-4 w-4" />}
          />
        </Section>

        <Section
          title="Additional documents"
          description="Upload any other relevant documents (images or PDFs)."
          updated={additionalDocs.length > 0}
          collapsible={false}
        >
          <MultiFileInput
            label="Additional documents"
            files={additionalDocs}
            onAdd={(files) => handleAdditionalAdd(files)}
            onRemove={(i) => handleAdditionalRemove(i)}
            loading={!!loading["additional"]}
            accept="image/*,application/pdf"
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  updated,
  startCollapsed,
  collapsible = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  updated?: boolean;
  startCollapsed?: boolean;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!!startCollapsed && !!updated);
  // Auto-collapse when updated becomes true
  useEffect(() => {
    if (updated && collapsible) setCollapsed(true);
  }, [updated, collapsible]);

  const isCollapsed = collapsible ? collapsed : false;

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Top bar: title + optional updated badge + optional toggle */}
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
        {updated ? (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            updated
          </span>
        ) : null}
      </div>
      {!isCollapsed && <div className="mt-4 grid gap-3">{children}</div>}
    </div>
  );
}

function FileInput({
  label,
  existing,
  onReplace,
  loading,
  accept,
  capture,
  required,
  icon,
}: {
  label: string;
  existing: Uploaded | null;
  onReplace: (file: File) => void;
  loading?: boolean;
  accept: string;
  capture?: "user" | "environment";
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
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
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Updated on{" "}
            {fmtDate(existing.updatedAt)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Not uploaded</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="file"
          accept={accept}
          capture={capture}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onReplace(f);
            // allow selecting same file again
            e.currentTarget.value = "";
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
          required={required && !existing}
        />
        {existing && (
          <span className="text-xs text-slate-500 truncate max-w-[50%]">
            {existing.name}
          </span>
        )}
        {icon}
      </div>
    </label>
  );
}

function MultiFileInput({
  label,
  files,
  onAdd,
  onRemove,
  loading,
  accept,
}: {
  label: string;
  files: Uploaded[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  loading?: boolean;
  accept: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-col gap-2">
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
          <ul className="text-xs grid gap-1">
            {files.map((f, i) => (
              <li
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-1.5 text-slate-600"
              >
                <span className="truncate flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{" "}
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
