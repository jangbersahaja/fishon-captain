#!/usr/bin/env bash
set -euo pipefail

echo "[drift-heal] Marking edited no-op migration as applied..."
npx prisma migrate resolve --applied 20251008082014_add_captain_video_duration_metadata || {
  echo "[drift-heal] Warning: resolve step failed (may already be applied). Continuing..." >&2
}

echo "[drift-heal] Applying remaining migrations..."
npx prisma migrate dev

echo "[drift-heal] Done. If you still see drift, verify the migration file checksum was not changed again."