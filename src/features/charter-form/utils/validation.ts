// Extract a nested error message from a react-hook-form error object shape
// Supports dot paths and array indices (e.g. trips[0].price)
export function getFieldError(
  errors: Record<string, unknown>,
  path?: string
): string | undefined {
  if (!path) return undefined;
  const segments = normalizePath(path);
  let current: unknown = errors;
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return undefined;
    // Narrow step-by-step
    const container = current as Record<string | number, unknown>;
    current = container[seg as string | number];
  }
  if (!current) return undefined;
  if (
    typeof current === "object" &&
    current !== null &&
    "message" in current &&
    typeof (current as { message?: unknown }).message === "string"
  ) {
    return (current as { message: string }).message;
  }
  if (typeof current === "string") return current;
  return undefined;
}

function normalizePath(path: string): (string | number)[] {
  // Convert trips[0].price => ["trips", 0, "price"]
  const parts: (string | number)[] = [];
  path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .forEach((p) => {
      if (!p) return;
      const num = Number(p);
      if (Number.isInteger(num) && String(num) === p) parts.push(num);
      else parts.push(p);
    });
  return parts;
}