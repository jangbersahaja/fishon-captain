/**
 * API client for captain documents endpoints
 * Centralizes all document-related API calls
 */

export class DocumentsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "DocumentsApiError";
  }
}

/**
 * Fetch all documents for the current captain
 */
export async function fetchDocuments() {
  const res = await fetch("/api/captain/documents", { method: "GET" });
  if (!res.ok) {
    throw new DocumentsApiError("Failed to fetch documents", res.status);
  }
  return res.json();
}

/**
 * Remove a document by field name
 */
export async function removeDocument(field: string): Promise<void> {
  const res = await fetch("/api/captain/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remove: field }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Remove failed" }));
    throw new DocumentsApiError(
      error.error || "Failed to remove document",
      res.status,
      error
    );
  }
}

/**
 * Submit a document for verification
 */
export async function submitDocument(field: string): Promise<void> {
  const res = await fetch("/api/captain/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submit: field }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Submit failed" }));
    throw new DocumentsApiError(
      error.error || "Failed to submit document",
      res.status,
      error
    );
  }
}

/**
 * Submit government ID documents (both front and back)
 */
export async function submitGovernmentId(): Promise<void> {
  const res = await fetch("/api/captain/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submitGovtId: true }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Submit failed" }));
    throw new DocumentsApiError(
      error.error || "Failed to submit government ID",
      res.status,
      error
    );
  }
}

/**
 * Save banking information
 */
export async function saveBankingInfo(data: {
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankSwiftCode?: string;
  bankBranch?: string;
}): Promise<void> {
  const res = await fetch("/api/captain/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ banking: data }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Save failed" }));
    throw new DocumentsApiError(
      error.error || "Failed to save banking information",
      res.status,
      error
    );
  }
}
