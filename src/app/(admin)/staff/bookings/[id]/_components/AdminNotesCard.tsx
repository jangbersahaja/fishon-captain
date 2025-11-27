"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addBookingAdminNote } from "@/lib/actions/staff-booking-actions";
import { FileText, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AdminNotesCardProps {
  bookingId: string;
  existingNotes: string | null;
}

export function AdminNotesCard({
  bookingId,
  existingNotes,
}: AdminNotesCardProps) {
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    startTransition(async () => {
      const result = await addBookingAdminNote(bookingId, newNote.trim());
      if (result.success) {
        toast.success("Note added successfully");
        setNewNote("");
      } else {
        toast.error(result.error || "Failed to add note");
      }
    });
  };

  // Parse notes to display them better
  const parseNotes = (
    notes: string | null
  ): Array<{ timestamp: string; author: string; content: string }> => {
    if (!notes) return [];

    const noteBlocks = notes.split("\n\n").filter(Boolean);
    return noteBlocks.map((block) => {
      // Try to parse structured notes: [timestamp] Staff (userId): content
      // Using [\s\S] instead of . with 's' flag for cross-line matching
      const match = block.match(
        /^\[([^\]]+)\]\s*Staff\s*\(([^)]+)\):\s*([\s\S]+)$/
      );
      if (match) {
        return {
          timestamp: match[1],
          author: match[2],
          content: match[3],
        };
      }
      // Fallback for unstructured notes
      return {
        timestamp: "",
        author: "System",
        content: block,
      };
    });
  };

  const parsedNotes = parseNotes(existingNotes);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Admin Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Note */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add internal notes about this booking..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={isPending || !newNote.trim()}
            size="sm"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isPending ? "Adding..." : "Add Note"}
          </Button>
        </div>

        {/* Existing Notes */}
        {parsedNotes.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="mb-3 text-sm font-medium text-slate-700">
              Previous Notes
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {parsedNotes.map((note, index) => (
                <div
                  key={index}
                  className="p-3 text-sm rounded-lg bg-slate-50 border border-slate-100"
                >
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  {note.timestamp && (
                    <p className="mt-2 text-xs text-slate-500">
                      {formatTimestamp(note.timestamp)} • {note.author}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedNotes.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No admin notes yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-MY", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    });
  } catch {
    return isoString;
  }
}
