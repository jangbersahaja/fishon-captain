"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ExternalLink, Minus } from "lucide-react";
import Link from "next/link";

interface CharterPerformance {
  charterId: string;
  charterName: string;
  ownerName: string;
  views: number;
  uniqueVisitors: number;
  bookingStarts: number;
  bookingSubmits: number;
  conversionRate: number;
  photoViews: number;
  videoViews: number;
}

interface AllChartersTableProps {
  charters: CharterPerformance[];
}

export function AllChartersTable({ charters }: AllChartersTableProps) {
  // Calculate totals
  const totals = charters.reduce(
    (acc, charter) => ({
      views: acc.views + charter.views,
      uniqueVisitors: acc.uniqueVisitors + charter.uniqueVisitors,
      bookingStarts: acc.bookingStarts + charter.bookingStarts,
      bookingSubmits: acc.bookingSubmits + charter.bookingSubmits,
      photoViews: acc.photoViews + charter.photoViews,
      videoViews: acc.videoViews + charter.videoViews,
    }),
    {
      views: 0,
      uniqueVisitors: 0,
      bookingStarts: 0,
      bookingSubmits: 0,
      photoViews: 0,
      videoViews: 0,
    }
  );

  const overallConversion =
    totals.views > 0 ? (totals.bookingSubmits / totals.views) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Charter Performance</CardTitle>
          <div className="text-sm text-gray-500">
            {charters.length} active charters
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Charter</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
                <TableHead className="text-right">Starts</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">Media</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-gray-500"
                  >
                    No charter analytics data available yet
                  </TableCell>
                </TableRow>
              ) : (
                charters.map((charter, index) => (
                  <TableRow key={charter.charterId}>
                    {/* Rank */}
                    <TableCell className="font-medium text-gray-500">
                      {index + 1}
                    </TableCell>

                    {/* Charter Name */}
                    <TableCell>
                      <div className="font-medium">{charter.charterName}</div>
                      <div className="text-xs text-gray-500">
                        {charter.ownerName}
                      </div>
                    </TableCell>

                    {/* Views */}
                    <TableCell className="text-right">
                      {charter.views.toLocaleString()}
                    </TableCell>

                    {/* Unique Visitors */}
                    <TableCell className="text-right">
                      {charter.uniqueVisitors.toLocaleString()}
                    </TableCell>

                    {/* Booking Starts */}
                    <TableCell className="text-right">
                      {charter.bookingStarts.toLocaleString()}
                    </TableCell>

                    {/* Booking Submits */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{charter.bookingSubmits.toLocaleString()}</span>
                      </div>
                    </TableCell>

                    {/* Conversion Rate */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-semibold">
                          {charter.conversionRate.toFixed(1)}%
                        </span>
                        {charter.conversionRate >= 5 ? (
                          <ArrowUp className="w-3 h-3 text-green-500" />
                        ) : charter.conversionRate >= 2 ? (
                          <Minus className="w-3 h-3 text-yellow-500" />
                        ) : charter.conversionRate > 0 ? (
                          <ArrowDown className="w-3 h-3 text-red-500" />
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Media Views */}
                    <TableCell className="text-right">
                      <div className="text-xs">
                        <span className="text-pink-600">
                          {charter.photoViews}p
                        </span>
                        {" / "}
                        <span className="text-red-600">
                          {charter.videoViews}v
                        </span>
                      </div>
                    </TableCell>

                    {/* Link to charter */}
                    <TableCell>
                      <Link
                        href={`/staff/charters/${charter.charterId}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary footer */}
        {charters.length > 0 && (
          <div className="pt-4 mt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
              <div>
                <div className="mb-1 text-sm text-gray-500">Total Views</div>
                <div className="text-lg font-bold text-gray-900">
                  {totals.views.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Visitors</div>
                <div className="text-lg font-bold text-gray-900">
                  {totals.uniqueVisitors.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Starts</div>
                <div className="text-lg font-bold text-gray-900">
                  {totals.bookingStarts.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Bookings</div>
                <div className="text-lg font-bold text-gray-900">
                  {totals.bookingSubmits.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Avg Conv.</div>
                <div className="text-lg font-bold text-gray-900">
                  {overallConversion.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Media Views</div>
                <div className="text-lg font-bold text-gray-900">
                  {(totals.photoViews + totals.videoViews).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
