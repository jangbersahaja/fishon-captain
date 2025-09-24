export function shallowDiff<T extends Record<string, unknown>>(
  prev: T | undefined,
  next: T
): Partial<T> {
  if (!prev) return next;
  const diff: Partial<T> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (prev[k] !== next[k]) (diff as Record<string, unknown>)[k] = next[k];
  }
  return diff;
}
