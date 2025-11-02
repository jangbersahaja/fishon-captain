/**
 * Schedule Section Component
 *
 * Displays current operational schedule with edit capability.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharterSchedule } from "@prisma/client";
import { Calendar, Edit2 } from "lucide-react";
import { useState } from "react";
import { ScheduleModal } from "./ScheduleModal";

interface ScheduleSectionProps {
  charterId: string;
  schedule: CharterSchedule | null;
}

const SCHEDULE_LABELS = {
  EVERYDAY: "Every Day",
  WEEKDAYS: "Weekdays Only",
  WEEKENDS: "Weekends Only",
  CUSTOM: "Custom Schedule",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleSection({ charterId, schedule }: ScheduleSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Operational Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            No schedule configured. Set your operational days to manage
            availability.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="w-full"
          >
            Configure Schedule
          </Button>
          <ScheduleModal
            charterId={charterId}
            currentSchedule={null}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Operational Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Schedule */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Current Schedule
            </span>
            <Badge variant="secondary">
              {SCHEDULE_LABELS[schedule.scheduleType]}
            </Badge>
          </div>

          {/* Custom Days Display */}
          {schedule.scheduleType === "CUSTOM" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_NAMES.map((day, index) => {
                const isOperational = schedule.operationalDays.includes(index);
                return (
                  <div
                    key={day}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium ${
                      isOperational
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          )}

          {/* Description */}
          <p className="mt-2 text-xs text-slate-500">
            {schedule.scheduleType === "EVERYDAY" &&
              "Your charter operates every day of the week."}
            {schedule.scheduleType === "WEEKDAYS" &&
              "Your charter operates Monday through Friday only."}
            {schedule.scheduleType === "WEEKENDS" &&
              "Your charter operates on Saturdays and Sundays only."}
            {schedule.scheduleType === "CUSTOM" &&
              `Operating ${schedule.operationalDays.length} day${schedule.operationalDays.length !== 1 ? "s" : ""} per week.`}
          </p>
        </div>

        {/* Edit Button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Edit2 className="mr-2 h-3 w-3" />
          Edit Schedule
        </Button>

        <ScheduleModal
          charterId={charterId}
          currentSchedule={schedule}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
