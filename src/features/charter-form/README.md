# Charter Form Feature Module

This directory encapsulates the entire multi‑step charter registration & editing experience. It contains:

- **Form schemas & defaults** (`charterForm.schema.ts`, `charterForm.defaults.ts`, `charterForm.draft.ts`) – Zod validation, strongly typed defaults, and draft sanitization/hydration.
- **Components** – Presentational + rich interaction widgets (media grid, phone input, step progress, etc.).
- **Hooks** – Autosave, media preview management, responsive layout helpers.
- **Preview** – Live listing preview composition (mirrors public charter page structure) used in Review step.
- **Utilities** – Description generation, address parsing, validation helpers (`getFieldError`).
- **Analytics** – Thin event bus (`analytics.ts`) used for low‑coupling instrumentation.

## Entry Points

Import public API via the barrel:

```ts
import {
  charterFormSchema,
  createDefaultCharterFormValues,
} from "@features/charter-form";
```

## Analytics Events

| Event                   | Payload                      | When                                                      |
| ----------------------- | ---------------------------- | --------------------------------------------------------- |
| `step_view`             | `{ step, index }`            | User navigates to a step (deduped within 800ms window)    |
| `step_complete`         | `{ step, index }`            | Step successfully validated and advanced                  |
| `validation_errors`     | `{ step, count }`            | Validation failed on a step                               |
| `draft_saved`           | `{ server, version? }`       | Draft persisted to server (explicit save)                 |
| `conflict_resolution`   | `{ serverVersion }`          | Server version superseded local draft                     |
| `finalize_attempt`      | none                         | User submits final form                                   |
| `finalize_success`      | `{ charterId, ms? }`         | Finalization succeeded (duration auto-added if omitted)   |
| `media_upload_start`    | `{ kind, pending }`          | Media batch upload started                                |
| `media_upload_complete` | `{ kind, ms? }`              | Single media item finished (ms since last batch start)    |
| `lazy_component_loaded` | `{ name, ms?, group? }`      | A lazily loaded chunk finished loading                    |
| `preview_ready`         | `{ group, names, totalMs? }` | All registered lazy components for a group have completed |

Enable console logging in development:

```ts
import { enableCharterFormConsoleLogging } from "@features/charter-form/analytics";
if (process.env.NODE_ENV === "development") enableCharterFormConsoleLogging();
```

## Error Handling Strategy

- Step validation uses step-specific Zod subsets – failing fields summarized above the form.
- `getFieldError` safely traverses nested/array error structures.
- File name normalization + key normalization happens pre-finalize for consistency.

## Draft Persistence

1. Local storage snapshot (resilience / offline start).
2. Server draft (explicit saves on Next/Submit; conflict resolution via version header).
3. Finalize endpoint applies media ordering & cover logic server-side.

## Adding a New Step

1. Define a Zod slice or reuse existing schema.
2. Add a `FormStep` entry to `STEP_SEQUENCE` with field names.
3. Create a step component under `steps/` and wire it inside `FormSection` conditional render.
4. (Optional) Add tracking by emitting `step_view` within navigation logic (already generic).

## Testing

Utility tests live under `__tests__` (Vitest). Add new tests alongside new utilities.

## Future Ideas

- Split heavy components (map, gallery) into more granular dynamic imports.
- Soft perf budgets: dev console warns if a lazy chunk exceeds 1500ms load time.
- Server round‑trip validation integration (mirror Zod schema compiled to JSON for server).
- E2E flow test (Playwright) to ensure navigation + finalize happy path.

---

Maintainers: Update this README when modifying public API surface or analytics contract.
