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
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface CharterPerformance {
  charterId: string;
  name: string;
  views: number;
  bookings: number;
  conversionRate: number;
}

interface TopChartersTableProps {
  topCharters: CharterPerformance[];
}

export function TopChartersTable({ topCharters }: TopChartersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Charters</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Charter Name</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topCharters.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-gray-500"
                >
                  No charter data available yet
                </TableCell>
              </TableRow>
            ) : (
              topCharters.map((charter, index) => (
                <TableRow key={charter.charterId}>
                  {/* Rank */}
                  <TableCell className="font-medium text-gray-500">
                    {index + 1}
                  </TableCell>

                  {/* Charter Name */}
                  <TableCell className="font-medium">{charter.name}</TableCell>

                  {/* Views */}
                  <TableCell className="text-right">
                    {charter.views.toLocaleString()}
                  </TableCell>

                  {/* Bookings */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{charter.bookings.toLocaleString()}</span>
                      {index === 0 && charter.bookings > 0 && (
                        <ArrowUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </TableCell>

                  {/* Conversion Rate */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold">
                        {charter.conversionRate.toFixed(1)}%
                      </span>
                      {charter.conversionRate >= 5 ? (
                        <ArrowUp className="w-4 h-4 text-green-500" />
                      ) : charter.conversionRate >= 2 ? (
                        <Minus className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Summary footer */}
        {topCharters.length > 0 && (
          <div className="pt-4 mt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="mb-1 text-sm text-gray-500">Total Views</div>
                <div className="text-lg font-bold text-gray-900">
                  {topCharters
                    .reduce((sum, charter) => sum + charter.views, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">Total Bookings</div>
                <div className="text-lg font-bold text-gray-900">
                  {topCharters
                    .reduce((sum, charter) => sum + charter.bookings, 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
