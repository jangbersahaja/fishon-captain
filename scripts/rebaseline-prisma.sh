#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/rebaseline-prisma.sh
# This script will archive old migrations and create a new baseline migration from the current schema.
# Run ONLY on a Neon branch or disposable dev DB!

ARCHIVE_DIR="prisma/migrations-archive-$(date +%Y%m%d-%H%M%S)"
BASELINE_NAME="baseline_$(date +%Y%m%d-%H%M%S)"

# Step 1: Archive old migrations
mkdir -p "$ARCHIVE_DIR"
echo "[rebaseline] Archiving old migrations to $ARCHIVE_DIR..."
find prisma/migrations -maxdepth 1 -type d -not -name "migrations" -not -name "." -not -name ".." | while read -r dir; do
  mv "$dir" "$ARCHIVE_DIR/"
done

# Step 2: Generate baseline migration from current schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/${BASELINE_NAME}/migration.sql
mkdir -p prisma/migrations/${BASELINE_NAME}
# Move generated migration.sql into the new baseline folder if not already
if [ -f "prisma/migrations/migration.sql" ]; then
  mv prisma/migrations/migration.sql prisma/migrations/${BASELINE_NAME}/migration.sql
fi

# Step 3: Reset DB and apply baseline
read -p "[rebaseline] About to run prisma migrate reset (ALL DATA WILL BE LOST on this DB). Continue? (y/N): " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  npx prisma migrate reset
else
  echo "[rebaseline] Aborted. You can manually run prisma migrate reset when ready."
fi

# Step 4: Regenerate Prisma client
npx prisma generate

echo "[rebaseline] Complete. Old migrations archived, baseline applied, client regenerated."
echo "[rebaseline] Review baseline migration in prisma/migrations/${BASELINE_NAME}/migration.sql."
echo "[rebaseline] If you need to restore data, use your backup SQL or seed script."
