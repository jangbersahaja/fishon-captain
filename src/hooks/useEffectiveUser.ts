/**
 * useEffectiveUser Hook
 *
 * Returns the effective user profile for navigation/display purposes.
 * In admin mode (adminUserId present), fetches the target captain's profile.
 * Otherwise, returns the logged-in user's session data.
 */

"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface EffectiveUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface UseEffectiveUserResult {
  user: EffectiveUser | null;
  isLoading: boolean;
  isAdminMode: boolean;
  adminUserId: string | null;
}

export function useEffectiveUser(): UseEffectiveUserResult {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const adminUserId = searchParams?.get("adminUserId") || null;
  const isAdminMode = !!adminUserId;

  const [targetUser, setTargetUser] = useState<EffectiveUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch target user profile when in admin mode
  useEffect(() => {
    if (!isAdminMode || !adminUserId) {
      setTargetUser(null);
      return;
    }

    const fetchTargetUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/user-profile?userId=${adminUserId}`
        );
        if (response.ok) {
          const data = await response.json();
          setTargetUser(data.user);
        } else {
          console.error("Failed to fetch target user profile");
          setTargetUser(null);
        }
      } catch (error) {
        console.error("Error fetching target user:", error);
        setTargetUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTargetUser();
  }, [isAdminMode, adminUserId]);

  // Return target user in admin mode, otherwise session user
  if (isAdminMode && targetUser) {
    return {
      user: targetUser,
      isLoading,
      isAdminMode: true,
      adminUserId,
    };
  }

  // Return session user for normal mode
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        image: session.user.image || null,
      }
    : null;

  return {
    user: sessionUser,
    isLoading: status === "loading" || isLoading,
    isAdminMode,
    adminUserId,
  };
}
