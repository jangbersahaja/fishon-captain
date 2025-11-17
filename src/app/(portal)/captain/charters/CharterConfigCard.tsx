"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  ExternalLink,
  List,
  Loader2,
  MapPin,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CharterConfiguration } from "./components/CharterConfiguration";
import { useToggleCharterStatus } from "./hooks/useCharterMutations";

interface CharterConfigCardProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterConfigCard({
  charter,
  adminUserId,
}: CharterConfigCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleStatusMutation = useToggleCharterStatus();
  const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";
  const editHref = `/captain/form?editCharterId=${charter.id}${editQuery}`;

  const handleStatusToggle = async (checked: boolean) => {
    await toggleStatusMutation.mutateAsync({
      charterId: charter.id,
      isActive: checked,
      adminUserId,
    });
    router.refresh();
  };

  return (
    <div className="p-5 transition-shadow bg-white border shadow-sm rounded-2xl border-slate-200 hover:shadow-md">
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

        {/* Status Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-end">
            <label
              htmlFor={`status-${charter.id}`}
              className="text-xs font-medium text-slate-700"
            >
              {toggleStatusMutation.isPending ? "Updating..." : "Status"}
            </label>
            <div className="flex items-center gap-2 mt-1">
              {toggleStatusMutation.isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              )}
              <Switch
                id={`status-${charter.id}`}
                checked={charter.isActive}
                onCheckedChange={handleStatusToggle}
                disabled={toggleStatusMutation.isPending}
              />
            </div>
          </div>
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

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="pb-4 mb-4 space-y-2 border-b border-slate-100">
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            {charter.boat && (
              <span className="flex items-center gap-1">
                ✓ Boat: {charter.boat.name}
              </span>
            )}
            {charter.trips.count > 0 && (
              <span className="flex items-center gap-1">
                ✓ {charter.trips.count} Trip
                {charter.trips.count !== 1 ? "s" : ""}
              </span>
            )}
            {charter.media.count > 0 && (
              <span className="flex items-center gap-1">
                ✓ {charter.media.count} Photo
                {charter.media.count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {charter.bookingFlowType === "MANUAL"
                ? `Manual (${charter.approvalTimeHours}h)`
                : "Instant Booking"}
            </Badge>
          </div>

          {charter.lastBooking && (
            <div className="text-xs text-slate-500">
              📅 Last booking:{" "}
              {formatDistanceToNow(charter.lastBooking.createdAt, {
                addSuffix: true,
              })}
            </div>
          )}
        </div>
      )}

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="pb-4 mb-4 space-y-4 border-b border-slate-100">
          <CharterConfiguration charter={charter} adminUserId={adminUserId} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              View Details
            </>
          )}
        </Button>

        <Link
          href={editHref}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ec2227] px-4 py-2 text-sm font-medium text-white hover:bg-[#d81e23] transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link
                href={`https://www.fishon.my/charters/${charter.id}`}
                target="_blank"
                rel="noopener"
                className="flex items-center cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Marketplace
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href={`/captain/account/bookings?charterId=${charter.id}`}
                className="flex items-center cursor-pointer"
              >
                <List className="w-4 h-4 mr-2" />
                View All Bookings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement duplicate charter functionality in future phase
                console.log("Duplicate charter:", charter.id);
              }}
              className="cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Charter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
