# Investigation: Charter Draft Saving System

**Date**: 2025-11-06  
**Status**: Critical Issues Found  
**Investigator**: Code Analysis

---

## Executive Summary

After thorough code investigation, the charter draft saving system has **MAJOR RELIABILITY ISSUES**:

1. ❌ **NO AUTOMATIC PERIODIC AUTOSAVE** - Draft only saves on specific triggers
2. ❌ **SILENT FAILURES** - Save errors are swallowed without user notification
3. ❌ **DANGEROUS DEEPMERGE** - Can delete entire arrays accidentally
4. ❌ **NO DEBOUNCING** - Can cause version conflicts from rapid changes
5. ❌ **FULL SNAPSHOT ALWAYS** - Sends entire form data every time (inefficient)

---

## How Draft Saving Actually Works (Current System)

### 1. **Save Triggers (When Draft is Saved)**

The draft is **NOT** saved automatically on every change. It's only saved when:

#### ✅ **Trigger A: Step Change** (Most Reliable)

```typescript
// FormSection.tsx line 220-227
useEffect(() => {
  if (isEditing) return;
  draftSnapshot.setCurrentStep(currentStep);
  // ...
}, [currentStep, draftSnapshot, isEditing]);
```

**When**: User clicks Next/Previous button  
**What**: Saves full form state + new currentStep  
**Reliability**: ✅ High

---

#### ✅ **Trigger B: First Dirty Change** (One-Time Only)

```typescript
// FormSection.tsx line 267-277
useEffect(() => {
  if (
    initialDirtySaved || // Already saved once
    isEditing || // Not in edit mode
    !isDirty || // Form not dirty
    !serverDraftId || // No draft ID
    !draftSnapshot.saveServerDraftSnapshotRef?.current
  )
    return;

  draftSnapshot.saveServerDraftSnapshotRef
    .current()
    .then(() => setInitialDirtySaved(true));
}, [initialDirtySaved, isEditing, isDirty, serverDraftId, draftSnapshot]);
```

**When**: First time user edits ANY field  
**What**: Saves initial changes  
**Problem**: ⚠️ **ONLY SAVES ONCE!** After this, no more saves until step change!  
**Reliability**: ❌ Low - User can make 100 more changes and they won't be saved until next step

---

#### ✅ **Trigger C: Media Changes** (Photo/Video Upload)

```typescript
// FormSection.tsx line 397-425
useEffect(() => {
  if (isEditing) return;
  if (!serverDraftId) return;

  const sig = JSON.stringify({
    images: existingImages.map((m) => m.name),
    videos: existingVideos.map((m) => m.name),
  });

  if (sig === lastMediaSignatureRef.current) return;
  lastMediaSignatureRef.current = sig;

  if (existingImages.length === 0 && existingVideos.length === 0) return;

  const timer = setTimeout(() => {
    draftSnapshot
      .saveServerDraftSnapshot()
      .then(() => {
        // Success logged but no UI feedback
      })
      .catch(() => {}); // ❌ ERROR SILENTLY SWALLOWED!
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [existingImages, existingVideos, isEditing, serverDraftId, draftSnapshot]);
```

**When**: User adds/removes photos or videos  
**What**: Saves after 500ms delay  
**Problem**: ⚠️ **Silent failure** - `.catch(() => {})` swallows all errors!  
**Reliability**: ⚠️ Medium - Works but fails silently

---

#### ✅ **Trigger D: Avatar Upload** (Immediate)

```typescript
// FormSection.tsx line 143-146
onAvatarUploaded: (url) => {
  console.log("[form] avatar uploaded, saving draft", { url });
  draftSnapshot.saveServerDraftSnapshot();
};
```

**When**: Avatar finishes uploading  
**What**: Immediate save (no debounce)  
**Reliability**: ✅ High

---

#### ✅ **Trigger E: Initial Server Sync** (One-Time)

```typescript
// FormSection.tsx line 243-251
useEffect(() => {
  if (initialServerSyncRef.current) return;
  if (!serverDraftId || serverVersion === null || isEditing) return;
  initialServerSyncRef.current = true;
  draftSnapshot.saveServerDraftSnapshot();
}, [serverDraftId, serverVersion, isEditing, draftSnapshot]);
```

**When**: Draft ID and version are first available  
**What**: Establishes baseline  
**Reliability**: ✅ High

---

### 2. **What Gets Saved (Data Sanitization)**

The `sanitizeForDraft` function determines what data is persisted:

```typescript
// charterForm.draft.ts lines 8-36
export function sanitizeForDraft(values: CharterFormValues) {
  const {
    photos: _photos, // ❌ EXCLUDED - File objects too large
    videos: _videos, // ❌ EXCLUDED - File objects too large
    uploadedPhotos, // ✅ SAVED - Array of {name, url}
    uploadedVideos, // ✅ SAVED - Array of {name, url, thumbnailUrl}
    operator,
    ...rest // ✅ SAVED - All other form fields
  } = values;

  const { avatar: _avatar, avatarUrl, ...operatorRest } = operator ?? {};

  return {
    ...rest, // All root fields
    operator: {
      ...operatorRest,
      avatarUrl, // Avatar URL (not File)
      backupPhone: operator?.backupPhone || "",
    },
    uploadedPhotos: [...(uploadedPhotos || [])], // Photo metadata
    uploadedVideos: [...(uploadedVideos || [])], // Video metadata
    trips: (values.trips ?? []).map((trip) => ({ ...trip })),
    boat: { ...values.boat },
    pickup: { ...values.pickup },
    policies: { ...values.policies },
  };
}
```

**What's Saved**:

- ✅ Charter name, type, location, description
- ✅ Operator info (name, phone, bio, experience, avatarUrl)
- ✅ Boat details (name, type, length, capacity, features)
- ✅ All trips (name, duration, price, max anglers, etc.)
- ✅ Pickup info (available, fee, areas, notes)
- ✅ Policies (licenses, catch rules, child-friendly)
- ✅ Amenities, species, techniques
- ✅ uploadedPhotos metadata (name, url, charterMediaId)
- ✅ uploadedVideos metadata (name, url, thumbnailUrl, durationSeconds)

**What's NOT Saved**:

- ❌ Raw File objects (photos, videos, avatar)
- ❌ Preview URLs generated from File objects

---

## 3. **The Save Process (Step by Step)**

### **Client Side (`useDraftSnapshot.ts`)**

```typescript
// Step 1: Get current form values
const sanitized = sanitizeForDraft(form.getValues());

// Step 2: Check if data has changed since last save
const currentSignature = JSON.stringify({
  data: sanitized,
  step: currentStepRef.current,
});

if (lastPayloadRef.current && lastPayloadRef.current === currentSignature) {
  // ✅ OPTIMIZATION: Skip if nothing changed
  return serverVersion ?? null;
}

// Step 3: Build payload
const payloadObj = {
  dataPartial: sanitized, // ⚠️ ALWAYS FULL SNAPSHOT (misleading name!)
  clientVersion: clientVer, // For optimistic locking
  currentStep: stepBeingSaved,
};

// Step 4: Send PATCH request
const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payloadObj),
});

// Step 5: Handle response
if (res.status === 409) {
  // Version conflict - retry once with server version
  // ⚠️ DANGER: Only retries once, then gives up silently!
}

if (res.ok) {
  const json = await res.json();
  const newVersion = json.draft.version;

  // Update local state
  lastSavedStepRef.current = stepBeingSaved;
  setServerVersion(newVersion);
  setLastSavedAt(new Date().toISOString());
  lastPayloadRef.current = JSON.stringify({
    data: sanitized,
    step: stepBeingSaved,
  });
}
```

---

### **Server Side (`server/drafts.ts`)**

```typescript
export async function patchDraft(params: {
  id: string;
  userId: string;
  clientVersion: number;
  dataPartial: unknown; // ⚠️ Misleading name - it's always full!
  currentStep?: number;
}) {
  // Step 1: Fetch current draft
  const draft = await prisma.charterDraft.findUnique({
    where: { id: params.id },
  });

  // Step 2: Check version for optimistic locking
  if (draft.version !== params.clientVersion) {
    return { conflict: true, server: draft }; // 409 response
  }

  // Step 3: ⚠️ DANGEROUS MERGE
  const merged = deepMerge(draft.data as unknown, params.dataPartial || {});

  // Step 4: Update database
  const updated = await prisma.charterDraft.update({
    where: { id: draft.id },
    data: {
      data: merged as unknown as Prisma.JsonObject,
      currentStep: params.currentStep ?? draft.currentStep,
      version: { increment: 1 }, // Increment for next request
      lastTouchedAt: new Date(),
    },
  });

  return { conflict: false, draft: updated };
}
```

---

### **The Dangerous `deepMerge` Function**

```typescript
function deepMerge<T>(base: T, partial: unknown): T {
  if (partial === null || partial === undefined) return base;

  // ⚠️ DANGER: Arrays are REPLACED entirely, not merged!
  if (Array.isArray(partial)) return partial.slice() as unknown as T;

  if (typeof partial !== "object") return partial as T;
  if (typeof base !== "object" || base === null)
    return { ...(partial as object) } as T;

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(partial as object)) {
    const val = (partial as Record<string, unknown>)[key];
    out[key] = deepMerge(out[key] as unknown, val);
  }
  return out as T;
}
```

**Critical Problem Example**:

```typescript
// Server has:
{
  trips: [
    { name: "Half Day", duration: 4, price: 500 },
    { name: "Full Day", duration: 8, price: 900 },
  ];
}

// Client sends "partial" (but it's actually full):
{
  trips: [{ name: "Half Day", duration: 4, price: 500 }];
}

// After deepMerge:
{
  trips: [{ name: "Half Day", duration: 4, price: 500 }];
}
// ❌ FULL DAY TRIP DELETED!
```

**Why This Happens**:

- Client sends full snapshot (not actually partial)
- deepMerge sees arrays and REPLACES them entirely
- If client snapshot is stale or incomplete, data is lost

---

## 4. **Critical Failure Scenarios**

### **Scenario A: User Edits Fields Between Steps**

```
T+0s:   User on Step 1, fills "Charter Name"
        → Trigger B fires (first dirty) → Draft saved ✅

T+30s:  User continues editing Step 1
        - Adds charter type
        - Adds location
        - Adds description
        → NO SAVES TRIGGERED! ❌

T+60s:  Browser crashes / User closes tab
        → Charter name saved ✅
        → Charter type, location, description LOST! ❌
```

**Root Cause**: No continuous autosave between steps

---

### **Scenario B: Rapid Step Navigation**

```
T+0s:   User on Step 1, clicks Next
        → setCurrentStep(1) → saveServerDraftSnapshot() called
        → Request 1 starts (version 5)

T+0.5s: User immediately clicks Next again
        → setCurrentStep(2) → saveServerDraftSnapshot() called
        → inFlightRef.current exists, returns same promise
        → Request 1 still processing

T+1s:   Request 1 completes, version now 6
        → lastSavedStepRef = 1 (but user is on step 2!)

T+1.5s: Follow-up save triggers for step 2
        → Request 2 starts with version 6
        → Saves step 2 correctly ✅

Result: Works, but timing-dependent
```

**Root Cause**: Complex chaining logic prone to race conditions

---

### **Scenario C: Version Conflict Loop**

```
T+0s:   Tab A: User saves draft (version 5 → 6)
T+1s:   Tab B: User saves draft (has version 5)
        → Server returns 409 conflict
        → Client fetches server draft (version 6)
        → Retries with version 6

T+1.5s: Tab A: User saves again (version 6 → 7)
T+2s:   Tab B: Retry arrives at server (expects version 6, now 7)
        → Server returns 409 conflict AGAIN
        → Client gives up (attempt > 0) ❌
        → Returns null silently
        → User's changes LOST! ❌
```

**Root Cause**: Only retries once, then fails silently

---

### **Scenario D: Array Data Loss**

```
Server has:
trips: [Trip A, Trip B, Trip C]

User's form state somehow gets corrupted or partially loaded:
trips: [Trip A, Trip B]

User makes unrelated change (e.g., edits charter name)
→ Save triggered
→ sanitizeForDraft() captures: trips: [Trip A, Trip B]
→ Server deepMerge REPLACES trips array
→ Trip C DELETED FOREVER! ❌
```

**Root Cause**:

- deepMerge replaces arrays entirely
- No validation that array is complete
- No backup before destructive merge

---

### **Scenario E: Media Upload Failure Silent**

```
T+0s:   User uploads 5 photos
T+2s:   Photo upload completes
        → Media autosave trigger fires (500ms debounce)

T+2.5s: saveServerDraftSnapshot() called
        → Fetch fails (network error / 500 / 409)
        → .catch(() => {}) swallows error ❌
        → No UI notification
        → User thinks photos are saved!

T+10s:  User clicks "Next"
        → Step change save succeeds
        → Photos ARE in uploadedPhotos array (in memory)
        → Photos saved now ✅

BUT if browser crashes before step change:
        → Photos LOST! ❌
```

**Root Cause**: Silent error handling with no user feedback

---

## 5. **Why Data Loss Happens (Root Causes)**

### **Problem 1: No Continuous Autosave**

**Expected Behavior**:

- Draft should save every 5-10 seconds if form has changes

**Actual Behavior**:

- Draft only saves on specific triggers (step change, first dirty, media)
- Long gaps between saves = data loss window

**Impact**: 🔴 HIGH

---

### **Problem 2: Silent Failure Handling**

**Code**:

```typescript
.catch(() => {})  // Swallows ALL errors
```

**Impact**: User has no idea their work isn't being saved  
**Severity**: 🔴 CRITICAL

---

### **Problem 3: Dangerous Array Replacement**

**Code**:

```typescript
if (Array.isArray(partial)) return partial.slice() as unknown as T;
```

**Impact**: Entire arrays can be wiped out  
**Severity**: 🔴 CRITICAL

---

### **Problem 4: Single Retry on Conflict**

**Code**:

```typescript
if (attempt > 0) return null; // Give up after 1 retry
```

**Impact**: Multi-tab editing causes data loss  
**Severity**: 🟡 MEDIUM

---

### **Problem 5: No Data Validation**

**Missing**:

- No check that trips array has all trips before saving
- No check that required fields are present
- No sanity validation before merge

**Impact**: Corrupted state can be persisted  
**Severity**: 🟡 MEDIUM

---

### **Problem 6: Misleading Variable Names**

**Code**:

```typescript
dataPartial: sanitized; // ⚠️ It's actually the FULL form state!
```

**Impact**: Developer confusion, incorrect assumptions  
**Severity**: 🟢 LOW (but contributes to bugs)

---

## 6. **Comparison: Expected vs Actual**

| Feature                 | Expected             | Actual               | Status          |
| ----------------------- | -------------------- | -------------------- | --------------- |
| **Autosave Frequency**  | Every 5-10 seconds   | Only on triggers     | ❌ MISSING      |
| **Error Notification**  | Show toast to user   | Silent failure       | ❌ BROKEN       |
| **Array Merge**         | Intelligent merge    | Complete replacement | ❌ DANGEROUS    |
| **Conflict Retry**      | Retry 3-5 times      | Retry once, give up  | ❌ INSUFFICIENT |
| **Data Validation**     | Validate before save | None                 | ❌ MISSING      |
| **Recovery UI**         | "Retry Save" button  | Nothing              | ❌ MISSING      |
| **Backup Before Merge** | Keep backup          | Overwrite directly   | ❌ MISSING      |
| **Draft Versioning**    | Keep history         | Single version       | ❌ MISSING      |

---

## 7. **Evidence from Code**

### **No Continuous Autosave**

```typescript
// ❌ MISSING: No useEffect watching form values with debounce
// Expected:
// useEffect(() => {
//   const timer = setTimeout(() => {
//     if (isDirty) saveServerDraftSnapshot();
//   }, 5000);
//   return () => clearTimeout(timer);
// }, [formValues, isDirty]);
```

### **Silent Errors**

```typescript
// FormSection.tsx line 421
.catch(() => {});  // ❌ All errors swallowed

// useDraftSnapshot.ts line 186
try {
  return await buildAndMaybePatch(previousFull, effectiveVersion, 0);
} catch {
  return null;  // ❌ Errors swallowed
}
```

### **Dangerous Merge**

```typescript
// server/drafts.ts line 17
if (Array.isArray(partial)) return partial.slice() as unknown as T;
// ❌ Entire array replaced, no merge
```

### **Single Retry**

```typescript
// useDraftSnapshot.ts line 213
if (attempt > 0) return null; // ❌ Give up after 1 retry
```

---

## 8. **Data Flow Diagram**

```
USER EDITS FORM
       ↓
   TRIGGER?
       ↓
   ┌───────────────────────────────────┐
   │ ✅ Step Change                    │ → Save immediately
   │ ✅ First Dirty (once)             │ → Save once only
   │ ✅ Media Upload (500ms debounce)  │ → Save after delay
   │ ✅ Avatar Upload                  │ → Save immediately
   │ ❌ Any Other Edit                 │ → NO SAVE!
   └───────────────────────────────────┘
       ↓
 sanitizeForDraft(form.getValues())
       ↓
 Build FULL snapshot (not partial!)
       ↓
 PATCH /api/charter-drafts/:id
   {
     dataPartial: {...},  ← Full data!
     clientVersion: N,
     currentStep: X
   }
       ↓
   SERVER
       ↓
 Check version === clientVersion?
   ├─ NO → Return 409 conflict
   │         ↓
   │    Retry once with server version
   │         ↓
   │    Still conflict? → Give up silently ❌
   │
   └─ YES → deepMerge(serverData, clientData)
                ↓
          ⚠️ DANGER: Arrays replaced entirely
                ↓
          Update database
                ↓
          Return {draft: {...}, version: N+1}
```

---

## 9. **Why This System is "Too Rigid and Not Reliable"**

### **Rigid:**

1. ✅ Must wait for specific triggers (can't save whenever needed)
2. ✅ First dirty saves once, then never again until step change
3. ✅ No manual "Save Draft" button for user control
4. ✅ Edit mode completely bypasses draft system

### **Not Reliable:**

1. ❌ Silent failures everywhere
2. ❌ No recovery mechanism
3. ❌ Arrays can be deleted accidentally
4. ❌ Version conflicts only retry once
5. ❌ Long gaps between saves (data loss window)
6. ❌ No validation before destructive operations
7. ❌ No backups before merging

---

## 10. **Recommended Fixes (Priority Order)**

### **P0 - Critical (Fix Immediately)**

1. **Add Silent Failure Notifications**

   ```typescript
   .catch((error) => {
     // Store in sessionStorage for recovery
     sessionStorage.setItem('charter-draft-failed', JSON.stringify({
       timestamp: Date.now(),
       data: sanitized,
       error: error.message,
     }));

     // Show toast notification
     toast.error('Failed to save draft. Your changes are stored locally.');

     // Emit event for UI
     window.dispatchEvent(new CustomEvent('charter-draft-save-failed'));
   });
   ```

2. **Fix Array Merge Logic**

   ```typescript
   function safeDeepMerge<T>(base: T, partial: unknown): T {
     // Add validation
     if (Array.isArray(partial)) {
       // Don't replace with empty array if base has data
       if (partial.length === 0 && Array.isArray(base) && base.length > 0) {
         console.warn("Rejecting empty array that would delete data");
         return base;
       }
       return partial.slice() as unknown as T;
     }
     // ... rest of merge logic with validation
   }
   ```

3. **Add Recovery UI**

   ```typescript
   // Show banner when save fails
   {saveError && (
     <Alert variant="destructive">
       <AlertTitle>Unable to Save Draft</AlertTitle>
       <AlertDescription>
         <Button onClick={retryManualSave}>Retry Save</Button>
       </AlertDescription>
     </Alert>
   )}
   ```

---

### **P1 - High (Fix This Week)**

4. **Add Continuous Autosave**

   ```typescript
   useEffect(() => {
     if (isEditing || !serverDraftId) return;

     const timer = setTimeout(() => {
       if (isDirty) {
         saveServerDraftSnapshot().catch(handleSaveError);
       }
     }, 10000); // Every 10 seconds

     return () => clearTimeout(timer);
   }, [formValues, isDirty, isEditing, serverDraftId]);
   ```

5. **Increase Retry Attempts**

   ```typescript
   const MAX_RETRY_ATTEMPTS = 3;
   if (attempt >= MAX_RETRY_ATTEMPTS) {
     // Store for recovery instead of giving up
     return null;
   }
   ```

6. **Add Data Validation**

   ```typescript
   function validateDraftBeforeSave(data: DraftValues): boolean {
     // Check trips array has content
     if (!data.trips || data.trips.length === 0) {
       console.error("Draft has no trips!");
       return false;
     }
     // Check required fields
     // ...
     return true;
   }
   ```

---

### **P2 - Medium (Next Sprint)**

7. **Add Backup System**

   ```typescript
   // Before destructive merge
   await prisma.charterDraft.create({
     data: {
       ...draft,
       status: "BACKUP",
       originalDraftId: draft.id,
     },
   });
   ```

8. **Add Manual Save Button**

   ```typescript
   <Button onClick={() => saveServerDraftSnapshot()}>
     Save Draft Now
   </Button>
   ```

9. **Add Draft History**
   - Keep last 5 versions
   - Allow rollback to previous version

---

## 11. **Testing Checklist**

To verify data loss scenarios:

- [ ] Edit multiple fields on one step, close browser before clicking Next
- [ ] Upload photos, close browser before debounce completes
- [ ] Edit in two tabs simultaneously
- [ ] Disconnect network during save
- [ ] Add 3 trips, edit charter name, verify all 3 trips still exist
- [ ] Delete a trip, verify it's actually deleted and not restored
- [ ] Make changes without triggering saves, check what's persisted

---

## Conclusion

The current draft saving system is **fundamentally unreliable** due to:

1. ❌ No continuous autosave (only trigger-based)
2. ❌ Silent failures everywhere
3. ❌ Dangerous array replacement logic
4. ❌ Insufficient retry mechanism
5. ❌ No validation or safety checks

**Data loss is not accidental - it's inevitable** with this design.

**Immediate Action Required**:

1. Add error notifications (P0)
2. Fix array merge (P0)
3. Add recovery UI (P0)
4. Implement continuous autosave (P1)

**Long-term**: Complete redesign with proper autosave, validation, and recovery mechanisms.
