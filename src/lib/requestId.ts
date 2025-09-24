// Utility to extract the per-request ID set by middleware.
// Falls back to generating a new UUID if header missing (e.g., in tests bypassing middleware).

export function getRequestId(req: Request): string {
  const fromHeader = req.headers.get("x-request-id");
  return fromHeader && fromHeader.trim() ? fromHeader : crypto.randomUUID();
}
