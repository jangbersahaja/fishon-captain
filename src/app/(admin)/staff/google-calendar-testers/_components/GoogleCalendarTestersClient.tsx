"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  googleCalendar: {
    isConnected: boolean;
    connectedAt: string | null;
    googleEmail: string | null;
    lastSyncAt: string | null;
  } | null;
}

interface GoogleCalendarTestersClientProps {
  initialTestUsers: TestUser[];
}

export function GoogleCalendarTestersClient({
  initialTestUsers,
}: GoogleCalendarTestersClientProps) {
  const [testUsers, setTestUsers] = useState<TestUser[]>(initialTestUsers);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddUser = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/staff/google-calendar-testers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add user");
        return;
      }

      toast.success(data.message);
      setShowAddDialog(false);
      setEmail("");

      // Refresh the list
      const refreshRes = await fetch("/api/staff/google-calendar-testers");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setTestUsers(refreshData.testUsers);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
      toast.error("Failed to add user");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;

    setIsRemoving(true);
    try {
      const res = await fetch("/api/staff/google-calendar-testers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to remove user");
        return;
      }

      toast.success(data.message);
      setShowRemoveDialog(false);
      setSelectedUser(null);

      // Update local state
      setTestUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    } catch (error) {
      console.error("Failed to remove user:", error);
      toast.error("Failed to remove user");
    } finally {
      setIsRemoving(false);
    }
  };

  const openRemoveDialog = (user: TestUser) => {
    setSelectedUser(user);
    setShowRemoveDialog(true);
  };

  return (
    <>
      {/* Add User Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          {testUsers.length} test user{testUsers.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Test User
        </Button>
      </div>

      {/* Test Users List */}
      <div className="bg-white border rounded-xl border-slate-200 divide-y divide-slate-200">
        {testUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No test users added yet</p>
            <p className="mt-1 text-sm">
              Add users to allow them access to Google Calendar integration
            </p>
          </div>
        ) : (
          testUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {user.name[0].toUpperCase()}
                  </span>
                </div>

                {/* User Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-slate-900">
                      {user.name}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                    {user.googleCalendar?.isConnected ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {user.email}
                  </p>
                  {user.googleCalendar?.googleEmail && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {user.googleCalendar.googleEmail}
                      {user.googleCalendar.lastSyncAt && (
                        <span className="text-slate-400">
                          · Last sync:{" "}
                          {new Date(
                            user.googleCalendar.lastSyncAt
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => openRemoveDialog(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Google Cloud Console Link */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">
              Google Cloud Console Setup
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Remember to also add these emails as test users in Google Cloud
              Console for them to authorize the OAuth consent screen.
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              Open OAuth Consent Screen
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Test User</DialogTitle>
            <DialogDescription>
              Add a user&apos;s email to allow them access to Google Calendar
              integration. Make sure to also add them in Google Cloud Console.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="captain@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAdding) {
                    handleAddUser();
                  }
                }}
              />
              <p className="text-xs text-slate-500">
                The user must already have an account in Fishon Captain
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEmail("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isAdding}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Test User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">{selectedUser?.email}</span> from
              Google Calendar test users? They will see &quot;Coming Soon&quot;
              instead of the integration.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
