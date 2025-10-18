"use client";

import { AdminBypassPasswordModal } from "@/components/ui/AdminBypassPasswordModal";
import { useState } from "react";

interface AdminBypassFormProps {
  onSubmit: (password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export function AdminBypassForm({
  onSubmit,
  loading,
  error,
  title = "Admin Password Required",
  description = "Please enter your admin password to proceed.",
  children,
}: AdminBypassFormProps) {
  const [showModal, setShowModal] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      {children}
      <button type="submit" disabled={loading}>
        Submit
      </button>
      <AdminBypassPasswordModal
        open={showModal}
        onOpenChange={setShowModal}
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        title={title}
        description={description}
      />
    </form>
  );
}
