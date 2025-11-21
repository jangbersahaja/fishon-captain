"use client";

import { Button } from "@/components/ui/button";
import { Building2, Edit2, Eye, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Charter = {
  id: string;
  name: string;
  charterType: string;
  city: string;
  state: string;
  startingPoint: string;
  isActive: boolean;
  _count?: {
    trips: number;
    media: number;
  };
};

type CharterListProps = {
  charters: Charter[];
  userRole: "CAPTAIN" | "OPERATOR" | "CREW" | "STAFF" | "ADMIN";
  adminUserId?: string;
};

export function CharterList({
  charters,
  userRole,
  adminUserId,
}: CharterListProps) {
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
          {charters.map((charter) => {
            const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";
            const editHref = `/captain/form?editCharterId=${charter.id}${editQuery}`;

            return (
              <div
                key={charter.id}
                className="p-5 transition-shadow bg-white border shadow-sm rounded-2xl border-slate-200 hover:shadow-md"
              >
                {/* Charter Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold truncate text-slate-900">
                        {charter.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          charter.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {charter.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs tracking-wide uppercase text-slate-500">
                      {charter.charterType}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 text-sm text-slate-600">
                    <p className="font-medium">{charter.startingPoint}</p>
                    <p className="text-xs text-slate-500">
                      {charter.city}, {charter.state}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                {charter._count && (
                  <div className="flex gap-4 mb-4 text-xs text-slate-500">
                    <div>
                      <span className="font-medium text-slate-700">
                        {charter._count.trips}
                      </span>{" "}
                      trip{charter._count.trips !== 1 ? "s" : ""}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">
                        {charter._count.media}
                      </span>{" "}
                      photo{charter._count.media !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Link
                    href={`https://www.fishon.my/charters/${charter.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <Link
                    href={editHref}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ec2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#d81e23] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
