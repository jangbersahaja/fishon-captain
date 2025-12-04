"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface AddBankInfoDialogProps {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
}

// Malaysian banks list
const MALAYSIAN_BANKS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "Bank Simpanan Nasional (BSN)",
  "Affin Bank",
  "Alliance Bank",
  "Standard Chartered",
  "HSBC",
  "OCBC Bank",
  "UOB Bank",
  "Citibank",
  "Agrobank",
  "Bank Muamalat",
  "Al-Rajhi Bank",
  "Kuwait Finance House",
  "MBSB Bank",
  "Other",
] as const;

export function AddBankInfoDialog({
  ownerId,
  ownerName,
  ownerEmail,
}: AddBankInfoDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBank, setSelectedBank] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  // Determine the actual bank name to submit
  const bankName = selectedBank === "Other" ? customBankName : selectedBank;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBank || !accountNumber || !accountHolder) {
      setError("All fields are required");
      return;
    }

    if (selectedBank === "Other" && !customBankName.trim()) {
      setError("Please enter the bank name");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/captain-bank-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: ownerId,
            bankName,
            accountNumber,
            accountHolder,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update bank info");
        }

        setOpen(false);
        // Reset form
        setSelectedBank("");
        setCustomBankName("");
        setAccountNumber("");
        setAccountHolder("");
        // Refresh the page to show updated data
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          title="Add bank information"
        >
          <Plus className="h-3 w-3" />
          Add Bank
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Information</DialogTitle>
          <DialogDescription>
            Add bank details for <strong>{ownerName}</strong> ({ownerEmail}) to
            enable payouts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger id="bankName">
                <SelectValue placeholder="Select a bank" />
              </SelectTrigger>
              <SelectContent>
                {MALAYSIAN_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBank === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="customBankName">Enter Bank Name</Label>
              <Input
                id="customBankName"
                type="text"
                placeholder="e.g., Touch 'n Go eWallet"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="e.g., 1234567890"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/\D/g, ""))
              }
              maxLength={20}
            />
            <p className="text-xs text-slate-500">Numbers only, no dashes</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolder">Account Holder Name</Label>
            <Input
              id="accountHolder"
              type="text"
              placeholder="As shown on bank statement"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-slate-500">
              Must match the name on the bank account
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Bank Info"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
