"use client";
import { AlertCircle, CheckCircle2, IdCard } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// Feature module imports
import type {
  ConfirmState,
  DocType,
  MessageState,
  Statused,
  ValidationErrors,
} from "@features/captain-documents";
import {
  AdditionalDocumentsSection,
  BankingSection,
  ConfirmDialog,
  FileInput,
  GovernmentIdSection,
  MultiFileInput,
  ProfessionalLicensesSection,
  Section,
  SubmitRow,
  useDocumentUpload,
} from "@features/captain-documents";

export default function CaptainDocumentsPage() {
  // Banking information state
  const [bankName, setBankName] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [bankAccountHolder, setBankAccountHolder] = useState<string>("");
  const [bankSwiftCode, setBankSwiftCode] = useState<string>("");
  const [bankBranch, setBankBranch] = useState<string>("");
  const [bankStatement, setBankStatement] = useState<Statused | null>(null);

  // Validation errors for banking fields
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Banking section collapse state
  const [bankingCollapsed, setBankingCollapsed] = useState<boolean>(false);

  // Government ID section collapse state
  const [govIdCollapsed, setGovIdCollapsed] = useState<boolean>(false);

  // Per-field uploaded refs
  const [idFront, setIdFront] = useState<Statused | null>(null);
  const [idBack, setIdBack] = useState<Statused | null>(null);
  const [captainLicense, setCaptainLicense] = useState<Statused | null>(null);
  const [boatReg, setBoatReg] = useState<Statused | null>(null);
  const [fishingLicense, setFishingLicense] = useState<Statused | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<Statused[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<MessageState>(null);
  // Track unsent changes (uploads that have not been submitted yet)
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // Helper to open confirmation dialog - compatible with FileInput
  const openConfirm = useCallback(
    (message: string, onConfirm: () => void | Promise<void>) => {
      setConfirmState({ message, onConfirm });
    },
    []
  );

  // Document upload hooks - eliminates code duplication
  const idFrontUpload = useDocumentUpload({
    fieldName: "idFront",
    document: idFront,
    setDocument: setIdFront,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  const idBackUpload = useDocumentUpload({
    fieldName: "idBack",
    document: idBack,
    setDocument: setIdBack,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  const captainLicenseUpload = useDocumentUpload({
    fieldName: "captainLicense",
    document: captainLicense,
    setDocument: setCaptainLicense,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  const boatRegUpload = useDocumentUpload({
    fieldName: "boatRegistration",
    document: boatReg,
    setDocument: setBoatReg,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  const fishingLicenseUpload = useDocumentUpload({
    fieldName: "fishingLicense",
    document: fishingLicense,
    setDocument: setFishingLicense,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  const bankStatementUpload = useDocumentUpload({
    fieldName: "bankStatement",
    document: bankStatement,
    setDocument: setBankStatement,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  });

  // Calculate completion progress
  const completionProgress = useMemo(() => {
    const sections = [
      {
        name: "Banking",
        complete: !!(bankName && bankAccountNumber && bankAccountHolder),
      },
      { name: "Government ID", complete: !!(idFront && idBack) },
      { name: "Captain License", complete: !!captainLicense },
      { name: "Boat Registration", complete: !!boatReg },
      { name: "Fishing License", complete: !!fishingLicense },
    ];

    const completed = sections.filter((s) => s.complete).length;
    const total = sections.length;
    const percentage = Math.round((completed / total) * 100);

    return {
      completed,
      total,
      percentage,
      sections,
    };
  }, [
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    idFront,
    idBack,
    captainLicense,
    boatReg,
    fishingLicense,
  ]);

  // Hydrate from server so we reflect current statuses and validity
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/captain/documents", { method: "GET" });
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
          bankName?: string;
          bankAccountNumber?: string;
          bankAccountHolder?: string;
          bankSwiftCode?: string;
          bankBranch?: string;
          bankStatement?: Statused | null;
        } | null;
        const row = json?.verification as RowShape;
        if (!row) return;
        setIdFront(row.idFront ?? null);
        setIdBack(row.idBack ?? null);
        setCaptainLicense(row.captainLicense ?? null);
        setBoatReg(row.boatRegistration ?? null);
        setFishingLicense(row.fishingLicense ?? null);
        setAdditionalDocs(Array.isArray(row.additional) ? row.additional : []);
        setBankName(row.bankName ?? "");
        setBankAccountNumber(row.bankAccountNumber ?? "");
        setBankAccountHolder(row.bankAccountHolder ?? "");
        setBankSwiftCode(row.bankSwiftCode ?? "");
        setBankBranch(row.bankBranch ?? "");
        setBankStatement(row.bankStatement ?? null);

        // Auto-collapse banking section if data already exists
        if (row.bankName && row.bankAccountNumber && row.bankAccountHolder) {
          setBankingCollapsed(true);
        }

        // Auto-collapse Government ID section if validated
        if (
          row.idFront?.status === "validated" &&
          row.idBack?.status === "validated"
        ) {
          setGovIdCollapsed(true);
        }
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
    await fetch("/api/captain/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return (
    <div className="px-6 py-8 pb-20 mx-auto max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <IdCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Verification Center
            </h1>
            <p className="text-sm text-slate-600">
              Complete your profile to start listing charters
            </p>
          </div>
        </div>

        {/* Important Notice Banner */}
        {(() => {
          const hasBanking = !!(
            bankName &&
            bankAccountNumber &&
            bankAccountHolder
          );
          const hasGovId = !!(idFront && idBack);
          const requiredComplete = hasBanking && hasGovId;

          return requiredComplete ? (
            <div className="p-4 border-l-4 rounded-lg bg-emerald-50 border-emerald-400">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-900">
                    Ready to List Your Charter
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Great! You&apos;ve completed the required documents (
                    <strong>Banking</strong> and <strong>Government ID</strong>
                    ). You can now list your charters. Consider adding
                    professional licenses to build more trust with anglers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-l-4 rounded-lg bg-amber-50 border-amber-400">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">
                    Required to List Your Charter
                  </h3>
                  <p className="mt-1 text-sm text-amber-800">
                    You must complete <strong>Banking Information</strong> and{" "}
                    <strong>Government ID</strong> before you can list any
                    charters. Other documents help build trust with anglers and
                    are strongly recommended.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Completion Progress Indicator */}
      <div className="p-6 mb-8 bg-white border shadow-sm rounded-xl border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Verification Progress
            </h3>
            <p className="text-sm text-slate-600">
              {completionProgress.completed} of {completionProgress.total}{" "}
              sections completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">
              {completionProgress.percentage}%
            </div>
            <p className="text-xs text-slate-500">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-4 mb-4 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              completionProgress.percentage === 100
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : completionProgress.percentage >= 40
                  ? "bg-gradient-to-r from-blue-500 to-blue-600"
                  : "bg-gradient-to-r from-amber-500 to-amber-600"
            }`}
            style={{ width: `${completionProgress.percentage}%` }}
          />
        </div>

        {/* Section Details Grid */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {completionProgress.sections.map((section) => {
            const isRequired =
              section.name === "Banking" || section.name === "Government ID";
            return (
              <div
                key={section.name}
                className={`flex flex-col gap-1 p-2 rounded-lg ${
                  section.complete
                    ? "bg-emerald-50 border border-emerald-200"
                    : isRequired
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {section.complete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 rounded-full border-slate-300" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      section.complete
                        ? "text-emerald-700"
                        : isRequired
                          ? "text-amber-700"
                          : "text-slate-600"
                    }`}
                  >
                    {section.name}
                  </span>
                </div>
                {isRequired && !section.complete && (
                  <span className="text-[10px] font-semibold text-amber-600 uppercase">
                    Required
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center mb-4 gap-2 rounded-xl border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Banking Information Section */}
      <BankingSection
        bankName={bankName}
        setBankName={setBankName}
        bankAccountNumber={bankAccountNumber}
        setBankAccountNumber={setBankAccountNumber}
        bankAccountHolder={bankAccountHolder}
        setBankAccountHolder={setBankAccountHolder}
        bankSwiftCode={bankSwiftCode}
        setBankSwiftCode={setBankSwiftCode}
        bankBranch={bankBranch}
        setBankBranch={setBankBranch}
        bankStatement={bankStatement}
        collapsed={bankingCollapsed}
        setCollapsed={setBankingCollapsed}
        validationErrors={validationErrors}
        setValidationErrors={setValidationErrors}
        dirty={dirty}
        setDirty={setDirty}
        loading={loading}
        setLoading={setLoading}
        setMessage={setMessage}
        bankStatementUpload={bankStatementUpload}
        openConfirm={openConfirm}
        FileInput={FileInput}
      />

      {/* Government ID Section */}
      <GovernmentIdSection
        idFront={idFront}
        setIdFront={setIdFront}
        idBack={idBack}
        setIdBack={setIdBack}
        collapsed={govIdCollapsed}
        setCollapsed={setGovIdCollapsed}
        dirty={dirty}
        setDirty={setDirty}
        loading={loading}
        setMessage={setMessage}
        idFrontUpload={idFrontUpload}
        idBackUpload={idBackUpload}
        openConfirm={openConfirm}
        FileInput={FileInput}
      />

      {/* Professional Licenses Section */}
      <ProfessionalLicensesSection
        captainLicense={captainLicense}
        setCaptainLicense={setCaptainLicense}
        boatReg={boatReg}
        setBoatReg={setBoatReg}
        fishingLicense={fishingLicense}
        setFishingLicense={setFishingLicense}
        dirty={dirty}
        setDirty={setDirty}
        loading={loading}
        setMessage={setMessage}
        captainLicenseUpload={captainLicenseUpload}
        boatRegUpload={boatRegUpload}
        fishingLicenseUpload={fishingLicenseUpload}
        openConfirm={openConfirm}
        Section={Section}
        FileInput={FileInput}
        SubmitRow={SubmitRow}
      />

      {/* Additional Documents */}
      <AdditionalDocumentsSection
        additionalDocs={additionalDocs}
        setAdditionalDocs={setAdditionalDocs}
        loading={loading}
        setLoading={setLoading}
        setMessage={setMessage}
        uploadFile={uploadFile}
        saveField={saveField}
        deleteKey={deleteKey}
        openConfirm={openConfirm}
        Section={Section}
        MultiFileInput={MultiFileInput}
      />

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
