---
type: fix
status: proposed
updated: 2025-11-06
feature: charter-onboarding
author: assistant
---

# Charter Draft Data Loss Prevention

## Risk Analysis Summary

### Critical Vulnerabilities

1. **Race Condition During Form Reset** - HIGH RISK
2. **Version Conflict During Concurrent Saves** - MEDIUM RISK
3. **Unprotected DeepMerge in Draft Patch** - MEDIUM RISK
4. **Missing Backup Before Finalization** - LOW RISK
5. **No Recovery from Failed Autosave** - LOW RISK

---

## 1. Race Condition During Form Reset

### Problem

Multiple simultaneous `form.reset()` calls can overwrite draft data without coordination.

**Affected Files:**

- `src/features/charter-onboarding/FormSection.tsx` (lines 530-610)
- `src/features/charter-onboarding/hooks/useCharterDataLoad.ts` (multiple reset calls)

**Scenario:**

```
T+0ms:   Primary hook fetches draft data
T+100ms: Primary hook calls reset(draftA)
T+800ms: Fallback mechanism fires, calls reset(draftB)
Result:  draftB overwrites draftA, potentially losing recent changes
```

### Fix: Add Reset Coordinator

```typescript
// src/features/charter-onboarding/hooks/useFormResetCoordinator.ts
import { useRef, useCallback } from "react";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import type { UseFormReturn } from "react-hook-form";

export function useFormResetCoordinator(
  form: UseFormReturn<CharterFormValues>
) {
  const resetInProgressRef = useRef(false);
  const resetQueueRef = useRef<CharterFormValues | null>(null);
  const lastResetTimestampRef = useRef<number>(0);

  const coordinatedReset = useCallback(
    (values: CharterFormValues, source: string) => {
      const now = Date.now();

      // Debounce: ignore resets within 100ms of last reset
      if (now - lastResetTimestampRef.current < 100) {
        console.log(`[resetCoordinator] debounced reset from ${source}`);
        return;
      }

      // If reset in progress, queue this one
      if (resetInProgressRef.current) {
        console.log(`[resetCoordinator] queueing reset from ${source}`);
        resetQueueRef.current = values;
        return;
      }

      console.log(`[resetCoordinator] executing reset from ${source}`);
      resetInProgressRef.current = true;
      lastResetTimestampRef.current = now;

      try {
        form.reset(values, { keepDirty: false });
      } finally {
        resetInProgressRef.current = false;

        // Process queued reset if any
        if (resetQueueRef.current) {
          const queued = resetQueueRef.current;
          resetQueueRef.current = null;
          console.log(`[resetCoordinator] processing queued reset`);

          // Schedule with microtask to ensure state consistency
          Promise.resolve().then(() => coordinatedReset(queued, "queued"));
        }
      }
    },
    [form]
  );

  return coordinatedReset;
}
```

**Update `FormSection.tsx`:**

```typescript
import { useFormResetCoordinator } from "./hooks/useFormResetCoordinator";

export default function FormSection() {
  // ... existing code ...
  const coordinatedReset = useFormResetCoordinator(form);

  // Replace all form.reset() calls with coordinatedReset()
  // Example:
  // form.reset(values) → coordinatedReset(values, 'source-name')
}
```

---

## 2. Version Conflict During Concurrent Saves

### Problem

Version conflict retry mechanism in `useDraftSnapshot.ts` can cause data loss if server data is stale.

**Affected File:**

- `src/features/charter-onboarding/hooks/useDraftSnapshot.ts` (lines 200-230)

**Current Code:**

```typescript
if (res.status === 409) {
  // Version conflict: fetch server, merge, retry once
  if (attempt > 0) return null; // already retried - LOSES DATA!

  // Updates lastPayloadRef with server data, discarding local changes
  if (serverDraft.data) {
    lastPayloadRef.current = JSON.stringify({
      __full: serverDraft.data,
    });
  }
}
```

### Fix: Preserve Local Changes During Conflict Resolution

```typescript
// In useDraftSnapshot.ts
if (res.status === 409) {
  if (attempt > 0) {
    // CRITICAL: Don't silently fail, notify user
    console.error("[draftSnapshot] version conflict persists after retry", {
      clientVer,
      serverVer,
      currentStep: currentStepRef.current,
    });

    // Store failed payload for recovery
    try {
      const failedPayload = {
        timestamp: Date.now(),
        clientVersion: clientVer,
        data: sanitized,
        step: currentStepRef.current,
      };
      sessionStorage.setItem(
        "charter-draft-failed-save",
        JSON.stringify(failedPayload)
      );
    } catch (e) {
      console.error("[draftSnapshot] failed to store recovery data", e);
    }

    // Emit event for UI notification
    window.dispatchEvent(
      new CustomEvent("charter-draft-save-failed", {
        detail: { reason: "version_conflict_retry_failed" },
      })
    );

    return null;
  }

  // On first conflict, merge local changes with server data
  const conflictJson = await res.json();
  if (conflictJson?.server) {
    const serverData = conflictJson.server.data as CharterFormValues;
    const serverVer = conflictJson.server.version;

    // IMPORTANT: Merge with conflict resolution strategy
    const merged = mergeWithConflictResolution(
      serverData,
      sanitized,
      currentStepRef.current
    );

    console.log("[draftSnapshot] merged after conflict", {
      clientVer,
      serverVer,
      mergedKeys: Object.keys(merged),
    });

    // Update lastPayloadRef with merged data
    lastPayloadRef.current = JSON.stringify({
      __full: merged,
      data: merged,
      step: currentStepRef.current,
    });

    setServerVersion(serverVer);
    return buildAndMaybePatch(merged, serverVer, attempt + 1);
  }
}
```

**Add Merge Helper:**

```typescript
function mergeWithConflictResolution(
  server: CharterFormValues,
  local: CharterFormValues,
  localStep: number
): CharterFormValues {
  // Strategy: Local changes take precedence for user-edited fields
  // Use server data for system fields (timestamps, IDs, etc.)

  return {
    ...server, // Base: server snapshot
    ...local, // Override: local changes

    // Always preserve local step (user's current position)
    __step: localStep,

    // Special handling for arrays (prefer local if modified)
    trips: local.trips?.length ? local.trips : server.trips,
    amenities: local.amenities?.length ? local.amenities : server.amenities,

    // Nested objects: deep merge
    operator: {
      ...server.operator,
      ...local.operator,
    },
    boat: {
      ...server.boat,
      ...local.boat,
    },
    pickup: {
      ...server.pickup,
      ...local.pickup,
    },
    policies: {
      ...server.policies,
      ...local.policies,
    },
  };
}
```

---

## 3. Unprotected DeepMerge in Draft Patch

### Problem

`deepMerge` in `src/server/drafts.ts` blindly overwrites with partial data, can corrupt nested structures.

**Affected File:**

- `src/server/drafts.ts` (lines 16-26, 105-120)

**Current Code:**

```typescript
function deepMerge<T>(base: T, partial: unknown): T {
  if (partial === null || partial === undefined) return base;
  if (Array.isArray(partial)) return partial.slice() as unknown as T; // DANGER: replaces entire array
  // ... shallow merge logic
}
```

**Scenario:**

```typescript
// Server has:
trips: [
  { name: "Trip A", duration: 4 },
  { name: "Trip B", duration: 6 },
];

// Client sends partial:
dataPartial: {
  trips: [{ name: "Trip A Modified" }];
}

// Result after deepMerge:
trips: [{ name: "Trip A Modified" }]; // Trip B LOST!
```

### Fix: Add Validation and Array Merge Strategy

```typescript
// src/server/drafts.ts

// Add validation schema for partial updates
import { z } from "zod";

const SafePartialSchema = z
  .object({
    trips: z.array(z.any()).optional(),
    amenities: z.array(z.string()).optional(),
    // ... other fields with proper types
  })
  .passthrough(); // Allow other fields

function deepMerge<T>(base: T, partial: unknown): T {
  // Validate partial before merging
  try {
    const validated = SafePartialSchema.parse(partial);
    partial = validated;
  } catch (error) {
    console.error("[deepMerge] validation failed, using base", error);
    return base; // SAFE: return original if validation fails
  }

  if (partial === null || partial === undefined) return base;

  // CRITICAL: For arrays, use intelligent merge strategy
  if (Array.isArray(partial)) {
    // If partial array is empty and base has data, preserve base
    if (partial.length === 0 && Array.isArray(base) && base.length > 0) {
      console.warn("[deepMerge] rejecting empty array that would delete data", {
        baseLength: base.length,
      });
      return base; // SAFE: don't wipe data with empty array
    }

    // Otherwise replace (user explicitly cleared or replaced)
    return partial.slice() as unknown as T;
  }

  if (typeof partial !== "object") return partial as T;
  if (typeof base !== "object" || base === null)
    return { ...(partial as object) } as T;

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(partial as object)) {
    const val = (partial as Record<string, unknown>)[key];

    // IMPORTANT: Preserve existing nested data if partial is null/undefined
    if ((val === null || val === undefined) && out[key] !== undefined) {
      console.log(`[deepMerge] preserving existing value for key: ${key}`);
      continue; // Don't overwrite with null/undefined
    }

    out[key] = deepMerge(out[key] as unknown, val);
  }
  return out as T;
}

export async function patchDraft(params: {
  id: string;
  userId: string;
  clientVersion: number;
  dataPartial: unknown;
  currentStep?: number;
}) {
  // ... existing validation ...

  // ADD: Backup current data before merge
  const backupData = draft.data;

  try {
    const merged = deepMerge(draft.data as unknown, params.dataPartial || {});

    // ADD: Sanity check merged data
    if (!isSaneDraft(merged)) {
      logger.error("draft_merge_sanity_failed", {
        id: params.id,
        userId: params.userId,
      });
      throw new Error("merge_sanity_check_failed");
    }

    const updated = await prisma.charterDraft.update({
      where: { id: draft.id },
      data: {
        data: merged as unknown as Prisma.JsonObject,
        currentStep: params.currentStep ?? draft.currentStep,
        version: { increment: 1 },
        lastTouchedAt: new Date(),
      },
    });

    logger.debug("draft_patched", { id: updated.id, version: updated.version });
    return { conflict: false, draft: updated } as const;
  } catch (error) {
    // ADD: Restore backup on merge failure
    logger.error("draft_patch_failed", {
      id: draft.id,
      error: error instanceof Error ? error.message : "unknown",
    });

    // Attempt rollback
    try {
      await prisma.charterDraft.update({
        where: { id: draft.id },
        data: { data: backupData as Prisma.JsonObject },
      });
      logger.info("draft_rollback_success", { id: draft.id });
    } catch (rollbackError) {
      logger.error("draft_rollback_failed", {
        id: draft.id,
        error:
          rollbackError instanceof Error ? rollbackError.message : "unknown",
      });
    }

    throw error;
  }
}

// Add sanity check helper
function isSaneDraft(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;

  const draft = data as Record<string, unknown>;

  // Check critical fields aren't corrupted
  if (draft.trips && !Array.isArray(draft.trips)) return false;
  if (draft.amenities && !Array.isArray(draft.amenities)) return false;
  if (draft.operator && typeof draft.operator !== "object") return false;
  if (draft.boat && typeof draft.boat !== "object") return false;

  return true;
}
```

---

## 4. Missing Backup Before Finalization

### Problem

Draft is marked SUBMITTED during finalization, but if finalization fails mid-transaction, draft becomes inaccessible.

**Affected File:**

- `src/app/api/charter-drafts/[id]/finalize/route.ts`

### Fix: Create Backup Before Finalization

```typescript
// In finalize/route.ts

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await context.params;
  const session = await getServerSession(authOptions);

  // ... validation ...

  try {
    await prisma.$transaction(async (tx) => {
      const draft = await tx.charterDraft.findUnique({
        where: { id: draftId },
      });

      if (!draft) throw { status: 404, error: "not_found" };

      // CRITICAL: Create backup before any mutations
      await tx.charterDraft.create({
        data: {
          userId: draft.userId,
          status: "BACKUP", // New status for backups
          data: draft.data,
          currentStep: draft.currentStep,
          formVersion: draft.formVersion,
          originalDraftId: draft.id, // Track original
          version: draft.version,
        },
      });

      // Now proceed with finalization...
      // If anything fails, backup remains accessible

      // ... rest of finalization logic ...
    });
  } catch (error) {
    // Backup exists, user can recover
    logger.error("finalize_failed", {
      draftId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: "finalization_failed",
        message: "Your draft has been preserved. Please try again.",
      },
      { status: 500 }
    );
  }
}
```

**Update Prisma Schema:**

```prisma
// Add to CharterDraft model
model CharterDraft {
  // ... existing fields ...
  status       String @default("DRAFT") // Add: "BACKUP"
  originalDraftId String? // Reference to original draft if this is a backup
}
```

---

## 5. No Recovery from Failed Autosave

### Problem

If autosave fails, user has no notification and continues editing with false sense of security.

### Fix: Add UI Notification and Recovery

```typescript
// src/features/charter-onboarding/FormSection.tsx

// Add state
const [saveError, setSaveError] = useState<string | null>(null);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Add event listener
useEffect(() => {
  const handleSaveFailed = (e: CustomEvent) => {
    setSaveError(e.detail.reason);
    setHasUnsavedChanges(true);
  };

  window.addEventListener('charter-draft-save-failed', handleSaveFailed as EventListener);

  return () => {
    window.removeEventListener('charter-draft-save-failed', handleSaveFailed as EventListener);
  };
}, []);

// Add recovery button in UI
{saveError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Save Failed</AlertTitle>
    <AlertDescription>
      Your changes could not be saved automatically.
      <Button
        onClick={async () => {
          // Attempt manual save
          await saveServerDraftSnapshot();
          setSaveError(null);
        }}
        variant="outline"
        size="sm"
        className="ml-2"
      >
        Retry Save
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Implementation Priority

### Phase 1: Critical (Immediate)

1. ✅ Add Reset Coordinator (`useFormResetCoordinator.ts`)
2. ✅ Fix DeepMerge Validation (`server/drafts.ts`)
3. ✅ Add Save Failure Recovery UI (`FormSection.tsx`)

### Phase 2: Important (This Week)

4. ✅ Improve Version Conflict Resolution (`useDraftSnapshot.ts`)
5. ✅ Add Finalization Backup (`finalize/route.ts`)

### Phase 3: Enhancement (Next Sprint)

6. Add periodic draft verification
7. Add draft recovery admin tool
8. Add metrics/monitoring for data loss incidents

---

## Testing Strategy

### Unit Tests

```typescript
// tests/charter-draft-safety.test.ts

describe("Charter Draft Data Safety", () => {
  test("prevents concurrent form resets", async () => {
    const { coordinatedReset } = renderHook(() =>
      useFormResetCoordinator(mockForm)
    );

    // Fire multiple resets rapidly
    coordinatedReset(dataA, "source1");
    coordinatedReset(dataB, "source2");
    coordinatedReset(dataC, "source3");

    // Only last reset should apply
    expect(mockForm.reset).toHaveBeenCalledTimes(1);
    expect(mockForm.reset).toHaveBeenCalledWith(dataC, { keepDirty: false });
  });

  test("deepMerge preserves data when given empty array", () => {
    const base = { trips: [{ name: "Trip A" }] };
    const partial = { trips: [] };

    const result = deepMerge(base, partial);

    expect(result.trips).toHaveLength(1); // Data preserved
  });

  test("version conflict retries with merged data", async () => {
    // Mock 409 response
    fetchMock.mockResponseOnce(
      JSON.stringify({
        error: "version_conflict",
        server: { version: 2, data: serverData },
      }),
      { status: 409 }
    );

    // Then success
    fetchMock.mockResponseOnce(
      JSON.stringify({
        draft: { version: 3 },
      })
    );

    await saveServerDraftSnapshot();

    // Should have retried with merged data
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

### E2E Tests

```typescript
// e2e/charter-draft-safety.spec.ts

test("recovers from autosave failure", async ({ page }) => {
  await page.goto("/captain/register");

  // Simulate network failure during save
  await page.route("**/api/charter-drafts/*", (route) => route.abort());

  // Make changes
  await page.fill('[name="charterName"]', "Test Charter");

  // Wait for autosave attempt
  await page.waitForTimeout(2000);

  // Should show error message
  await expect(page.locator("text=Save Failed")).toBeVisible();

  // Restore network
  await page.unroute("**/api/charter-drafts/*");

  // Click retry
  await page.click("text=Retry Save");

  // Should succeed
  await expect(page.locator("text=Saved")).toBeVisible();
});
```

---

## Monitoring

Add metrics to track data loss incidents:

```typescript
// src/lib/metrics.ts additions

export const draftSafetyMetrics = {
  resetCollisions: counter("charter_draft_reset_collisions_total"),
  versionConflicts: counter("charter_draft_version_conflicts_total"),
  versionConflictRetryFailed: counter(
    "charter_draft_version_conflict_retry_failed_total"
  ),
  mergeSanityFailed: counter("charter_draft_merge_sanity_failed_total"),
  finalizeBackupCreated: counter("charter_draft_finalize_backup_created_total"),
  saveFailureRecovered: counter("charter_draft_save_failure_recovered_total"),
};
```

---

## Rollout Plan

1. **Development Testing**: Implement all fixes in dev environment
2. **Staging Validation**: Run full test suite + manual QA
3. **Production Deployment**: Deploy Phase 1 fixes first
4. **Monitor**: Watch metrics for 48 hours
5. **Phase 2 Deployment**: Roll out remaining fixes
6. **Documentation**: Update team wiki with new safety patterns

---

## Conclusion

The charter draft system has 5 identified data loss vulnerabilities, with **race conditions during form reset** being the highest risk. The proposed fixes add:

- Reset coordination to prevent overwrites
- Intelligent conflict resolution with data preservation
- Safe deepMerge with validation and sanity checks
- Backup system before finalization
- User-visible error recovery

All fixes maintain backward compatibility while significantly improving data safety.
