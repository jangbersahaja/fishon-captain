#!/bin/bash

# Safe Migration Script for fishon-market
# Usage: ./scripts/safe-migrate.sh <migration-name>
#
# This script:
# 1. Creates a backup before migration
# 2. Runs the migration
# 3. Verifies the migration succeeded
# 4. Provides rollback instructions if needed

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MIGRATION_NAME="$1"

if [ -z "$MIGRATION_NAME" ]; then
  echo -e "${RED}❌ Error: Migration name required${NC}"
  echo "Usage: ./scripts/safe-migrate.sh <migration-name>"
  echo ""
  echo "Example: ./scripts/safe-migrate.sh add_user_preferences"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🛡️  Safe Migration Workflow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Migration: $MIGRATION_NAME"
echo "Database: fishon-captain"
echo ""

# Step 1: Create backup
echo -e "${YELLOW}📦 Step 1/4: Creating backup...${NC}"
if ! ./scripts/backup-db.sh "pre-${MIGRATION_NAME}"; then
  echo -e "${RED}❌ Backup failed - aborting migration${NC}"
  exit 1
fi
echo ""

# Step 2: Create migration
echo -e "${YELLOW}🔨 Step 2/4: Creating migration...${NC}"
if npx prisma migrate dev --name "$MIGRATION_NAME" --create-only; then
  echo -e "${GREEN}✅ Migration file created${NC}"
else
  echo -e "${RED}❌ Migration creation failed${NC}"
  exit 1
fi
echo ""

# Step 3: Review migration
MIGRATION_DIR=$(ls -td prisma/migrations/* | head -1)
MIGRATION_FILE="${MIGRATION_DIR}/migration.sql"

echo -e "${YELLOW}📝 Step 3/4: Review migration SQL:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat "$MIGRATION_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
read -p "Does this migration look correct? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}⚠️  Migration cancelled${NC}"
  echo "The migration file has been created but not applied."
  echo "You can:"
  echo "  1. Edit the migration file: $MIGRATION_FILE"
  echo "  2. Delete the migration: rm -rf $MIGRATION_DIR"
  echo "  3. Re-run this script when ready"
  exit 0
fi

# Step 4: Apply migration
echo -e "${YELLOW}🚀 Step 4/4: Applying migration...${NC}"
if npx prisma migrate deploy; then
  echo -e "${GREEN}✅ Migration applied successfully!${NC}"
  echo ""
  
  # Verify migration
  echo -e "${YELLOW}Verifying migration...${NC}"
  if npx prisma migrate status | grep -q "No pending migrations"; then
    echo -e "${GREEN}✅ Migration verified - database is in sync${NC}"
  else
    echo -e "${YELLOW}⚠️  Warning: Database may have pending migrations${NC}"
  fi
  
  # Regenerate Prisma client
  echo ""
  echo -e "${YELLOW}Regenerating Prisma client...${NC}"
  if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma client regenerated${NC}"
  fi
  
else
  echo -e "${RED}❌ Migration failed!${NC}"
  echo ""
  echo -e "${YELLOW}🔄 Rollback Instructions:${NC}"
  echo "1. Find your backup in ./backups/"
  echo "2. Run: ./scripts/restore-db.sh ./backups/<backup-file>"
  echo ""
  ls -lh ./backups/ | grep "pre-${MIGRATION_NAME}" | tail -1
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm test"
echo "  2. Run typecheck: npm run typecheck"
echo "  3. Commit migration: git add prisma/migrations && git commit -m 'migration: $MIGRATION_NAME'"
