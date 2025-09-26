# Contributing Guidelines (Feature Modules)

This repository is migrating toward feature-scoped modules collocating client + server + tests.

## Charter Form Pattern

```text
features/charter-onboarding/
  server/        # validation, mapping, (future) diff utilities
  __tests__/     # fast, focused unit tests (avoid end-to-end here)
  steps/         # multi-step UI components
  utils/         # pure helpers (validation traversal, formatting)
  analytics.ts   # lightweight event bus (no external dependency)
```

### Principles

1. Keep server logic that is purely domain-specific inside the feature (`server/`).
2. Keep cross-feature infrastructure (Prisma client, auth) in shared `lib/`.
3. Prefer narrow unit tests in `__tests__` over broad integration unless exercising interactions.
4. Use environment-driven flags (e.g. `NEXT_PUBLIC_CHARTER_FORM_DEBUG`) for optional dev-only diagnostics.
5. Avoid importing from `src/server/*` when a feature-export exists; migrate callers gradually.

### Adding a New Utility

1. Create it under `features/charter-onboarding/utils/`.
2. Export a pure function; avoid side effects on import.
3. Add a matching `*.test.ts` colocated under `__tests__` (mock external deps if needed).

### Validation Additions

When adding new finalization requirements, update `validation.ts` and extend `validation.test.ts` with:

```ts
// Example: add a new required pricing field
it("requires X when Y", () => {
  // construct minimal failing draft and assert error key
});
```

### Future Work

- Implement `diff.ts` delta computation.
- Developer analytics overlay (visual event stream) behind a flag.
- Redis-based rate limiter abstraction.

---

Questions? Open an issue or start a draft PR for early feedback.
