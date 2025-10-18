"use client";

import { AdminBypassPasswordModal } from "@/components/ui/AdminBypassPasswordModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AdminBypassActionProps {
  actionLabel: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onConfirm: (password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  buttonClassName?: string;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function AdminBypassAction({
  actionLabel,
  confirmTitle = "Admin Password Required",
  confirmDescription = "Please enter your admin password to proceed.",
  onConfirm,
  loading,
  error,
  buttonClassName = "",
  buttonVariant = "default",
  buttonSize = "default",
  children,
}: AdminBypassActionProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        type="button"
        className={cn("flex items-center gap-1.5", buttonClassName)}
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {children || actionLabel}
      </Button>
      <AdminBypassPasswordModal
        open={showModal}
        onOpenChange={setShowModal}
        onSubmit={onConfirm}
        loading={loading}
        error={error}
        title={confirmTitle}
        description={confirmDescription}
      />
    </>
  );
}
