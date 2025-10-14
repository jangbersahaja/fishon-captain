/**
 * MFA Setup Complete Page
 * Shows success message and backup codes after MFA setup
 */

"use client";

import { Button } from "@/components/ui/button";
import { Check, CheckCircle, Copy, Download, Shield } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function MFACompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const backupCodesParam = searchParams.get("backupCodes");
  const backupCodes = useMemo(() => {
    if (!backupCodesParam) return [];
    try {
      return JSON.parse(decodeURIComponent(backupCodesParam));
    } catch {
      return [];
    }
  }, [backupCodesParam]);

  useEffect(() => {
    if (!backupCodes || backupCodes.length === 0) {
      router.push("/captain/settings");
    }
  }, [backupCodes, router]);

  const handleCopyBackupCodes = async () => {
    const codesText = backupCodes.join("\n");
    await navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fishon-backup-codes-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!backupCodes || backupCodes.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Two-Factor Authentication Enabled
          </h1>
          <p className="text-gray-600">
            Your account is now protected with two-factor authentication
          </p>
        </div>

        {/* Backup Codes Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Save Your Backup Codes
              </h2>
              <p className="text-sm text-gray-700">
                Store these backup codes in a safe place. Each code can only be
                used once if you lose access to your authenticator app.
              </p>
            </div>
          </div>

          {/* Backup Codes Display */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              {backupCodes.map((code: string, index: number) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded px-3 py-2 text-center border border-gray-200"
                >
                  {code}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-200">
              <Button
                onClick={handleCopyBackupCodes}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Codes
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadBackupCodes}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as Text
              </Button>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm">Important:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Keep these codes secure - don&apos;t share them with anyone</li>
            <li>Each backup code can only be used once</li>
            <li>You can regenerate new codes anytime from your settings</li>
            <li>
              Don&apos;t lose these codes - you&apos;ll need them if you lose
              your phone
            </li>
          </ul>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Next Steps:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <span className="font-medium text-gray-900">1.</span>
              <span>
                Test your two-factor authentication by signing out and signing
                back in
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-medium text-gray-900">2.</span>
              <span>
                Store your backup codes in a password manager or secure location
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-medium text-gray-900">3.</span>
              <span>
                Return to your account settings to manage your security
                preferences
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => router.push("/captain/settings")}
            className="flex-1"
          >
            Go to Settings
          </Button>
          <Button
            onClick={() => router.push("/captain")}
            variant="outline"
            className="flex-1"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MFACompletePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><div>Loading...</div></div>}>
      <MFACompleteContent />
    </Suspense>
  );
}
