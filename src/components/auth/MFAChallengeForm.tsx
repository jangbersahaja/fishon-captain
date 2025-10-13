/**
 * MFAChallengeForm Component
 * Form for entering TOTP code or backup code during MFA verification
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Key, Shield } from "lucide-react";
import { useState } from "react";
import { VerificationCodeInput } from "./VerificationCodeInput";

interface MFAChallengeFormProps {
  onSubmit: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel?: () => void;
  userId: string;
  error?: string;
  isLoading?: boolean;
}

export function MFAChallengeForm({
  onSubmit,
  onCancel,
  error,
  isLoading = false,
}: MFAChallengeFormProps) {
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    const code = useBackupCode ? backupCode.trim() : totpCode;

    if (!code || code.length === 0) {
      return;
    }

    await onSubmit(code, useBackupCode);
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setTotpCode("");
    setBackupCode("");
  };

  const isValid = useBackupCode
    ? backupCode.trim().length >= 8
    : totpCode.length === 6;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold">Two-Factor Authentication</h2>
          <p className="text-gray-600">
            {useBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {useBackupCode ? (
            // Backup Code Input
            <div className="space-y-2">
              <Label htmlFor="backup-code">Backup Code</Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="XXXX-XXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                maxLength={9}
                autoFocus
                className="text-center text-lg font-mono tracking-wider"
              />
              <p className="text-sm text-gray-500">
                Format: XXXX-XXXX (8 characters)
              </p>
            </div>
          ) : (
            // TOTP Code Input
            <div className="space-y-4">
              <Label className="sr-only">Verification Code</Label>
              <VerificationCodeInput
                length={6}
                value={totpCode}
                onChange={setTotpCode}
                disabled={isLoading}
                error={!!error}
                autoFocus
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        {/* Toggle Backup Code */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleToggleBackupCode}
            disabled={isLoading}
          >
            <Key className="w-4 h-4 mr-2" />
            {useBackupCode
              ? "Use authenticator app instead"
              : "Use backup code instead"}
          </Button>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Lost your authenticator device?{" "}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => setUseBackupCode(true)}
            >
              Use a backup code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
