/**
 * Staff Security Dashboard Page
 * Manage user accounts, security settings, and audit logs
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/datetime";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: Date | null;
  passwordMfaEnabled: boolean;
  passwordMfaMethod: string | null;
  passwordMfaVerifiedAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  isLocked: boolean;
  forcePasswordReset: boolean;
  isOAuthOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityEvent {
  id: string;
  action: string;
  actor: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  entityType: string;
  entityId: string;
  changed: Record<string, unknown>;
  createdAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function StaffSecurityPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination | null>(
    null
  );
  const [eventsPagination, setEventsPagination] = useState<Pagination | null>(
    null
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: "20",
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load users");
        return;
      }

      setUsers(data.users);
      setUsersPagination(data.pagination);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [usersPage, searchQuery, roleFilter, statusFilter]);

  // Fetch security events
  const fetchSecurityEvents = useCallback(async () => {
    setIsLoadingEvents(true);

    try {
      const params = new URLSearchParams({
        page: eventsPage.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/admin/security-events?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to load security events:", data.error);
        return;
      }

      setSecurityEvents(data.logs);
      setEventsPagination(data.pagination);
    } catch (err) {
      console.error("Fetch security events error:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [eventsPage]);

  // Unlock user account
  const handleUnlockAccount = async (userId: string, userEmail: string) => {
    if (
      !confirm(`Are you sure you want to unlock the account for ${userEmail}?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to unlock account");
        return;
      }

      setSuccessMessage(`Account unlocked successfully for ${userEmail}`);
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUsers();
      fetchSecurityEvents();
    } catch (err) {
      console.error("Unlock account error:", err);
      setError("Failed to unlock account");
    }
  };

  // Force password reset
  const handleForcePasswordReset = async (
    userId: string,
    userEmail: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to force a password reset for ${userEmail}? They will be required to reset their password on next login.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/force-reset`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to force password reset");
        return;
      }

      setSuccessMessage(`Password reset forced for ${userEmail}`);
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchUsers();
      fetchSecurityEvents();
    } catch (err) {
      console.error("Force password reset error:", err);
      setError("Failed to force password reset");
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchSecurityEvents();
  }, [fetchSecurityEvents]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold tracking-tight">
        Security Dashboard
      </h1>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Users Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            User Accounts
          </h2>
          <Button
            onClick={() => {
              setUsersPage(1);
              fetchUsers();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUsersPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="space-y-2">
            <Label htmlFor="role-filter">Role</Label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setUsersPage(1);
              }}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="CAPTAIN">Captain</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setUsersPage(1);
              }}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="mfa_enabled">MFA Enabled</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {isLoadingUsers ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    MFA Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Account Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.name || "No name"}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.isOAuthOnly && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                            OAuth
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "STAFF"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.passwordMfaEnabled ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">
                            {user.passwordMfaMethod}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Disabled</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {user.isLocked ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Locked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Active</span>
                          </div>
                        )}
                        {user.forcePasswordReset && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">
                              Password reset required
                            </span>
                          </div>
                        )}
                        {user.loginAttempts > 0 && (
                          <span className="text-xs text-gray-600">
                            {user.loginAttempts} failed login
                            {user.loginAttempts > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {user.isLocked && (
                          <Button
                            onClick={() =>
                              handleUnlockAccount(user.id, user.email)
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            Unlock
                          </Button>
                        )}
                        {!user.isOAuthOnly && !user.forcePasswordReset && (
                          <Button
                            onClick={() =>
                              handleForcePasswordReset(user.id, user.email)
                            }
                            size="sm"
                            variant="outline"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Force Reset
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Users Pagination */}
        {usersPagination && usersPagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {users.length} of {usersPagination.totalCount} users
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setUsersPage(usersPage - 1)}
                disabled={!usersPagination.hasPrev}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {usersPagination.page} of {usersPagination.totalPages}
              </span>
              <Button
                onClick={() => setUsersPage(usersPage + 1)}
                disabled={!usersPagination.hasNext}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Security Events Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Security Events
          </h2>
          <Button
            onClick={() => {
              setEventsPage(1);
              fetchSecurityEvents();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          {isLoadingEvents ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Loading security events...</p>
            </div>
          ) : securityEvents.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No security events found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Actor
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody>
                {securityEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {event.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {event.actor ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {event.actor.name || "No name"}
                          </p>
                          <p className="text-xs text-gray-600">
                            {event.actor.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Events Pagination */}
        {eventsPagination && eventsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {securityEvents.length} of {eventsPagination.totalCount}{" "}
              events
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setEventsPage(eventsPage - 1)}
                disabled={!eventsPagination.hasPrev}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {eventsPagination.page} of {eventsPagination.totalPages}
              </span>
              <Button
                onClick={() => setEventsPage(eventsPage + 1)}
                disabled={!eventsPagination.hasNext}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
