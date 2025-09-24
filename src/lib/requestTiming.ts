import { logger } from "@/lib/logger";

export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    logger.debug("request_timing", {
      name,
      ms: +(performance.now() - start).toFixed(2),
    });
    return result;
  } catch (e) {
    logger.error("request_timing_error", {
      name,
      ms: +(performance.now() - start).toFixed(2),
      error: (e as Error).message,
    });
    throw e;
  }
}
