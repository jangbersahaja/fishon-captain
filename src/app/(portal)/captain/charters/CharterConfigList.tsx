"use client";

import { Button } from "@/components/ui/button";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { CharterConfigCard } from "./CharterConfigCard";

type CharterConfigListProps = {
  charters: EnhancedCharterConfig[];
  userRole: "CAPTAIN" | "OPERATOR" | "CREW" | "STAFF" | "ADMIN";
  adminUserId?: string;
};

export function CharterConfigList({
  charters,
  userRole,
  adminUserId,
}: CharterConfigListProps) {
  const router = useRouter();
  const canAddCharter =
    userRole === "OPERATOR" ||
    (userRole === "CAPTAIN" && charters.length === 0);

  const handleAddCharter = () => {
    if (userRole === "CAPTAIN" && charters.length >= 1) {
      // Redirect to upgrade page for CAPTAIN users who already have 1 charter
      router.push("/captain/upgrade");
    } else {
      // Open charter form for new charter
      const query = adminUserId ? `?adminUserId=${adminUserId}` : "";
      router.push(`/captain/form${query}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Charter Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Your Charters
          </h2>
          <p className="text-sm text-slate-500">
            {charters.length === 0
              ? "Create your first charter listing"
              : `Managing ${charters.length} charter${charters.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex-col items-center hidden gap-1 p-5 px-5 py-3 border-2 border-blue-200 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50">
          <Button
            onClick={handleAddCharter}
            className="font-semibold text-white shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Charter
          </Button>
          <span className="text-xs text-slate-500">Coming Soon</span>
        </div>
      </div>

      {/* Charter List or Empty State */}
      {charters.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-2xl border-slate-200 bg-slate-50">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No charters yet
          </h3>
          <p className="max-w-md mx-auto mb-6 text-sm text-slate-500">
            Create your first charter listing to start accepting bookings on
            Fishon.
          </p>
          <Button
            onClick={handleAddCharter}
            size="lg"
            className="bg-[#ec2227] hover:bg-[#d81e23]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Charter
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {charters.map((charter) => (
            <CharterConfigCard
              key={charter.id}
              charter={charter}
              adminUserId={adminUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
