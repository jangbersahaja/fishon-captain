/**
 * Generic hook for document upload/remove operations
 * Eliminates code duplication across all document fields
 */

import { useCallback } from "react";
import { removeDocument } from "../server/documents-api";
import type { MessageState, Statused } from "../types";

export interface UseDocumentUploadOptions {
  /** Field name for API calls */
  fieldName: string;
  /** Current document state */
  document: Statused | null;
  /** Setter for document state */
  setDocument: (doc: Statused | null) => void;
  /** Track dirty state */
  setDirty: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  /** Set loading state */
  setLoading: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  /** Set message */
  setMessage: (msg: MessageState) => void;
  /** Open confirmation dialog - compatible with FileInput component */
  openConfirm: (message: string, run: () => void | Promise<void>) => void;
}

export function useDocumentUpload({
  fieldName,
  document,
  setDocument,
  setDirty,
  setLoading,
  setMessage,
  openConfirm,
}: UseDocumentUploadOptions) {
  /**
   * Handle document replacement (upload)
   */
  const handleReplace = useCallback(
    async (file: File) => {
      const oldDoc = document;

      // Set loading state
      setLoading((prev) => ({ ...prev, [fieldName]: true }));

      // Optimistic update
      setDocument({
        key: "uploading",
        url: URL.createObjectURL(file),
        name: file.name,
        updatedAt: new Date().toISOString(),
      });
      setDirty((prev) => ({ ...prev, [fieldName]: true }));

      try {
        // Step 1: Upload to Vercel Blob
        const fd = new FormData();
        fd.set("file", file);
        fd.set("docType", fieldName);
        const uploadRes = await fetch("/api/blob/upload", {
          method: "POST",
          body: fd,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }

        const { url, key } = await uploadRes.json();
        const uploaded: Statused = {
          key,
          url,
          name: file.name,
          updatedAt: new Date().toISOString(),
        };

        // Step 2: Save to database
        const saveRes = await fetch("/api/captain/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [fieldName]: uploaded }),
        });

        if (!saveRes.ok) {
          throw new Error("Save failed");
        }

        setDocument(uploaded);
        setMessage({
          type: "success",
          text: "Uploaded. Click Submit to verify.",
        });
      } catch (err) {
        // Revert on error
        setDocument(oldDoc);
        setDirty((prev) => ({ ...prev, [fieldName]: false }));
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Upload failed",
        });
      } finally {
        setLoading((prev) => ({ ...prev, [fieldName]: false }));
      }
    },
    [document, fieldName, setDocument, setDirty, setLoading, setMessage]
  );

  /**
   * Handle document removal
   */
  const handleRemove = useCallback(async () => {
    if (!document || document.status === "validated") {
      return;
    }

    openConfirm(`Remove ${fieldName}? This cannot be undone.`, async () => {
      setLoading((prev) => ({ ...prev, [fieldName]: true }));

      try {
        await removeDocument(fieldName);
        setDocument(null);
        setDirty((prev) => ({ ...prev, [fieldName]: false }));
        setMessage({ type: "success", text: "Document removed" });
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Remove failed",
        });
      } finally {
        setLoading((prev) => ({ ...prev, [fieldName]: false }));
      }
    });
  }, [
    document,
    fieldName,
    setDocument,
    setDirty,
    setLoading,
    setMessage,
    openConfirm,
  ]);

  return {
    handleReplace,
    handleRemove,
    isLoading: false, // Can add loading state if needed
  };
}
