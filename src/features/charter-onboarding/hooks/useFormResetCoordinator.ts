import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { useCallback, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

/**
 * Coordinates form.reset() calls to prevent race conditions
 *
 * Problem: Multiple async operations can trigger form.reset() simultaneously,
 * causing data to be overwritten without coordination.
 *
 * Solution:
 * - Debounce resets within 100ms window
 * - Queue concurrent resets instead of executing immediately
 * - Ensure only one reset happens at a time
 *
 * Usage:
 * ```
 * const coordinatedReset = useFormResetCoordinator(form);
 * coordinatedReset(values, 'draft-load'); // instead of form.reset(values)
 * ```
 */
export function useFormResetCoordinator(
  form: UseFormReturn<CharterFormValues>
) {
  const resetInProgressRef = useRef(false);
  const resetQueueRef = useRef<{
    values: CharterFormValues;
    source: string;
  } | null>(null);
  const lastResetTimestampRef = useRef<number>(0);

  const coordinatedReset = useCallback(
    (values: CharterFormValues, source: string) => {
      const now = Date.now();
      const timeSinceLastReset = now - lastResetTimestampRef.current;

      // Debounce: ignore resets within 100ms of last reset
      if (timeSinceLastReset < 100) {
        console.log(
          `[resetCoordinator] debounced reset from "${source}" (${timeSinceLastReset}ms since last)`
        );
        return;
      }

      // If reset in progress, queue this one
      if (resetInProgressRef.current) {
        console.log(
          `[resetCoordinator] queueing reset from "${source}" (reset in progress)`
        );
        resetQueueRef.current = { values, source };
        return;
      }

      // Execute reset
      console.log(`[resetCoordinator] executing reset from "${source}"`);
      resetInProgressRef.current = true;
      lastResetTimestampRef.current = now;

      try {
        form.reset(values, { keepDirty: false });
      } catch (error) {
        console.error(
          `[resetCoordinator] reset failed from "${source}"`,
          error
        );
      } finally {
        resetInProgressRef.current = false;

        // Process queued reset if any
        if (resetQueueRef.current) {
          const queued = resetQueueRef.current;
          resetQueueRef.current = null;

          console.log(
            `[resetCoordinator] processing queued reset from "${queued.source}"`
          );

          // Schedule with microtask to ensure state consistency
          Promise.resolve().then(() =>
            coordinatedReset(queued.values, `queued:${queued.source}`)
          );
        }
      }
    },
    [form]
  );

  return coordinatedReset;
}
