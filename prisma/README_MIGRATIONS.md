# Prisma Migration Notes (Drift Exception)

## Context

A historical migration (`20251008082014_add_captain_video_duration_metadata`) was edited after being applied. Editing an applied migration changes its checksum, causing Prisma to report drift (P3006) when running `prisma migrate dev`. We intentionally converted that migration into a no‑op comment to avoid an invalid ALTER statement.

We cannot reset the DB (as per project directive), so we use a workaround to mark the no‑op migration as applied on fresh environments.

## What To Do On a Fresh Dev Setup

1. Pull latest code.
2. Run the helper script:

   ```bash
   npm run migrate:drift-heal
   ```

   This performs a `prisma migrate resolve` to mark the no‑op migration as applied, then applies remaining migrations.

3. Continue normal development.

## Why Not Delete The Migration?

Prisma stores applied migrations in the `_prisma_migrations` table. Deleting an already applied migration would desync history. Leaving it as an empty (no‑op) file preserves ordering without breakage, provided we manually mark it applied on new environments.

## Production / CI

- CI or production environments that ran the original (pre-edit) migration are already consistent and require no action.
- New ephemeral environments must run the drift heal script once.

## Commands (Manual)

If you prefer manual steps instead of the script:

```bash
npx prisma migrate resolve --applied 20251008082014_add_captain_video_duration_metadata
npx prisma migrate dev
```

## Future Guidance

- Avoid editing applied migration files. Create a new migration instead.
- If a fix is needed, add a follow-up migration rather than altering history.
- Reserve resets only for early-stage development when data loss is acceptable.

## Verification

After running the heal script, `npx prisma migrate dev` should show no drift and no pending migrations.

---

Last updated: 2025-10-08
