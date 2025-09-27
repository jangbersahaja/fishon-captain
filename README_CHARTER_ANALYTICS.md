# Charter Form Analytics

Lightweight client-side instrumentation for the charter onboarding flow lives in `src/features/charter-onboarding/analytics.ts`.

Events are intentionally framework-agnostic JSON objects emitted through `emitCharterFormEvent(event)` so they can later be forwarded to your analytics pipeline (PostHog, Segment, etc.) by registering a listener with `setCharterFormAnalyticsListener`.

## Event Types

| Event                   | When Emitted                                                 | Important Fields                                                    |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `step_view`             | A step becomes active (debounced)                            | `step`, `index`                                                     |
| `step_complete`         | A step passes validation & user advances                     | `step`, `index`                                                     |
| `draft_saved`           | Server draft snapshot persisted                              | `server` (bool), `version`                                          |
| `finalize_attempt`      | User initiates submission (before network finalize response) | `images`, `videos`, `trips` (counts)                                |
| `finalize_success`      | Finalize endpoint returns OK (charter created/updated)       | `charterId`, latency `ms` auto-derived, `images`, `videos`, `trips` |
| `validation_errors`     | Validation blocking navigation                               | `step`, `count`                                                     |
| `media_upload_start`    | Batch of media files begins uploading                        | `kind`, `pending`                                                   |
| `media_upload_complete` | Single media file finished uploading                         | `kind`, timing `ms` auto-attached                                   |
| `media_batch_complete`  | All files in a started batch uploaded                        | `kind`, `count`, total `ms`                                         |
| `conflict_resolution`   | Version conflict (server vs client draft) handled            | `serverVersion`                                                     |
| `lazy_component_loaded` | A lazily loaded component finished                           | `name`, `group?`, `ms?` (duration)                                  |
| `preview_ready`         | All components in a lazy group loaded                        | `group`, `names[]`, `totalMs`                                       |

## Newly Added Fields (Sept 2025)

The submission flow now enriches finalize events with media + trips counts:

- `finalize_attempt.images` / `.videos` / `.trips`
- `finalize_success.images` / `.videos` / `.trips`

These reflect the payload counts actually sent (after merging pre-uploaded media and any in-form files). They are useful for:

1. Funnel analysis (drop-off correlated with large media sets)
2. Monitoring payload size trends
3. Segmenting latency by media volume (correlate `ms` with `images`/`videos`)

## Latency Measurement

Latency for finalize is derived automatically: the timestamp of `finalize_attempt` is captured internally and the delta until `finalize_success` is assigned to `ms` if not already provided.

## Cover Image Index

The finalize payload now sets `imagesCoverIndex: 0`. This allows future UX changes (letting users pick a cover) without a breaking API change. When a UI control is added, simply update this index before submission.

## Usage Pattern

```ts
import { setCharterFormAnalyticsListener } from "@features/charter-onboarding/analytics";

setCharterFormAnalyticsListener((e) => {
  // Forward to analytics backend
  window.posthog?.capture("charter_form_event", e);
});
```

## Debugging

Enable verbose console logging by setting environment variable:

```bash
NEXT_PUBLIC_CHARTER_FORM_DEBUG=1
```

This auto-enables a listener that logs all events with the `[charter-form:event]` prefix.

## Reliability & Dedupe Notes

- `step_view` events are deduped for 800ms to avoid noise during quick rerenders.
- Media batch tracking automatically emits a summary `media_batch_complete` when all pending uploads from the corresponding `media_upload_start` have finished.
- Finalize latency resets if a second attempt is made before success.

## Extending Events

Add a new union member to `AnalyticsEvent` in `analytics.ts` and emit via `emitCharterFormEvent`. Keep payloads shallow and serializable; avoid passing large objects (strip large form values or blob URLs).

## Testing Utilities

`__resetCharterFormAnalyticsForTests()` can be imported in tests to clear internal state (dedupe caches, timers) between assertions.

Example:

```ts
import { __resetCharterFormAnalyticsForTests } from "@features/charter-onboarding/analytics";

beforeEach(() => __resetCharterFormAnalyticsForTests());
```

## Potential Future Enhancements

- Hook into a global error boundary to emit a `form_crash` event with minimal metadata.
- Add percentile aggregation (client-side) for finalize latency when offline caching is introduced.
- Introduce anonymous session id for multi-tab attribution.

---

Last updated: 2025-09-27
