"use client";

import { Button } from "@/components/ui/button";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { Building2, Plus, Ship } from "lucide-react";
import { useRouter } from "next/navigation";
import { CharterManagementCard } from "./components/CharterManagementCard";

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
  const _canAddCharter =
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

  // Summary stats across all charters
  const totalBookings = charters.reduce(
    (sum, c) => sum + c.bookingStats.total,
    0
  );
  const thisMonthBookings = charters.reduce(
    (sum, c) => sum + c.bookingStats.thisMonth,
    0
  );
  const activeCharters = charters.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats (if multiple charters) */}
      {charters.length > 0 && (
        <div className="grid grid-cols-2 gap-4 ">
          <div className="p-4 bg-white border rounded-xl border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Ship className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-slate-500">
                Total Charters
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {charters.length}
            </p>
          </div>
          <div className="p-4 bg-white border rounded-xl border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-medium text-slate-500">Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {activeCharters}
            </p>
          </div>
        </div>
      )}

      {/* Header with Add Charter Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {charters.length === 0 ? "Get Started" : "Your Charters"}
          </h2>
          <p className="text-sm text-slate-500">
            {charters.length === 0
              ? "Create your first charter listing"
              : `Manage your charter listings, configurations, and booking settings`}
          </p>
        </div>

        {/* Hidden for now - Coming Soon */}
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
        <div className="space-y-6">
          {charters.map((charter) => (
            <CharterManagementCard
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
