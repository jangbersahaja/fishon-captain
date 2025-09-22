export function formatTimestamp(iso: string | null) {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function getFieldError(
  errors: Record<string, unknown>,
  path: string | undefined
): string | undefined {
  if (!path) return undefined;
  const segments = path.split(".");
  let current: unknown = errors;
  for (const segment of segments) {
    if (!current) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  if (current && typeof (current as { message?: string }).message === "string") {
    return (current as { message?: string }).message;
  }
  return undefined;
}
