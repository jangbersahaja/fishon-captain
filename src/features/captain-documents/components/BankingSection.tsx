/**
 * Banking Information Section Component
 * Handles bank account details collection with encryption and validation
 */

import {
  MALAYSIAN_BANKS,
  validateAccountHolderName,
  validateBankAccountNumber,
  validateBankName,
  validateSwiftCode,
} from "@/lib/banking-validation";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
} from "lucide-react";
import { saveBankingInfo } from "../server/documents-api";
import type { Statused, ValidationErrors } from "../types";

interface BankingSectionProps {
  // State
  bankName: string;
  setBankName: (value: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (value: string) => void;
  bankAccountHolder: string;
  setBankAccountHolder: (value: string) => void;
  bankSwiftCode: string;
  setBankSwiftCode: (value: string) => void;
  bankBranch: string;
  setBankBranch: (value: string) => void;
  bankStatement: Statused | null;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  // Helpers
  validationErrors: ValidationErrors;
  setValidationErrors: (value: ValidationErrors) => void;
  dirty: Record<string, boolean>;
  setDirty: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  loading: Record<string, boolean>;
  setLoading: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  setMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
  // Upload hook methods
  bankStatementUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  openConfirm: (message: string, onConfirm: () => void | Promise<void>) => void;
  // Child component
  FileInput: React.ComponentType<{
    label: string;
    existing: Statused | null;
    onReplace: (file: File) => void;
    onRemove?: () => void;
    openConfirm?: (message: string, run: () => void | Promise<void>) => void;
    loading?: boolean;
    accept: string;
  }>;
}

export function BankingSection({
  bankName,
  setBankName,
  bankAccountNumber,
  setBankAccountNumber,
  bankAccountHolder,
  setBankAccountHolder,
  bankSwiftCode,
  setBankSwiftCode,
  bankBranch,
  setBankBranch,
  bankStatement,
  collapsed,
  setCollapsed,
  validationErrors,
  setValidationErrors,
  dirty,
  setDirty,
  loading,
  setLoading,
  setMessage,
  bankStatementUpload,
  openConfirm,
  FileInput,
}: BankingSectionProps) {
  const handleSave = async () => {
    // Clear previous errors
    setValidationErrors({});
    setMessage(null);

    // Validate fields client-side
    const errors: Record<string, string> = {};

    const bankNameValidation = validateBankName(bankName);
    if (!bankNameValidation.valid && bankNameValidation.error) {
      errors.bankName = bankNameValidation.error;
    }

    const accountNumberValidation = validateBankAccountNumber(
      bankAccountNumber,
      bankName
    );
    if (!accountNumberValidation.valid && accountNumberValidation.error) {
      errors.bankAccountNumber = accountNumberValidation.error;
    }

    const accountHolderValidation =
      validateAccountHolderName(bankAccountHolder);
    if (!accountHolderValidation.valid && accountHolderValidation.error) {
      errors.bankAccountHolder = accountHolderValidation.error;
    }

    if (bankSwiftCode) {
      const swiftValidation = validateSwiftCode(bankSwiftCode);
      if (!swiftValidation.valid && swiftValidation.error) {
        errors.bankSwiftCode = swiftValidation.error;
      }
    }

    // If there are validation errors, display them and don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setMessage({
        type: "error",
        text: "Please fix the validation errors before saving.",
      });
      return;
    }

    setLoading((s) => ({ ...s, banking: true }));
    try {
      await saveBankingInfo({
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        bankSwiftCode,
        bankBranch,
      });

      setMessage({
        type: "success",
        text: "Banking information saved securely.",
      });
      setDirty((d) => ({ ...d, banking: false }));
      // Auto-collapse after successful save
      setCollapsed(true);
    } catch (error) {
      const apiError = error as { response?: { details?: ValidationErrors } };
      if (apiError.response?.details) {
        setValidationErrors(apiError.response.details);
        setMessage({
          type: "error",
          text: "Validation failed. Please check the errors below.",
        });
      } else {
        setMessage({
          type: "error",
          text: "Failed to save banking information.",
        });
      }
    } finally {
      setLoading((s) => ({ ...s, banking: false }));
    }
  };

  const clearError = (field: string) => {
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  return (
    <div className="p-6 mb-6 bg-white border shadow-sm rounded-xl border-slate-200">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center w-full gap-2 mb-1 text-left group"
      >
        <Banknote className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Banking Information
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase bg-red-50 rounded">
          Required
        </span>
        {bankName && bankAccountNumber && bankAccountHolder && (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        )}
        <ChevronDown
          className={`w-5 h-5 ml-auto text-slate-400 transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      <p className="mb-4 text-sm text-slate-600">
        Required to receive payments. Your information is encrypted and secure.
      </p>

      {!collapsed && (
        <>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="bank-suggestions"
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    setDirty((d) => ({ ...d, banking: true }));
                    clearError("bankName");
                  }}
                  placeholder="e.g., Maybank, CIMB, Public Bank"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-700 focus:outline-none focus:ring-2 ${
                    validationErrors.bankName
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:ring-slate-400"
                  }`}
                />
                <datalist id="bank-suggestions">
                  {MALAYSIAN_BANKS.map((bank) => (
                    <option key={bank} value={bank} />
                  ))}
                </datalist>
                {validationErrors.bankName && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors.bankName}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => {
                    setBankAccountHolder(e.target.value);
                    setDirty((d) => ({ ...d, banking: true }));
                    clearError("bankAccountHolder");
                  }}
                  placeholder="Full name as per bank account"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-700 focus:outline-none focus:ring-2 ${
                    validationErrors.bankAccountHolder
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:ring-slate-400"
                  }`}
                />
                {validationErrors.bankAccountHolder && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors.bankAccountHolder}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => {
                    setBankAccountNumber(e.target.value);
                    setDirty((d) => ({ ...d, banking: true }));
                    clearError("bankAccountNumber");
                  }}
                  placeholder="Bank account number"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-700 focus:outline-none focus:ring-2 ${
                    validationErrors.bankAccountNumber
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:ring-slate-400"
                  }`}
                />
                {validationErrors.bankAccountNumber && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors.bankAccountNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Branch Name/Code
                </label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => {
                    setBankBranch(e.target.value);
                    setDirty((d) => ({ ...d, banking: true }));
                  }}
                  placeholder="Branch name or code (optional)"
                  className="w-full px-3 py-2 text-sm bg-white border rounded-lg border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                SWIFT/BIC Code
              </label>
              <input
                type="text"
                value={bankSwiftCode}
                onChange={(e) => {
                  setBankSwiftCode(e.target.value.toUpperCase());
                  setDirty((d) => ({ ...d, banking: true }));
                  clearError("bankSwiftCode");
                }}
                placeholder="e.g., MBBEMYKL (optional)"
                maxLength={11}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-700 focus:outline-none focus:ring-2 ${
                  validationErrors.bankSwiftCode
                    ? "border-red-300 focus:ring-red-400"
                    : "border-slate-300 focus:ring-slate-400"
                }`}
              />
              {validationErrors.bankSwiftCode && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.bankSwiftCode}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                8 or 11 characters (e.g., MBBEMYKL for Maybank Malaysia)
              </p>
            </div>

            <div className="pt-2">
              <FileInput
                label="Bank Statement (for verification)"
                existing={bankStatement}
                onReplace={bankStatementUpload.handleReplace}
                onRemove={bankStatementUpload.handleRemove}
                openConfirm={openConfirm}
                loading={!!loading["bankStatement"]}
                accept="application/pdf,image/*"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty.banking || loading.banking}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-full shadow-sm bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
              >
                {loading.banking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Banking Information
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
