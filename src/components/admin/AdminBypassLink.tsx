"use client";

import { AdminBypassPasswordModal } from "@/components/ui/AdminBypassPasswordModal";
import type { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

interface AdminBypassLinkProps {
  href: string;
  children: ReactNode;
  confirmTitle: string;
  confirmDescription: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  disabled?: boolean;
}

/**
 * AdminBypassLink - Wrapper for navigation links that require admin password confirmation
 * Use for admin impersonation actions like "Open Draft as Admin" or "Edit as Admin"
 */
export function AdminBypassLink({
  href,
  children,
  confirmTitle,
  confirmDescription,
  variant = "default",
  size = "sm",
  className,
  disabled = false,
}: AdminBypassLinkProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || isNavigating) return;
    setError(undefined);
    setShowModal(true);
  };

  const handleConfirm = async (password: string) => {
    setError(undefined);
    setIsNavigating(true);

    try {
      // Verify password via backend
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Password verification failed");
        setIsNavigating(false);
        return;
      }

      // Password verified, navigate
      setShowModal(false);
      router.push(href);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify password"
      );
      setIsNavigating(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isNavigating}
        className={cn("flex items-center gap-1.5", className)}
      >
        {children}
      </Button>

      <AdminBypassPasswordModal
        open={showModal}
        onOpenChange={setShowModal}
        onConfirm={handleConfirm}
        title={confirmTitle}
        description={confirmDescription}
        error={error}
        isLoading={isNavigating}
      />
    </>
  );
}
