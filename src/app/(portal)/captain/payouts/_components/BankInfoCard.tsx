import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { AlertTriangle, Building2 } from "lucide-react";
import Link from "next/link";

interface BankInfoCardProps {
  userId: string;
}

export async function BankInfoCard({ userId }: BankInfoCardProps) {
  const verification = await prisma.captainVerification.findUnique({
    where: { userId },
    select: {
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
    },
  });

  // Decrypt bank details
  let bankAccountNumber = verification?.bankAccountNumber;
  let bankAccountHolder = verification?.bankAccountHolder;

  try {
    if (bankAccountNumber) {
      bankAccountNumber = decrypt(bankAccountNumber);
    }
    if (bankAccountHolder) {
      bankAccountHolder = decrypt(bankAccountHolder);
    }
  } catch (error) {
    console.error("Failed to decrypt bank details:", error);
  }

  const hasBankDetails =
    verification?.bankName && bankAccountNumber && bankAccountHolder;

  return (
    <div
      className={`p-4 border rounded-lg ${hasBankDetails ? "border-slate-200 bg-white" : "border-red-200 bg-red-50"}`}
    >
      <div className="flex items-start gap-3">
        {hasBankDetails ? (
          <Building2 className="w-5 h-5 mt-0.5 text-slate-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3
            className={`font-medium ${hasBankDetails ? "text-slate-900" : "text-red-900"}`}
          >
            {hasBankDetails ? "Bank Account Details" : "Bank Details Missing"}
          </h3>
          {hasBankDetails ? (
            <>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium">Bank:</span>{" "}
                  {verification.bankName}
                </p>
                <p>
                  <span className="font-medium">Account:</span>{" "}
                  {maskAccountNumber(bankAccountNumber || "")}
                </p>
                <p>
                  <span className="font-medium">Holder:</span>{" "}
                  {bankAccountHolder}
                </p>
              </div>
              <Link
                href="/captain/documents"
                className="inline-flex items-center mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Update Bank Details →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-red-700">
                You need to add your bank account details to receive payouts.
              </p>
              <Link
                href="/captain/documents"
                className="inline-flex items-center px-3 py-1.5 mt-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Add Bank Details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  const masked = "*".repeat(accountNumber.length - 4);
  return `${masked}${last4}`;
}
